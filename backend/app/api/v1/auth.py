from fastapi import APIRouter, Depends, HTTPException, status,Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse, UserInfo
from app.services.user_service import UserService
from app.services.permission_service import PermissionService
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.core.redis_client import redis_client
from app.api.deps import get_current_user   # 导入 get_current_user
from app.models.audit_log import AuditLog
router = APIRouter(prefix="/auth", tags=["auth"])

# 定义 oauth2_scheme（用于 logout）
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    login_req: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
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
    return TokenResponse(access_token=new_access, refresh_token=new_refresh)

@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme)):
    # 黑名单处理
    payload = decode_token(token)
    if payload and payload.get("exp"):
        import time
        exp = payload["exp"]
        now = int(time.time())
        ttl = max(exp - now, 0)
        await redis_client.setex(f"blacklist:{token}", ttl, "1")
    return {"message": "Logged out"}

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
