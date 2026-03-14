from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import trails as trail_service
import packing as packing_service

app = FastAPI(title="Hike Buddy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "Hike Buddy API is running"}

@app.get("/trails")
async def get_trails(query: str = None, lat: float = None, lon: float = None):
    return await trail_service.get_all_trails(query, lat, lon)

@app.get("/trails/{trail_id}")
async def get_trail_detail(trail_id: str):
    return await trail_service.get_trail_detail_from_api(trail_id)

@app.post("/trails/submit")
async def submit_trail(trail_data: dict):
    return await trail_service.submit_trail(trail_data)

@app.get("/packing-list")
def get_packing_list(duration: float, weather: str, terrain: str):
    gear = packing_service.generate_packing_list(duration, weather, terrain)
    return {"gear": gear}