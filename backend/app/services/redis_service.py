"""Optional Redis cache service."""
import json
import logging
from app.core.redis_client import redis_client

logger = logging.getLogger(__name__)


class RedisService:
    @staticmethod
    async def set_cache(key: str, value, expire: int = 3600):
        if redis_client:
            await redis_client.set(key, json.dumps(value), ex=expire)

    @staticmethod
    async def get_cache(key: str):
        if not redis_client:
            return None
        value = await redis_client.get(key)
        return json.loads(value) if value else None

    @staticmethod
    async def delete_cache(key: str):
        if redis_client:
            await redis_client.delete(key)

    @staticmethod
    async def is_token_blacklisted(token: str) -> bool:
        return bool(redis_client and await redis_client.exists(f'blacklist:{token}'))

    @staticmethod
    async def blacklist_token(token: str, expire: int = 86400):
        if redis_client:
            await redis_client.setex(f'blacklist:{token}', expire, '1')
