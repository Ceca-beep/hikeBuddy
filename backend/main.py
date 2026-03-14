from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, engine
import models
import trails as trail_service
import packing as packing_service

# creates database tables on startup
try:
    models.Base.metadata.create_all(bind=engine)
except Exception as e:
    raise RuntimeError(
        "Failed to initialize database. Make sure DATABASE_URL is set and the database is reachable. "
        f"Original error: {e}"
    )

app = FastAPI(title="Hike Buddy API")


# --- Trail Endpoints ---


@app.get("/trails")
async def get_trails(query: str = None, lat: float = None, lon: float = None):
    return await trail_service.get_all_trails(query, lat, lon)


@app.get("/trails/{trail_id}")
async def get_trail_detail(trail_id: str):
    return await trail_service.get_trail_detail_from_api(trail_id)


@app.post("/trails/submit")
def submit_trail(trail_data: dict, db: Session = Depends(get_db)):
    return trail_service.submit_trail(db, trail_data)


@app.patch("/trails/{trail_id}/approve")
def approve_trail(trail_id: int, db: Session = Depends(get_db)):
    trail = trail_service.approve_trail(db, trail_id)
    if not trail:
        raise HTTPException(status_code=404, detail="Trail not found")
    return trail


# --- Packing List Endpoint ---

@app.get("/packing-list")
def get_packing_list(duration: float, weather: str, terrain: str):
    gear = packing_service.generate_packing_list(duration, weather, terrain)
    return {"gear": gear}


# --- Health Check ---

@app.get("/")
def root():
    return {"status": "Hike Buddy API is running"}
