import httpx
import os
from dotenv import load_dotenv
from fastapi.concurrency import run_in_threadpool
from database import get_supabase

load_dotenv()

WAYMARKED_BASE = "https://hiking.waymarkedtrails.org/api/v1"

# --- Supabase ---
def _get_db_trails():
    supabase = get_supabase()
    return supabase.table("trails").select("*").execute().data

def _submit_db_trail(trail_data: dict):
    supabase = get_supabase()
    return supabase.table("trails").insert(trail_data).execute().data

# --- Waymarked API ---
async def get_trails_from_api(query: str = None, lat: float = None, lon: float = None):
    params = {"limit": 20}
    if query:
        params["query"] = query
    if lat and lon:
        params["lat"] = lat
        params["lon"] = lon
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{WAYMARKED_BASE}/list", params=params)
            response.raise_for_status()
            data = response.json()
        return [
            {
                "id": item.get("id"),
                "name": item.get("name"),
                "source": "waymarked",
                "lat": item.get("lat"),
                "lon": item.get("lon"),
            }
            for item in data.get("results", [])
        ]
    except:
        return []

async def get_trail_detail_from_api(trail_id: str):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{WAYMARKED_BASE}/details/{trail_id}")
            response.raise_for_status()
            return response.json()
    except:
        return {"error": "API unavailable", "id": trail_id}

# --- Merge ---
async def get_all_trails(query: str = None, lat: float = None, lon: float = None):
    api_trails = await get_trails_from_api(query, lat, lon)
    db_trails = await run_in_threadpool(_get_db_trails)
    return api_trails + db_trails

async def submit_trail(trail_data: dict):
    return await run_in_threadpool(lambda: _submit_db_trail(trail_data))