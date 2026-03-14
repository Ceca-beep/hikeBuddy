# test_connection.py
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

print("SUPABASE_URL:", os.getenv("SUPABASE_URL"))
print("SUPABASE_KEY:", os.getenv("SUPABASE_KEY")[:20] if os.getenv("SUPABASE_KEY") else "None")

print("Connecting...")
client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

print("Querying...")
result = client.table("trails").select("*").limit(2).execute()

print("Success! Got", len(result.data), "trails")