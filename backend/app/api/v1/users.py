from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.user import UserCreate, UserUpdate, UserResponse, ChangePasswordRequest
from app.services.user_service import UserService
from app.services.role_service import RoleService
from app.api.deps import get_current_user
from app.core.permissions import require_permission
from app.models.user import User
from typing import List

router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=List[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:permissions:view")),
):
    """获取用户列表（分页）"""
    users = await UserService.list_users(db, skip, limit)
    result = []
    for u in users:
        roles = await UserService.get_user_roles(db, u.id)
        result.append(UserResponse(
            id=u.id, username=u.username, email=u.email,
            full_name=u.full_name, avatar=u.avatar,
            is_active=u.is_active, is_superuser=u.is_superuser,
            created_at=u.created_at, updated_at=u.updated_at,
            roles=roles,status=u.status
        ))
    return result

@router.post("", response_model=UserResponse)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建新用户（仅超级管理员）"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admin can create users")
    # 检查用户名/邮箱是否已存在
    existing = await UserService.get_user_by_username(db, data.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    user = await UserService.create_user(db, data)
    return UserResponse(
        id=user.id, username=user.username, email=user.email,
        full_name=user.full_name, avatar=user.avatar,
        is_active=user.is_active, is_superuser=user.is_superuser,
        created_at=user.created_at, updated_at=user.updated_at,
        roles=[],status=user.status
        
    )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:permissions:view")),
):
    """获取单个用户详情"""
    user = await UserService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    roles = await UserService.get_user_roles(db, user.id)
    return UserResponse(
        id=user.id, username=user.username, email=user.email,
        full_name=user.full_name, avatar=user.avatar,
        is_active=user.is_active, is_superuser=user.is_superuser,
        created_at=user.created_at, updated_at=user.updated_at,
        roles=roles,status=user.status
    )

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.id != user_id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Cannot update other user")
    update_data = data.model_dump(exclude_unset=True)
    user = await UserService.update_user(db, user_id, update_data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    roles = await UserService.get_user_roles(db, user.id)
    return UserResponse(
        id=user.id, username=user.username, email=user.email,
        full_name=user.full_name, avatar=user.avatar,
        status=user.status,  # 新增
        is_superuser=user.is_superuser,
        created_at=user.created_at, updated_at=user.updated_at,
        roles=roles
    )

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """删除用户（仅超级管理员）"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admin can delete users")
    success = await UserService.delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

@router.post("/{user_id}/roles")
async def assign_user_roles(
    user_id: str,
    role_ids: List[str],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    为用户分配角色（覆盖式，先删后增）。
    关联表 user_roles 联动更新。
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admin can assign roles")
    success = await UserService.assign_roles(db, user_id, role_ids)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Roles updated"}

@router.get("/{user_id}/roles")
async def get_user_roles(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取用户当前拥有的角色ID列表"""
    roles = await UserService.get_user_roles(db, user_id)
    return {"role_ids": roles}
