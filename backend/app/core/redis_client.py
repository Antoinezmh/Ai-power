import redis.asyncio as redis
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# 尝试创建 Redis 连接
redis_client = None
try:
    redis_client = redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        max_connections=20,
        socket_connect_timeout=2,
        socket_timeout=2,
    )
except Exception as e:
    logger.warning(f"Redis connection failed: {e}. Redis features will be disabled.")

async def get_redis():
    return redis_client