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
    _unavailable_until = 0.0

    @classmethod
    def mark_unavailable(cls, seconds: int = 30) -> None:
        cls._unavailable_until = max(cls._unavailable_until, time.monotonic() + seconds)

    @classmethod
    def should_attempt(cls) -> bool:
        return bool(redis_client and time.monotonic() >= cls._unavailable_until)

    @staticmethod
    def _blacklist_key(token: str) -> str:
        digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
        return f"blacklist:{digest}"

    @staticmethod
    async def set_cache(key: str, value, expire: int = 3600):
        if not RedisService.should_attempt():
            if settings.REQUIRE_REDIS:
                raise ConnectionError("Redis is temporarily unavailable")
            return
        try:
            await redis_client.set(key, json.dumps(value), ex=expire)
        except Exception:
            RedisService.mark_unavailable()
            if settings.REQUIRE_REDIS:
                raise

    @staticmethod
    async def get_cache(key: str):
        if not RedisService.should_attempt():
            if settings.REQUIRE_REDIS:
                raise ConnectionError("Redis is temporarily unavailable")
            return None
        try:
            value = await redis_client.get(key)
            return json.loads(value) if value else None
        except Exception:
            RedisService.mark_unavailable()
            if settings.REQUIRE_REDIS:
                raise
            return None

    @staticmethod
    async def delete_cache(key: str):
        if not RedisService.should_attempt():
            if settings.REQUIRE_REDIS:
                raise ConnectionError("Redis is temporarily unavailable")
            return
        try:
            await redis_client.delete(key)
        except Exception:
            RedisService.mark_unavailable()
            if settings.REQUIRE_REDIS:
                raise

    @staticmethod
    async def is_token_blacklisted(token: str) -> bool:
        if not RedisService.should_attempt():
            if settings.REQUIRE_REDIS:
                raise ConnectionError("Redis is temporarily unavailable")
            return False
        try:
            # Check the old raw-token key during the upgrade window so a
            # previously logged-out token cannot become valid again.
            return bool(await redis_client.exists(
                RedisService._blacklist_key(token),
                f'blacklist:{token}',
            ))
        except Exception:
            RedisService.mark_unavailable()
            if settings.REQUIRE_REDIS:
                raise
            return False

    @staticmethod
    async def blacklist_token(token: str, expire: int = 86400):
        if not RedisService.should_attempt():
            if settings.REQUIRE_REDIS:
                raise ConnectionError("Redis is temporarily unavailable")
            return
        try:
            await redis_client.setex(RedisService._blacklist_key(token), expire, '1')
            await redis_client.delete(f'blacklist:{token}')
        except Exception:
            RedisService.mark_unavailable()
            if settings.REQUIRE_REDIS:
                raise

    @staticmethod
    async def consume_once(scope: str, token: str, expire: int = 180) -> bool:
        """Atomically redeem a signed short-lived ticket once.

        Local development remains usable without Redis. Production requires
        Redis, so an outage fails closed instead of silently allowing replay.
        """
        if not RedisService.should_attempt():
            if settings.REQUIRE_REDIS:
                raise ConnectionError("Redis is temporarily unavailable")
            return True
        digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
        try:
            return bool(await redis_client.set(f"once:{scope}:{digest}", "1", ex=expire, nx=True))
        except Exception:
            RedisService.mark_unavailable()
            if settings.REQUIRE_REDIS:
                raise
            return True

    @staticmethod
    async def enforce_rate_limit(scope: str, identity: str, limit: int, window_seconds: int) -> None:
        if not RedisService.should_attempt():
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
            RedisService.mark_unavailable()
            if settings.REQUIRE_REDIS:
                raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Rate-limit service unavailable") from exc
            logger.warning("Rate-limit check skipped: %s", exc)
            return
        if current > limit:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "请求过于频繁，请稍后重试")
