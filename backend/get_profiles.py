import httpx
import os
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Content-Type": "application/json",
}

def get_profiles():
    url = f"{supabase_url}/rest/v1/profiles"
    with httpx.Client() as client:
        # Try to get all profiles
        response = client.get(url, headers=headers)
        if response.status_code == 200:
            profiles = response.json()
            if not profiles:
                print("No profiles found.")
            for p in profiles:
                print(f"User: {p.get('full_name')} ({p.get('id')}) - Credits: {p.get('available_credits')}")
        else:
            print(f"Error: {response.status_code}")
            print(response.text)

if __name__ == "__main__":
    get_profiles()
