import os
import httpx
import asyncio
from dotenv import load_dotenv
from supabase import create_client

# 1. Setup
load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

# Real Relation IDs for Romania (Bucegi & Fagaras)
REAL_TRAILS = [2643537, 1332997, 3408660, 1099276, 2328701]

def calculate_duration(dist_km, asc_m):
    """Naismith’s Rule: 12m/km + 10m/100m climb"""
    if not dist_km: return 0
    return round((dist_km * 12) + ((asc_m or 0) / 100 * 10), 2)

async def import_with_mapping():
    print("🛰️ Connecting to Waymarked Trails...")
    
    # Using a Browser-like User-Agent to prevent 404s
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) HikeBuddy/1.0",
        "Accept": "application/json"
    }

    async with httpx.AsyncClient(headers=headers, timeout=30.0) as client:
        for osm_id in REAL_TRAILS:
            api_url = f"https://hiking.waymarkedtrails.org/api/v1/details/relation/{osm_id}"
            
            try:
                resp = await client.get(api_url)
                
                if resp.status_code != 200:
                    print(f"❌ API Error {resp.status_code} for ID {osm_id}")
                    continue

                # Raw data from Waymarked
                w_data = resp.json()
                
                # --- THE MAPPING LAYER ---
                # This ensures Waymarked's data fits YOUR specific table structure
                dist_km = w_data.get("length", 0) / 1000
                ascent = w_data.get("ascent", 0)
                
                trail_for_db = {
                    "osm_id": osm_id,
                    "name": w_data.get("name", f"Traseu {osm_id}"),
                    "distance_km": dist_km,
                    "ascent": ascent,
                    "descend": w_data.get("descent", 0), # Mapping descent -> descend
                    "difficulty": w_data.get("network", "regional"),
                    "route_path": w_data.get("geometry"), # Stores the JSON LineString
                    "user_made": False,
                    "duration": calculate_duration(dist_km, ascent),
                    "max_elevation": w_data.get("ele_max", 0)
                }

                # 2. Push to Supabase
                supabase.table("trails").upsert(trail_for_db).execute()
                print(f"✅ Imported: {trail_for_db['name']} ({dist_km:.2f} km)")
                
                # Delay to avoid IP block
                await asyncio.sleep(1.0)

            except Exception as e:
                print(f"🔥 Error processing {osm_id}: {e}")

if __name__ == "__main__":
    asyncio.run(import_with_mapping())