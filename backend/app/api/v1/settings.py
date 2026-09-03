from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.user import UserUpdate, ChangePasswordRequest
from app.services.user_service import UserService
from app.api.deps import get_current_user
from app.models.user import User
from app.core.redis_client import redis_client
import secrets
from datetime import datetime

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    """获取个人资料"""
    return {
        "nickname": current_user.full_name or current_user.username,
        "email": current_user.email,
        "bio": current_user.full_name,
        "avatar": current_user.avatar
    }

@router.put("/profile")
async def update_profile(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新个人资料（昵称、邮箱、头像等）"""
    update_data = data.model_dump(exclude_unset=True)
    await UserService.update_user(db, current_user.id, update_data)
    return {"message": "Profile updated"}

@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """修改密码"""
    success = await UserService.change_password(db, current_user.id, data.old_password, data.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Incorrect old password")
    return {"message": "Password changed"}

# ---------- API 密钥管理（暂存 Redis，也可存入数据库） ----------
@router.get("/api-keys")
async def list_api_keys(current_user: User = Depends(get_current_user)):
    """获取当前用户的 API 密钥列表（从 Redis 读取）"""
    key = f"user_api_keys:{current_user.id}"
    keys = await redis_client.lrange(key, 0, -1)
    # 假设存储格式为 JSON 字符串
    import json
    return [json.loads(k) for k in keys] if keys else []

@router.post("/api-keys")
async def create_api_key(
    name: str,
    current_user: User = Depends(get_current_user)
):
    """创建新的 API 密钥"""
    raw_key = f"ak-{secrets.token_hex(16)}"
    key_info = {
        "id": secrets.token_hex(8),
        "name": name,
        "key": raw_key,
        "created_at": str(datetime.utcnow()),
        "last_used": None
    }
    # 保存到 Redis 列表
    import json
    redis_key = f"user_api_keys:{current_user.id}"
    await redis_client.rpush(redis_key, json.dumps(key_info))
    # 设置过期时间（7天）
    await redis_client.expire(redis_key, 604800)
    return key_info

@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user)
):
    """删除 API 密钥"""
    redis_key = f"user_api_keys:{current_user.id}"
    keys = await redis_client.lrange(redis_key, 0, -1)
    import json
    for item in keys:
        info = json.loads(item)
        if info["id"] == key_id:
            await redis_client.lrem(redis_key, 1, item)
            return {"message": "Key deleted"}
    raise HTTPException(status_code=404, detail="Key not found")