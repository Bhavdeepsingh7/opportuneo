import httpx
import os
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    print("Supabase credentials not found.")
    exit(1)

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
}

def list_profiles():
    with httpx.Client() as client:
        response = client.get(
            f"{supabase_url}/rest/v1/profiles?select=id,full_name,available_credits&limit=5",
            headers=headers
        )
        if response.status_code == 200:
            profiles = response.json()
            for p in profiles:
                print(f"ID: {p['id']}, Name: {p['full_name']}, Credits: {p['available_credits']}")
        else:
            print(f"Error listing profiles: {response.status_code}")
            print(response.text)

if __name__ == "__main__":
    list_profiles()
