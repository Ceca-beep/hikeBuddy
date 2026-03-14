import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

print("URL:", url)
print("KEY:", key[:20] if key else "None")

client = create_client(url, key)
response = client.table("trails").select("*").execute()
print("Data:", response.data)