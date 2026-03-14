import os
from dotenv import load_dotenv
from supabase import create_client

# 1. Load .env
load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

print(f"--- 📡 Testing SDK Connection ---")
print(f"URL: {url}")

try:
    # 2. Initialize the client
    supabase = create_client(url, key)
    
    # 3. Try to pull data from your 'trails' table
    # Even if the table is empty, this should return a 200 OK
    response = supabase.table("trails").select("*").limit(1).execute()
    
    print("✅ SUCCESS: Your Python script is talking to Supabase!")
    print(f"Data received: {response.data}")

except Exception as e:
    print(f"❌ ERROR: Could not connect.")
    print(f"Details: {e}")