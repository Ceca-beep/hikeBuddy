"""
backfill_elevation.py
─────────────────────
Reads trails from Supabase where ascent/descend/max_elevation are NULL,
fetches real elevations from OpenTopoData, computes stats, and also
calculates difficulty using the Shenandoah National Park formula:

    score = √(ascent_m × 2 × distance_km)

    < 50   → easy
    50-100 → moderate
    100-150→ hard
    > 150  → expert

Also recalculates duration using Naismith's Rule:
    duration (minutes) = distance_km * 12 + (ascent_m / 100 * 10)

OpenTopoData public API limits:
  - 100 locations per request
  - 1 request / second
  - 1,000 requests / day

Install:
    pip install httpx supabase python-dotenv tqdm

.env:
    SUPABASE_URL=https://xxxx.supabase.co
    SUPABASE_KEY=sb_secret_...
"""

import os
import json
import math
import asyncio
import logging
from typing import Optional

import httpx
from supabase import create_client, Client
from dotenv import load_dotenv
from tqdm.asyncio import tqdm

# ─── Configuration ────────────────────────────────────────────────────────────

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

OTD_BASE      = "https://api.opentopodata.org/v1"
OTD_DATASET   = "srtm30m"
OTD_BATCH     = 100
OTD_RATE      = 1.1
OTD_MAX_DAILY = 1000

SAMPLE_POINTS = 50

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

_requests_made = 0

# ─── Difficulty calculation ───────────────────────────────────────────────────

def calculate_difficulty(distance_km: Optional[float], ascent_m: Optional[float]) -> Optional[str]:
    """
    Shenandoah National Park formula:
        score = √(ascent_m × 2 × distance_km)

    Thresholds:
        < 50   → easy
        50-100 → moderate
        100-150→ hard
        > 150  → expert
    """
    if not distance_km or not ascent_m:
        return None
    score = math.sqrt(ascent_m * 2 * distance_km)
    if score < 50:
        return "easy"
    elif score < 100:
        return "moderate"
    elif score < 150:
        return "hard"
    else:
        return "expert"

# ─── Duration calculation ─────────────────────────────────────────────────────

def calculate_duration(distance_km: Optional[float], ascent_m: Optional[float]) -> Optional[float]:
    """
    Naismith's Rule:
        duration (minutes) = distance_km * 12 + (ascent_m / 100 * 10)
    """
    if not distance_km:
        return None
    return round(distance_km * 12 + (ascent_m or 0) / 100 * 10, 0)

# ─── Geometry helpers ─────────────────────────────────────────────────────────

def extract_coordinates(geojson: dict) -> list[tuple[float, float]]:
    """Extract flat ordered (lat, lon) list from any GeoJSON shape."""
    coords: list[tuple[float, float]] = []

    def _from_geom(geom):
        if not geom:
            return
        t = geom.get("type", "")
        if t == "LineString":
            for c in geom["coordinates"]:
                coords.append((c[1], c[0]))
        elif t == "MultiLineString":
            for line in geom["coordinates"]:
                for c in line:
                    coords.append((c[1], c[0]))
        elif t == "GeometryCollection":
            for g in geom.get("geometries", []):
                _from_geom(g)

    t = geojson.get("type", "")
    if t == "Feature":
        _from_geom(geojson.get("geometry"))
    elif t == "FeatureCollection":
        for feat in geojson.get("features", []):
            _from_geom(feat.get("geometry"))
    else:
        _from_geom(geojson)

    return coords


def sample_coords(coords, n):
    if len(coords) <= n:
        return coords
    indices = sorted({round(i * (len(coords) - 1) / (n - 1)) for i in range(n)})
    return [coords[i] for i in indices]


def compute_stats(elevations: list[Optional[float]]) -> dict:
    valid = [e for e in elevations if e is not None]
    if not valid:
        return {"ascent": None, "descend": None, "max_elevation": None}
    ascent = descend = 0.0
    for a, b in zip(valid, valid[1:]):
        d = b - a
        if d > 0:
            ascent += d
        else:
            descend += abs(d)
    return {
        "ascent":        round(ascent, 1),
        "descend":       round(descend, 1),
        "max_elevation": round(max(valid), 1),
    }

# ─── OpenTopoData ─────────────────────────────────────────────────────────────

async def fetch_elevations(client: httpx.AsyncClient, coords) -> list[Optional[float]]:
    global _requests_made
    result = []

    for i in range(0, len(coords), OTD_BATCH):
        if _requests_made >= OTD_MAX_DAILY:
            log.warning("Daily OTD cap reached. Re-run tomorrow.")
            result.extend([None] * (len(coords) - len(result)))
            return result

        batch = coords[i: i + OTD_BATCH]
        locs  = "|".join(f"{lat},{lon}" for lat, lon in batch)

        for attempt in range(1, 4):
            try:
                r = await client.post(
                    f"{OTD_BASE}/{OTD_DATASET}",
                    data={"locations": locs, "interpolation": "cubic"},
                    timeout=30.0,
                )
                if r.status_code == 200 and r.json().get("status") == "OK":
                    result.extend(res.get("elevation") for res in r.json()["results"])
                    _requests_made += 1
                    break
                elif r.status_code == 429:
                    await asyncio.sleep(15 * attempt)
                else:
                    await asyncio.sleep(3 * attempt)
            except httpx.RequestError as e:
                log.warning("OTD error: %s (attempt %d)", e, attempt)
                await asyncio.sleep(3 * attempt)
        else:
            result.extend([None] * len(batch))

        await asyncio.sleep(OTD_RATE)

    return result

# ─── Supabase helpers ─────────────────────────────────────────────────────────

def fetch_trails_needing_elevation(supabase: Client) -> list[dict]:
    all_rows = []
    step, start = 1000, 0
    while True:
        resp = (
            supabase.table("trails")
            .select("id, osm_id, name, distance_km, route_path")
            .not_.is_("route_path", "null")
            .is_("ascent", "null")
            .is_("descend", "null")
            .is_("max_elevation", "null")
            .range(start, start + step - 1)
            .execute()
        )
        rows = resp.data or []
        all_rows.extend(rows)
        if len(rows) < step:
            break
        start += step
    return all_rows


def update_trail(supabase: Client, trail_id: str, stats: dict):
    supabase.table("trails").update(stats).eq("id", trail_id).execute()

# ─── Main ─────────────────────────────────────────────────────────────────────

async def run_backfill():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    log.info("Fetching trails with missing elevation …")

    trails = fetch_trails_needing_elevation(supabase)
    log.info("%d trails need elevation backfill.", len(trails))
    if not trails:
        log.info("Nothing to do.")
        return

    filled = skipped = errors = 0

    async with httpx.AsyncClient(
        headers={"User-Agent": "HikeBuddy-elevation-backfill/1.0"},
        timeout=30.0,
    ) as client:

        for trail in tqdm(trails, desc="Elevation backfill", unit="trail"):
            trail_id    = trail["id"]
            name        = trail.get("name") or f"id:{trail_id}"
            distance_km = trail.get("distance_km")

            geojson = trail.get("route_path")
            if isinstance(geojson, str):
                try:
                    geojson = json.loads(geojson)
                except json.JSONDecodeError:
                    skipped += 1
                    continue

            if not geojson:
                skipped += 1
                continue

            coords = extract_coordinates(geojson)
            if not coords:
                skipped += 1
                continue

            sampled    = sample_coords(coords, SAMPLE_POINTS)
            elevations = await fetch_elevations(client, sampled)

            if all(e is None for e in elevations):
                errors += 1
                continue

            stats = compute_stats(elevations)

            # Calculate difficulty with real ascent data
            difficulty = calculate_difficulty(distance_km, stats.get("ascent"))
            if difficulty:
                stats["difficulty"] = difficulty

            # Recalculate duration with real ascent data
            duration = calculate_duration(distance_km, stats.get("ascent"))
            if duration:
                stats["duration"] = duration

            update_trail(supabase, trail_id, stats)
            filled += 1

            log.debug(
                "%-40s  ↑%.0fm  ↓%.0fm  max=%.0fm  difficulty=%s  duration=%.0fmin",
                name[:40],
                stats["ascent"]        or 0,
                stats["descend"]       or 0,
                stats["max_elevation"] or 0,
                stats.get("difficulty", "n/a"),
                stats.get("duration")  or 0,
            )

            if _requests_made >= OTD_MAX_DAILY:
                log.warning("Daily cap hit after %d trails. Re-run tomorrow.", filled)
                break

    log.info(
        "Done. filled=%d  skipped=%d  errors=%d  api_calls=%d/%d",
        filled, skipped, errors, _requests_made, OTD_MAX_DAILY,
    )


if __name__ == "__main__":
    asyncio.run(run_backfill())