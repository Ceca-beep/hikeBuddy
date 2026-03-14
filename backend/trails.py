import httpx
import os
from dotenv import load_dotenv
from fastapi.concurrency import run_in_threadpool
from supabase import create_client

load_dotenv()

WAYMARKED_BASE = "https://hiking.waymarkedtrails.org/api/v1"
print("WAYMARKED_BASE:", WAYMARKED_BASE)

supabase_client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# --- Supabase Database ---
def get_trails_from_db():
    response = supabase_client.table("trails").select("*").execute()
    return response.data

from fastapi import FastAPI, HTTPException
import trails as trail_service
import packing as packing_service

app = FastAPI(title="Hike Buddy API")

# --- Trail Endpoints ---

@app.get("/trails")
async def get_trails(query: str = None, lat: float = None, lon: float = None):
    return await trail_service.get_all_trails(query, lat, lon)

@app.get("/trails/{trail_id}")
async def get_trail_detail(trail_id: str):
    return await trail_service.get_trail_detail_from_api(trail_id)

@app.post("/trails/submit")
async def submit_trail(trail_data: dict):
    return await trail_service.submit_trail(trail_data)

# --- Packing List Endpoint ---

@app.get("/packing-list")
def get_packing_list(duration: float, weather: str, terrain: str):
    gear = packing_service.generate_packing_list(duration, weather, terrain)
    return {"gear": gear}

# --- Health Check ---

@app.get("/")
def root():
    return {"status": "Hike Buddy API is running"}

# --- Waymarked Trails API ---
async def get_trails_from_api(query: str = None, lat: float = None, lon: float = None):
    params = {"limit": 20}
    if query:
        params["query"] = query
    if lat and lon:
        params["lat"] = lat
        params["lon"] = lon

    async with httpx.AsyncClient() as client:
        response = await client.get(f"{WAYMARKED_BASE}/list", params=params)
        response.raise_for_status()
        data = response.json()

    trails = []
    for item in data.get("results", []):
        trails.append({
            "id": item.get("id"),
            "name": item.get("name"),
            "source": "waymarked",
            "lat": item.get("lat"),
            "lon": item.get("lon"),
        })
    return trails

async def get_trail_detail_from_api(trail_id: str):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{WAYMARKED_BASE}/details/{trail_id}")
            response.raise_for_status()
            return response.json()
    except:
        return {"error": "API unavailable", "id": trail_id}

# --- Merge Both Sources ---
async def get_all_trails(query: str = None, lat: float = None, lon: float = None):
    try:
        api_trails = await get_trails_from_api(query, lat, lon)
    except:
        api_trails = []

    db_trails = await run_in_threadpool(get_trails_from_db)

    return api_trails + db_trails