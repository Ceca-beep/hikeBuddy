from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from database import get_supabase
from datetime import datetime
import trails as trail_service
import packing as packing_service
import suggestions as suggestions_service
import hashlib
import uuid

app = FastAPI(title="Hike Buddy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Hike Buddy API is running"}

# ── Auth ──────────────────────────────────────────────────────────────────────

class RegistrationJSON(BaseModel):
    first_name: str
    last_name:  str
    email:      EmailStr
    password:   str
    age:        int = 0
    weight:     int = 0
    height:     int = 0
    sex:        str = ""


class UserLogin(BaseModel):
    email:    str
    password: str


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


@app.post("/register")
async def register_from_json(data: RegistrationJSON):
    try:
        user_id = str(uuid.uuid4())
        get_supabase().table("users").insert({
            "id":       user_id,
            "name":     f"{data.first_name} {data.last_name}",
            "password": hash_password(data.password),
            "mail":     data.email,
            "age":      data.age,
            "weight":   data.weight,
            "height":   data.height,
            "sex":      data.sex,
        }).execute()
        return {
            "status":  "success",
            "message": f"User {data.first_name} created successfully!",
            "user_id": user_id,
        }
    except Exception as e:
        print(f"Database Error: {e}")
        raise HTTPException(status_code=400, detail="Registration failed. Check if email exists.")


@app.post("/login")
async def login_user(credentials: UserLogin):
    try:
        response = get_supabase().table("users") \
            .select("*") \
            .eq("mail", credentials.email) \
            .execute()

        if not response.data:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        user = response.data[0]

        if hash_password(credentials.password) != user["password"]:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        return {
            "status":  "success",
            "message": "Login successful",
            "user": {
                "id":    user["id"],
                "name":  user["name"],
                "email": user["mail"],
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Login Error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ── Pings ─────────────────────────────────────────────────────────────────────

class PingJSON(BaseModel):
    type:        str
    lat:         float
    lng:         float
    description: str = ""
    trail_id:    str = None


@app.post("/pings")
async def create_ping(data: PingJSON):
    try:
        ping_payload = {
            "type":        data.type,
            "lat":         data.lat,
            "lng":         data.lng,
            "description": data.description,
            "date":        datetime.utcnow().isoformat(),
        }
        if data.trail_id:
            ping_payload["trail_id"] = data.trail_id

        response = get_supabase().table("pings").insert(ping_payload).execute()
        return {"status": "success", "message": "Ping recorded", "data": response.data}

    except Exception as e:
        print(f"Ping Error: {e}")
        raise HTTPException(status_code=400, detail="Failed to record ping.")


@app.get("/pings")
async def get_pings(trail_id: str = None):
    try:
        q = get_supabase().table("pings").select("*").order("date", desc=True)
        if trail_id:
            q = q.eq("trail_id", trail_id)
        response = q.execute()
        return {"pings": response.data or []}
    except Exception as e:
        print(f"Get pings error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch pings.")

# ── Trails ────────────────────────────────────────────────────────────────────

@app.get("/trails/nearby")
async def get_nearby_trails(
    lat:       float,
    lon:       float,
    radius_km: float = 25,
    limit:     int   = 20,
):
    return await trail_service.get_nearby_trails(lat, lon, radius_km, limit)


@app.get("/trails")
async def get_trails(
    query:      str   = None,
    lat:        float = None,
    lon:        float = None,
    difficulty: str   = None,
    min_dist:   float = None,
    max_dist:   float = None,
    duration:   str   = None,
    limit:      int   = 20,
    offset:     int   = 0,
):
    return await trail_service.get_all_trails(
        query, lat, lon, difficulty, min_dist, max_dist, duration, limit, offset
    )


@app.get("/trails/{trail_id}")
async def get_trail_detail(trail_id: str):
    return await trail_service.get_trail_detail_from_api(trail_id)


@app.post("/trails/submit")
async def submit_trail(trail_data: dict):
    return await trail_service.submit_trail(trail_data)

# ── Suggestions ───────────────────────────────────────────────────────────────

@app.get("/suggestions/{trail_id}")
async def get_suggestions(
    trail_id:  str,
    date:      str,
    weight_kg: float = 70,
    age:       int   = 30,
    fitness:   str   = "Medium",
):
    try:
        hiker = {"fitness_level": fitness.lower(), "age": age, "weight_kg": weight_kg}
        return suggestions_service.get_suggestions_from_db(trail_id, date, hiker)
    except Exception as e:
        print(f"Suggestions error: {e}")
        raise HTTPException(status_code=500, detail=f"Could not generate suggestions: {str(e)}")

# ── Packing list (legacy) ─────────────────────────────────────────────────────

@app.get("/packing-list")
def get_packing_list(duration: float, weather: str, terrain: str):
    gear = packing_service.generate_packing_list(duration, weather, terrain)
    return {"gear": gear}