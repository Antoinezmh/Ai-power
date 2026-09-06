from fastapi import APIRouter, Depends, HTTPException, status,Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.auth import LoginRequest, LogoutRequest, RefreshRequest, TokenResponse, UserInfo
from app.services.user_service import UserService
from app.services.permission_service import PermissionService
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.api.deps import get_current_user   # 导入 get_current_user
from app.models.audit_log import AuditLog
from app.core.config import settings
from app.services.redis_service import RedisService
router = APIRouter(prefix="/auth", tags=["auth"])

# 定义 oauth2_scheme（用于 logout）
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    login_req: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    await RedisService.enforce_rate_limit("login", request.client.host if request.client else "unknown", 10, 60)
    user = await UserService.authenticate(db, login_req.username, login_req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    # 记录登录日志（可用于统计日活）
    log = AuditLog(
        user_id=user.id,
        action="login",
        resource="user",
        resource_id=user.id,
        details={"username": user.username},
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )
    db.add(log)
    await db.commit()
    
    roles = await UserService.get_user_roles(db, user.id)
    access_token = create_access_token(data={"sub": user.id, "roles": roles})
    refresh_token = create_refresh_token(data={"sub": user.id})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    await RedisService.enforce_rate_limit("refresh", request.refresh_token, 20, 60)
    try:
        if await RedisService.is_token_blacklisted(request.refresh_token):
            raise HTTPException(status_code=401, detail="Refresh token revoked")
    except HTTPException:
        raise
    except Exception as exc:
        if settings.REQUIRE_REDIS:
            raise HTTPException(status_code=503, detail="Authentication service unavailable") from exc
    payload = decode_token(request.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user_id = payload.get("sub")
    user = await UserService.get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive")
    roles = await UserService.get_user_roles(db, user.id)
    new_access = create_access_token(data={"sub": user.id, "roles": roles})
    new_refresh = create_refresh_token(data={"sub": user.id})
    try:
        await RedisService.blacklist_token(request.refresh_token, _token_ttl(payload))
    except Exception as exc:
        if settings.REQUIRE_REDIS:
            raise HTTPException(status_code=503, detail="Authentication service unavailable") from exc
    return TokenResponse(access_token=new_access, refresh_token=new_refresh)

@router.post("/logout")
async def logout(request: LogoutRequest | None = None, token: str = Depends(oauth2_scheme)):
    access_payload = decode_token(token)
    try:
        if access_payload:
            await RedisService.blacklist_token(token, _token_ttl(access_payload))
        refresh_token = request.refresh_token if request else None
        if refresh_token:
            refresh_payload = decode_token(refresh_token)
            if refresh_payload and refresh_payload.get("type") == "refresh":
                await RedisService.blacklist_token(refresh_token, _token_ttl(refresh_payload))
    except Exception as exc:
        if settings.REQUIRE_REDIS:
            raise HTTPException(status_code=503, detail="Authentication service unavailable") from exc
    return {"message": "Logged out"}


def _token_ttl(payload: dict) -> int:
    import time
    return max(int(payload.get("exp", 0)) - int(time.time()), 1)

@router.get("/me", response_model=UserInfo)
async def get_me(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    roles = await UserService.get_user_roles(db, current_user.id)
    permissions = await PermissionService.get_effective_permission_codes(db, current_user)
    return UserInfo(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        avatar=current_user.avatar,
        is_superuser=current_user.is_superuser,
        roles=roles,
        permissions=permissions,
    )
