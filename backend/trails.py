import math
from typing import Optional
from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool
from database import get_supabase

DB_TO_FRONTEND = {"easy": "Beginner", "moderate": "Intermediate", "hard": "Advanced", "expert": "Expert"}
FRONTEND_TO_DB = {v: k for k, v in DB_TO_FRONTEND.items()}
DURATION_BUCKETS = {
    "Under 2h": (0,   120),
    "2-4h":     (120, 240),
    "4-6h":     (240, 360),
    "Over 6h":  (360, 99999),
}

def format_duration(minutes: Optional[float]) -> str:
    if not minutes: return "--"
    h = int(minutes // 60)
    m = int(minutes % 60)
    if h > 0 and m > 0: return f"{h}h {m}min"
    elif h > 0: return f"{h}h"
    return f"{m}min"

def map_difficulty(db_value: Optional[str]) -> str:
    if not db_value: return "Unknown"
    return DB_TO_FRONTEND.get(db_value.lower(), db_value.capitalize())

def format_trail(trail: dict, danger_count: int = 0) -> dict:
    return {
        "id":            trail.get("id"),
        "osm_id":        trail.get("osm_id"),
        "name":          trail.get("name", ""),
        "difficulty":    map_difficulty(trail.get("difficulty")),
        "distance_km":   trail.get("distance_km"),
        "duration":      trail.get("duration"),
        "duration_str":  format_duration(trail.get("duration")),
        "ascent":        trail.get("ascent"),
        "descend":       trail.get("descend"),
        "max_elevation": trail.get("max_elevation"),
        "user_made":     trail.get("user_made", False),
        "dangers":       danger_count,
    }

def haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371.0
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    dφ = math.radians(lat2 - lat1)
    dλ = math.radians(lon2 - lon1)
    a = math.sin(dφ/2)**2 + math.cos(φ1)*math.cos(φ2)*math.sin(dλ/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def bbox_from_point(lat, lon, radius_km):
    delta_lat = radius_km / 111.0
    delta_lon = radius_km / (111.0 * math.cos(math.radians(lat)))
    return lat - delta_lat, lon - delta_lon, lat + delta_lat, lon + delta_lon

def trail_center(trail: dict) -> Optional[tuple]:
    rp = trail.get("route_path")
    if not rp: return None
    try:
        coords = []
        if rp.get("type") == "LineString":
            coords = rp["coordinates"]
        elif rp.get("type") == "MultiLineString":
            for line in rp["coordinates"]:
                coords.extend(line)
        if not coords: return None
        mid = coords[len(coords) // 2]
        return mid[1], mid[0]
    except Exception:
        return None

def _get_danger_counts() -> dict:
    from datetime import datetime, timezone, timedelta
    supabase = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    try:
        resp = supabase.table("pings").select("trail_id").gte("date", cutoff).execute()
        counts = {}
        for row in resp.data or []:
            tid = row.get("trail_id")
            if tid:
                counts[tid] = counts.get(tid, 0) + 1
        return counts
    except Exception:
        return {}

def _get_photos_for_trail(trail_id: str) -> list:
    try:
        resp = (
            get_supabase().table("trail_photos")
            .select("photo_url")
            .eq("trail_id", trail_id)
            .order("uploaded_at", desc=True)
            .execute()
        )
        return [r["photo_url"] for r in (resp.data or [])]
    except Exception:
        return []

def _get_pings_for_trail(trail_id: str) -> list:
    from datetime import datetime, timezone, timedelta
    supabase = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    try:
        resp = (
            supabase.table("pings")
            .select("*")
            .eq("trail_id", trail_id)
            .gte("date", cutoff)
            .order("date", desc=True)
            .execute()
        )
        return resp.data or []
    except Exception:
        return []

async def get_all_trails(
    query: str = None, lat: float = None, lon: float = None,
    difficulty: str = None, min_dist: float = None, max_dist: float = None,
    duration: str = None, limit: int = 20, offset: int = 0,
):
    def _query():
        supabase = get_supabase()
        diff_db = FRONTEND_TO_DB.get(difficulty, difficulty.lower()) if difficulty else None
        min_dur = max_dur = None
        if duration and duration in DURATION_BUCKETS:
            min_dur, max_dur = DURATION_BUCKETS[duration]
        q = (
            supabase.table("trails")
            .select("id, osm_id, name, distance_km, difficulty, ascent, descend, duration, max_elevation, user_made, route_path")
            .range(offset, offset + limit - 1)
        )
        if query:    q = q.ilike("name", f"%{query}%")
        if diff_db:  q = q.eq("difficulty", diff_db)
        if min_dist: q = q.gte("distance_km", min_dist)
        if max_dist: q = q.lte("distance_km", max_dist)
        if min_dur:  q = q.gte("duration", min_dur)
        if max_dur:  q = q.lte("duration", max_dur)
        return q.execute()

    response      = await run_in_threadpool(_query)
    raw_trails    = response.data or []
    danger_counts = await run_in_threadpool(_get_danger_counts)

    results = []
    for t in raw_trails:
        trail_out = format_trail(t, danger_counts.get(t["id"], 0))
        if lat and lon:
            center = trail_center(t)
            if center:
                trail_out["distance_from_you_km"] = round(haversine_km(lat, lon, center[0], center[1]), 2)
        results.append(trail_out)

    if lat and lon:
        results.sort(key=lambda x: x.get("distance_from_you_km", 9999))

    return {"trails": results, "count": len(results), "offset": offset}

async def get_nearby_trails(lat: float, lon: float, radius_km: float = 25, limit: int = 20):
    min_lat, min_lon, max_lat, max_lon = bbox_from_point(lat, lon, radius_km)

    def _query():
        return get_supabase().table("trails").select(
            "id, osm_id, name, distance_km, difficulty, ascent, descend, duration, max_elevation, user_made, route_path"
        ).execute()

    response      = await run_in_threadpool(_query)
    danger_counts = await run_in_threadpool(_get_danger_counts)

    results = []
    for trail in response.data or []:
        center = trail_center(trail)
        if not center: continue
        t_lat, t_lon = center
        if not (min_lat <= t_lat <= max_lat and min_lon <= t_lon <= max_lon): continue
        dist = haversine_km(lat, lon, t_lat, t_lon)
        if dist <= radius_km:
            trail_out = format_trail(trail, danger_counts.get(trail["id"], 0))
            trail_out["distance_from_you_km"] = round(dist, 2)
            trail_out["center_lat"] = t_lat
            trail_out["center_lon"] = t_lon
            results.append(trail_out)

    results.sort(key=lambda t: t["distance_from_you_km"])
    return {"trails": results[:limit], "count": len(results[:limit])}

async def get_trail_detail_from_api(trail_id: str):
    def _query():
        supabase = get_supabase()
        try:
            osm_id = int(trail_id)
            return supabase.table("trails").select("*").eq("osm_id", osm_id).single().execute()
        except ValueError:
            return supabase.table("trails").select("*").eq("id", trail_id).single().execute()

    response = await run_in_threadpool(_query)
    if not response.data:
        raise HTTPException(status_code=404, detail="Trail not found")

    trail = response.data
    trail_uuid = trail["id"]
    pings  = await run_in_threadpool(lambda: _get_pings_for_trail(trail_uuid))
    photos = await run_in_threadpool(lambda: _get_photos_for_trail(trail_uuid))

    return {
        "id":            trail_uuid,
        "osm_id":        trail.get("osm_id"),
        "name":          trail.get("name", ""),
        "difficulty":    map_difficulty(trail.get("difficulty")),
        "distance_km":   trail.get("distance_km"),
        "duration":      trail.get("duration"),
        "duration_str":  format_duration(trail.get("duration")),
        "ascent":        trail.get("ascent"),
        "descend":       trail.get("descend"),
        "max_elevation": trail.get("max_elevation"),
        "user_made":     trail.get("user_made", False),
        "route_path":    trail.get("route_path"),
        "dangers":       len(pings),
        "pings":         pings,
        "photos":        photos,
    }

async def submit_trail(trail_data: dict):
    required = {"name", "route_path"}
    missing = required - trail_data.keys()
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing: {', '.join(missing)}")
    if "difficulty" in trail_data:
        trail_data["difficulty"] = FRONTEND_TO_DB.get(trail_data["difficulty"], trail_data["difficulty"].lower())
    row = {
        "name":        trail_data["name"],
        "route_path":  trail_data["route_path"],
        "user_made":   True,
        "distance_km": trail_data.get("distance_km"),
        "difficulty":  trail_data.get("difficulty"),
        "ascent":      trail_data.get("ascent"),
        "descend":     trail_data.get("descend"),
        "duration":    trail_data.get("duration"),
    }
    def _insert():
        return get_supabase().table("trails").insert(row).execute()
    response = await run_in_threadpool(_insert)
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to submit trail")
    return {"message": "Trail submitted for review", "trail": response.data[0]}