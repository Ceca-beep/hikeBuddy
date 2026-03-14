"""
import_waymarked_trails.py
──────────────────────────
Confirmed API structure (from live response):
  data["route"]["length"]      → total distance in metres
  data["name"]                 → trail name
  data["tags"]["network"]      → difficulty level ("lwn","rwn","nwn","iwn")
  data["route"]["main"]        → list of segments containing geometry
  ascent / descent / ele_max   → NOT provided by WMT (use backfill_elevation.py)
  coordinates                  → EPSG:3857 (Web Mercator), must convert to WGS84

Install:
    pip install httpx supabase python-dotenv tqdm

.env:
    SUPABASE_URL=https://xxxx.supabase.co
    SUPABASE_KEY=sb_secret_...
"""

import os
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

OVERPASS_URL   = "https://overpass-api.de/api/interpreter"
WAYMARKED_BASE = "https://hiking.waymarkedtrails.org/api/v1"

# Romania bounding box for Overpass: south, west, north, east
ROMANIA_BBOX = "43.6186,20.2619,48.2654,29.7570"

WAYMARKED_RATE = 0.5   # seconds between detail requests
MAX_RETRIES    = 3
BATCH_SIZE     = 25

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) HikeBuddy/1.0",
    "Accept":     "application/json",
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ─── Coordinate conversion: EPSG:3857 → WGS84 ────────────────────────────────

def merc_to_wgs84(x: float, y: float) -> tuple[float, float]:
    """Convert Web Mercator (EPSG:3857) metres to (longitude, latitude)."""
    R = 6378137.0
    lon = (x / R) * (180.0 / math.pi)
    lat = (2 * math.atan(math.exp(y / R)) - math.pi / 2) * (180.0 / math.pi)
    return lon, lat


def convert_geometry(geom: dict) -> dict:
    """
    Convert all coordinates in a GeoJSON geometry from EPSG:3857 to WGS84.
    Handles LineString and MultiLineString.
    """
    if not geom:
        return geom
    gtype = geom.get("type")
    if gtype == "LineString":
        return {
            "type": "LineString",
            "coordinates": [list(merc_to_wgs84(c[0], c[1])) for c in geom["coordinates"]],
        }
    elif gtype == "MultiLineString":
        return {
            "type": "MultiLineString",
            "coordinates": [
                [list(merc_to_wgs84(c[0], c[1])) for c in line]
                for line in geom["coordinates"]
            ],
        }
    return geom

# ─── Duration (Naismith's Rule) ───────────────────────────────────────────────

def calculate_duration(dist_km: Optional[float], ascent_m: Optional[float]) -> Optional[float]:
    """12 min/km + 10 min/100m ascent → minutes"""
    if not dist_km:
        return None
    return round(dist_km * 12 + (ascent_m or 0) / 100 * 10, 0)

# ─── Build merged GeoJSON from all segments ───────────────────────────────────

def extract_route_path(data: dict) -> Optional[dict]:
    """
    Walk data["route"]["main"] → each linear block → each way → geometry,
    collect all LineString coordinates, convert to WGS84, return as a single
    GeoJSON MultiLineString (or LineString if only one segment).
    """
    try:
        main = data["route"]["main"]
    except (KeyError, TypeError):
        return None

    all_lines = []
    for linear in main:
        for way in linear.get("ways", []):
            geom = way.get("geometry")
            if not geom:
                continue
            converted = convert_geometry(geom)
            if converted["type"] == "LineString":
                all_lines.append(converted["coordinates"])

    if not all_lines:
        return None
    if len(all_lines) == 1:
        return {"type": "LineString", "coordinates": all_lines[0]}
    return {"type": "MultiLineString", "coordinates": all_lines}

# ─── Map API response → DB row ────────────────────────────────────────────────

def map_trail(osm_id: int, data: dict) -> dict:
    """
    Confirmed field locations from live API response:
      data["name"]                   → name
      data["route"]["length"]        → total metres
      data["tags"]["network"]        → "lwn" / "rwn" / "nwn" / "iwn"
      data["route"]["main"][*]["ways"][*]["geometry"] → EPSG:3857 LineStrings
    """
    route    = data.get("route") or {}
    tags     = data.get("tags")  or {}

    length_m = route.get("length")
    dist_km  = round(length_m / 1000, 3) if length_m else None

    network_map = {
        "lwn": "local",
        "rwn": "regional",
        "nwn": "national",
        "iwn": "international",
    }
    raw_network = tags.get("network", "")
    difficulty  = network_map.get(raw_network, raw_network or None)

    route_path = extract_route_path(data)

    return {
        "osm_id":        osm_id,
        "name":          data.get("name") or f"Traseu {osm_id}",
        "distance_km":   dist_km,
        "ascent":        None,   # filled by backfill_elevation.py
        "descend":       None,
        "difficulty":    difficulty,
        "route_path":    route_path,
        "user_made":     False,
        "duration":      calculate_duration(dist_km, None),
        "max_elevation": None,
    }

# ─── API helpers ──────────────────────────────────────────────────────────────

async def get(client: httpx.AsyncClient, url: str) -> Optional[dict]:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r = await client.get(url)
            if r.status_code == 200:
                return r.json()
            elif r.status_code == 404:
                return None
            elif r.status_code == 429:
                await asyncio.sleep(15 * attempt)
            else:
                log.warning("HTTP %s for %s (attempt %d)", r.status_code, url, attempt)
                await asyncio.sleep(3 * attempt)
        except httpx.RequestError as e:
            log.warning("Request error: %s (attempt %d)", e, attempt)
            await asyncio.sleep(3 * attempt)
    return None


async def fetch_detail(client: httpx.AsyncClient, osm_id: int) -> Optional[dict]:
    data = await get(client, f"{WAYMARKED_BASE}/details/relation/{osm_id}")
    await asyncio.sleep(WAYMARKED_RATE)
    return data


async def fetch_romania_hiking_ids(client: httpx.AsyncClient) -> list[int]:
    query = f"""
[out:json][timeout:120];
relation["route"="hiking"]({ROMANIA_BBOX});
out ids;
"""
    log.info("Querying Overpass for Romania hiking route IDs …")
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r = await client.post(OVERPASS_URL, data={"data": query}, timeout=180.0)
            if r.status_code == 200:
                ids = [el["id"] for el in r.json().get("elements", [])]
                log.info("Overpass returned %d relation IDs.", len(ids))
                return ids
            await asyncio.sleep(10 * attempt)
        except httpx.RequestError as e:
            log.warning("Overpass error: %s (attempt %d)", e, attempt)
            await asyncio.sleep(10 * attempt)
    return []

# ─── Supabase ─────────────────────────────────────────────────────────────────

def upsert_batch(supabase: Client, rows: list[dict]) -> int:
    if not rows:
        return 0
    supabase.table("trails").upsert(rows, on_conflict="osm_id").execute()
    return len(rows)

# ─── Main ─────────────────────────────────────────────────────────────────────

async def run_import():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    log.info("Connected to Supabase.")

    async with httpx.AsyncClient(headers=HEADERS, timeout=30.0) as client:

        osm_ids = await fetch_romania_hiking_ids(client)
        if not osm_ids:
            log.error("No IDs from Overpass — aborting.")
            return

        batch       = []
        saved       = 0
        not_indexed = 0
        errors      = 0

        for osm_id in tqdm(osm_ids, desc="Importing trails", unit="trail"):
            detail = await fetch_detail(client, osm_id)
            if detail is None:
                not_indexed += 1
                continue

            try:
                row = map_trail(osm_id, detail)
                batch.append(row)
            except Exception as e:
                log.warning("Mapping error osm_id=%s: %s", osm_id, e)
                errors += 1
                continue

            if len(batch) >= BATCH_SIZE:
                saved += upsert_batch(supabase, batch)
                batch = []

        if batch:
            saved += upsert_batch(supabase, batch)

    log.info("Done. saved=%d  not_in_wmt=%d  errors=%d", saved, not_indexed, errors)


if __name__ == "__main__":
    asyncio.run(run_import())