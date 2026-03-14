from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import trails as trail_service
import packing as packing_service
import hashlib
import uuid
import supabase
from pydantic import BaseModel, EmailStr
from supabase import create_client, Client

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

# ... existing FastAPI setup (app, supabase client) ...

class RegistrationJSON(BaseModel):
    # Data from Step 1
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    # Data from Step 2
    age: int
    weight: int
    height: int
    sex: str

def hash_password(password: str):
    return hashlib.sha256(password.encode()).hexdigest()

@app.post("/register")
async def register_from_json(data: RegistrationJSON):
    try:
        # 1. Map the incoming JSON fields to your 'users' table columns
        user_id = str(uuid.uuid4())
        
        db_payload = {
            "id": user_id,
            "name": f"{data.first_name} {data.last_name}", # Merge first + last
            "password": hash_password(data.password),      # Hash it!
            "mail": data.email,                            # Map email to mail
            "age": data.age,
            "weight": data.weight,
            "height": data.height,
            "sex": data.sex
        }

        # 2. Push to Supabase
        response = supabase.table("users").insert(db_payload).execute()

        return {
            "status": "success",
            "message": f"User {data.first_name} created successfully!",
            "user_id": user_id
        }

    except Exception as e:
        print(f"Database Error: {e}")
        raise HTTPException(status_code=400, detail="Registration failed. Check if email exists.")