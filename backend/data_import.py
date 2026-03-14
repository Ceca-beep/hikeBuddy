import os
import httpx
import asyncio
import math
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

ROMANIA_BBOX = "20.26,43.61,29.83,48.26"

def calculate_hike_duration(distance_km, ascent_m):
    """
    Naismith's Rule: 12 mins per km + 10 mins per 100m ascent.
    Returns duration in minutes.
    """
    if not distance_km:
        return 0
    
    # Base time for distance
    time_distance = distance_km * 12 
    
    # Extra time for climbing
    time_climb = (ascent_m / 100) * 10 if ascent_m else 0
    
    return round(time_distance + time_climb, 2)

async def import_romanian_trails():
    search_url = f"https://hiking.waymarkedtrails.org/api/v1/search/routes?bbox={ROMANIA_BBOX}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(search_url)
        trails_list = response.json() 

    if isinstance(trails_list, dict):
        trails_list = trails_list.get('results', [])

    print(f"Found {len(trails_list)} trails. Calculating durations and importing...")

    async with httpx.AsyncClient() as client:
        for trail in trails_list:
            if not isinstance(trail, dict):
                continue

            osm_id = trail.get("id")
            detail_url = f"https://hiking.waymarkedtrails.org/api/v1/details/relation/{osm_id}"
            
            try:
                detail_resp = await client.get(detail_url)
                data = detail_resp.json()

                # Get the raw values
                dist = data.get("length", 0) / 1000
                asc = data.get("ascent", 0)
                
                # RUN THE ALGORITHM
                calculated_duration = calculate_hike_duration(dist, asc)

                trail_entry = {
                    "osm_id": osm_id,
                    "name": data.get("name", "Unknown Trail"),
                    "distance_km": dist,
                    "ascent": asc,
                    "descend": data.get("descent", 0),
                    "difficulty": data.get("network", "local"),
                    "route_path": data.get("geometry"),
                    "user_made": False,
                    "duration": calculated_duration # Putting the calculated value here
                }

                supabase.table("trails").upsert(trail_entry).execute()
                print(f"✅ {trail_entry['name']} | Duration: {calculated_duration} mins")
                
                await asyncio.sleep(0.3)

            except Exception as e:
                print(f"❌ Error with trail {osm_id}: {e}")

if __name__ == "__main__":
    asyncio.run(import_romanian_trails())