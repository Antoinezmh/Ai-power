from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.role import RoleCreate, RoleUpdate, RoleResponse, AssignPermissionsRequest
from app.services.role_service import RoleService
from app.services.user_service import UserService
from app.api.deps import get_current_user
from app.core.permissions import require_permission
from app.models.user import User
from typing import List

router = APIRouter(prefix="/roles", tags=["roles"])

@router.get("", response_model=List[RoleResponse])
async def list_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:permissions:view")),
):
    """获取所有角色列表（无需额外权限，登录即可）"""
    roles = await RoleService.list_roles(db)
    result = []
    for r in roles:
        perms = await RoleService.get_role_permissions(db, r.id)
        user_count = await UserService.count_users_by_role(db, r.id)  # 需实现
        result.append(RoleResponse(
            id=r.id, name=r.name, description=r.description,
            is_default=r.is_default, created_at=r.created_at,
            updated_at=r.updated_at, permissions=perms,
            user_count=user_count
        ))
    return result

@router.post("", response_model=RoleResponse)
async def create_role(
    data: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建新角色（仅超级管理员）"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admin can create roles")
    role = await RoleService.create_role(db, data.name, data.description, data.is_default)
    return RoleResponse(
        id=role.id, name=role.name, description=role.description,
        is_default=role.is_default, created_at=role.created_at,
        updated_at=role.updated_at, permissions=[]
    )

@router.get("/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:permissions:view")),
):
    """获取单个角色详情"""
    role = await RoleService.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    perms = await RoleService.get_role_permissions(db, role.id)
    user_count = await UserService.count_users_by_role(db, role.id)
    return RoleResponse(
        id=role.id, name=role.name, description=role.description,
        is_default=role.is_default, created_at=role.created_at,
        updated_at=role.updated_at, permissions=perms,
        user_count=user_count
    )

@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: str,
    data: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新角色信息（仅超级管理员）"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admin can update roles")
    update_data = data.model_dump(exclude_unset=True)
    role = await RoleService.update_role(db, role_id, **update_data)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    perms = await RoleService.get_role_permissions(db, role.id)
    user_count = await UserService.count_users_by_role(db, role.id)
    return RoleResponse(
        id=role.id, name=role.name, description=role.description,
        is_default=role.is_default, created_at=role.created_at,
        updated_at=role.updated_at, permissions=perms,
        user_count=user_count
    )

@router.delete("/{role_id}")
async def delete_role(
    role_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """删除角色（仅超级管理员）"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admin can delete roles")
    success = await RoleService.delete_role(db, role_id)
    if not success:
        raise HTTPException(status_code=404, detail="Role not found")
    return {"message": "Role deleted"}

@router.post("/{role_id}/permissions")
async def assign_role_permissions(
    role_id: str,
    req: AssignPermissionsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    为角色分配权限（覆盖式，先删后增）。
    关联表 role_permissions 联动更新。
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admin can assign permissions")
    success = await RoleService.assign_permissions(db, role_id, req.permission_ids)
    if not success:
        raise HTTPException(status_code=404, detail="Role not found")
    return {"message": "Permissions updated"}

@router.get("/{role_id}/permissions")
async def get_role_permissions(
    role_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取角色当前拥有的权限ID列表"""
    perms = await RoleService.get_role_permissions(db, role_id)
    return {"permission_ids": perms}
