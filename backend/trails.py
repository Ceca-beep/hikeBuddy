import httpx
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from models import Trail

load_dotenv()

WAYMARKED_BASE = os.getenv("WAYMARKED_BASE_URL")


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

    # normalize to a consistent shape
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
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{WAYMARKED_BASE}/details/{trail_id}")
        response.raise_for_status()
        return response.json()


# --- Your Own Database Trails ---

def get_trails_from_db(db: Session):
    return db.query(Trail).filter(Trail.status == "approved").all()


def submit_trail(db: Session, trail_data: dict):
    new_trail = Trail(**trail_data)
    db.add(new_trail)
    db.commit()
    db.refresh(new_trail)
    return new_trail


def approve_trail(db: Session, trail_id: int):
    trail = db.query(Trail).filter(Trail.id == trail_id).first()
    if trail:
        trail.status = "approved"
        db.commit()
        db.refresh(trail)
    return trail


# --- Merge Both Sources ---

async def get_all_trails(db: Session, query: str = None, lat: float = None, lon: float = None):
    api_trails = await get_trails_from_api(query, lat, lon)

    db_trails = get_trails_from_db(db)
    db_trails_formatted = [
        {
            "id": t.id,
            "name": t.name,
            "region": t.region,
            "difficulty": t.difficulty,
            "lat": t.lat,
            "lon": t.lon,
            "source": t.source,
        }
        for t in db_trails
    ]

    return api_trails + db_trails_formatted
