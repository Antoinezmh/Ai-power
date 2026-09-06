"""Optional Redis cache service."""
import json
import logging
import hashlib
import time
from fastapi import HTTPException, status
from app.core.redis_client import redis_client
from app.core.config import settings

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

    @staticmethod
    async def enforce_rate_limit(scope: str, identity: str, limit: int, window_seconds: int) -> None:
        if not redis_client:
            if settings.REQUIRE_REDIS:
                raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Rate-limit service unavailable")
            return
        digest = hashlib.sha256(identity.encode("utf-8")).hexdigest()[:24]
        bucket = int(time.time()) // window_seconds
        key = f"rate:{scope}:{digest}:{bucket}"
        try:
            current = await redis_client.incr(key)
            if current == 1:
                await redis_client.expire(key, window_seconds + 1)
        except Exception as exc:
            if settings.REQUIRE_REDIS:
                raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Rate-limit service unavailable") from exc
            logger.warning("Rate-limit check skipped: %s", exc)
            return
        if current > limit:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "请求过于频繁，请稍后重试")
