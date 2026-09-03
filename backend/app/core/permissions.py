from fastapi import HTTPException, Depends
from typing import List
from app.services.permission_service import PermissionService
from app.api.deps import get_current_user
from app.models.user import User
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

def require_permission(required_code: str):
    """权限依赖注入，检查当前用户是否拥有指定权限码"""
    async def dependency(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        # 获取用户所有权限 code
        user_perms = await PermissionService.get_effective_permission_codes(db, current_user)
        if "*" not in user_perms and required_code not in user_perms:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return True
    return dependency
