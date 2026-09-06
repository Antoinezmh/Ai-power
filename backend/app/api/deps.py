from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import decode_token
from app.services.user_service import UserService
from app.models.user import User
from app.core.config import settings
from app.services.redis_service import RedisService
from app.models.api_key import ApiKey
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
import hashlib

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db)
) -> User:
    if not token and x_api_key:
        digest = hashlib.sha256(x_api_key.encode("utf-8")).hexdigest()
        api_key = await db.scalar(select(ApiKey).where(ApiKey.key_hash == digest))
        if not api_key:
            raise HTTPException(status_code=401, detail="Invalid API key")
        user = await UserService.get_user_by_id(db, api_key.user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User inactive or not found")
        # Avoid turning every API-key authenticated request into a database
        # write.  The timestamp is operational metadata, so five-minute
        # precision is enough while keeping agent/tool traffic inexpensive.
        now = datetime.now(timezone.utc)
        last_used = api_key.last_used
        if last_used and last_used.tzinfo is None:
            last_used = last_used.replace(tzinfo=timezone.utc)
        if not last_used or now - last_used >= timedelta(minutes=5):
            api_key.last_used = now
            await db.commit()
        return user
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token")
    try:
        if await RedisService.is_token_blacklisted(token):
            raise HTTPException(status_code=401, detail="Token revoked")
    except HTTPException:
        raise
    except Exception as exc:
        if settings.REQUIRE_REDIS:
            raise HTTPException(status_code=503, detail="Authentication service unavailable") from exc
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = await UserService.get_user_by_id(db, user_id)
    if (
        not user
        or not user.is_active
        or payload.get("ver", 0) != (user.auth_version or 0)
    ):
        raise HTTPException(status_code=401, detail="User inactive or not found")
    return user
