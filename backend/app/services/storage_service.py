import httpx
import logging
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        self.base_url = f"{settings.supabase_url}/storage/v1"
        self.headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
        }

    async def upload_file(self, bucket: str, path: str, content: bytes, content_type: str) -> str:
        """
        Upload a file to Supabase Storage.
        Returns the full path in the bucket.
        """
        url = f"{self.base_url}/object/{bucket}/{path}"
        headers = {**self.headers, "Content-Type": content_type}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, content=content)
            
        if response.status_code != 200:
            logger.error(f"Failed to upload to Supabase Storage: {response.text}")
            raise Exception(f"Upload failed: {response.status_code} {response.text}")
            
        return path

    async def download_file(self, bucket: str, path: str) -> bytes:
        """
        Download a file from Supabase Storage.
        """
        url = f"{self.base_url}/object/{bucket}/{path}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            
        if response.status_code != 200:
            logger.error(f"Failed to download from Supabase Storage: {response.text}")
            raise Exception(f"Download failed: {response.status_code} {response.text}")
            
        return response.content

storage_service = StorageService()
