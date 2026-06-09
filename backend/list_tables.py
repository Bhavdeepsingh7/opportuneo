import httpx
import os
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
}

def list_tables():
    with httpx.Client() as client:
        response = client.get(
            f"{supabase_url}/rest/v1/",
            headers=headers
        )
        if response.status_code == 200:
            data = response.json()
            print("Tables found:")
            for path in data.get("paths", {}):
                print(path)
        else:
            print(f"Error: {response.status_code}")
            print(response.text)

if __name__ == "__main__":
    list_tables()
