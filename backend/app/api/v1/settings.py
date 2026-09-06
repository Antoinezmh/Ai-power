from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.user import ApiKeyCreateRequest, ChangePasswordRequest, ProfileUpdate
from app.services.user_service import UserService
from app.api.deps import get_current_user
from app.models.user import User
import secrets
import hashlib
from sqlalchemy import select
from app.models.api_key import ApiKey
from app.services.redis_service import RedisService
from app.core.permissions import require_permission
from sqlalchemy.exc import IntegrityError

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("/profile")
async def get_profile(
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:settings:view")),
):
    """获取个人资料"""
    return {
        "nickname": current_user.full_name or current_user.username,
        "email": current_user.email,
        "bio": current_user.bio,
        "avatar": current_user.avatar
    }

@router.put("/profile")
async def update_profile(
    data: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:settings:edit")),
):
    """更新个人资料（昵称、邮箱、头像等）"""
    values = data.model_dump(exclude_unset=True)
    if "nickname" in values:
        nickname = (values.pop("nickname") or "").strip()
        if not nickname:
            raise HTTPException(status_code=422, detail="昵称不能为空")
        values["full_name"] = nickname
    if "bio" in values and values["bio"] is not None:
        values["bio"] = values["bio"].strip()
    try:
        updated = await UserService.update_user(db, current_user.id, values)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="邮箱已被其他账号使用") from exc
    return {
        "nickname": updated.full_name or updated.username,
        "email": updated.email,
        "bio": updated.bio,
        "avatar": updated.avatar,
    }

@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:settings:edit")),
):
    """修改密码"""
    success = await UserService.change_password(db, current_user.id, data.old_password, data.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Incorrect old password")
    return {"message": "Password changed"}

# ---------- API 密钥管理（数据库仅保存 SHA-256 摘要，明文只返回一次） ----------
@router.get("/api-keys")
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(require_permission("button:settings:view")),
):
    rows = (await db.execute(
        select(ApiKey).where(ApiKey.user_id == current_user.id).order_by(ApiKey.created_at.desc())
    )).scalars().all()
    return [
        {
            "id": item.id,
            "name": item.name,
            "prefix": item.prefix,
            "created_at": item.created_at,
            "last_used": item.last_used,
        }
        for item in rows
    ]

@router.post("/api-keys")
async def create_api_key(
    payload: ApiKeyCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(require_permission("button:settings:edit")),
):
    clean_name = payload.name.strip()
    if not clean_name or len(clean_name) > 100:
        raise HTTPException(status_code=422, detail="密钥名称长度必须为 1-100")
    await RedisService.enforce_rate_limit("api-key-create", current_user.id, 10, 86400)
    prefix = secrets.token_hex(4)
    raw_key = f"ak_{prefix}_{secrets.token_urlsafe(32)}"
    item = ApiKey(
        user_id=current_user.id,
        name=clean_name,
        prefix=f"ak_{prefix}",
        key_hash=hashlib.sha256(raw_key.encode("utf-8")).hexdigest(),
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {
        "id": item.id,
        "name": item.name,
        "prefix": item.prefix,
        "key": raw_key,
        "created_at": item.created_at,
        "last_used": None,
    }

@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(require_permission("button:settings:edit")),
):
    item = await db.get(ApiKey, key_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Key not found")
    await db.delete(item)
    await db.commit()
    return {"message": "Key deleted"}
