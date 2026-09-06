from typing import Dict, List

from sqlalchemy import delete, select, update
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.models.permission import Permission
from app.models.user_role import UserRole
from app.repositories.role_repo import RoleRepository


class RoleService:
    @staticmethod
    async def list_roles(db): return await RoleRepository(db).list()
    @staticmethod
    async def get_role(db, role_id): return await RoleRepository(db).get(role_id)
    @staticmethod
    async def create_role(db, name, description=None, is_default=False):
        if is_default:
            await db.execute(update(Role).values(is_default=False))
        return await RoleRepository(db).create(
            name=name,
            description=description,
            is_default=is_default,
        )
    @staticmethod
    async def update_role(db, role_id, **data):
        role = await RoleService.get_role(db, role_id)
        if not role:
            return None
        if data.get('is_default') is False and role.is_default:
            raise ValueError('请先将其他角色设为默认角色')
        if data.get('is_default') is True:
            await db.execute(update(Role).where(Role.id != role_id).values(is_default=False))
        return await RoleRepository(db).update(role_id, **data)
    @staticmethod
    async def delete_role(db, role_id):
        role = await RoleService.get_role(db, role_id)
        if not role:
            return False
        if role.is_default:
            raise ValueError('默认角色不能删除')
        assigned = await db.scalar(select(UserRole.user_id).where(UserRole.role_id == role_id).limit(1))
        if assigned:
            raise ValueError('该角色仍有关联用户，请先重新分配角色')
        return await RoleRepository(db).delete(role_id)
    @staticmethod
    async def get_role_permissions(db, role_id):
        result = await db.execute(select(RolePermission.permission_id).where(RolePermission.role_id == role_id)); return [x[0] for x in result.all()]
    @staticmethod
    async def get_roles_permissions(db, role_ids: List[str]) -> Dict[str, List[str]]:
        permissions = {role_id: [] for role_id in role_ids}
        if not role_ids:
            return permissions
        result = await db.execute(
            select(RolePermission.role_id, RolePermission.permission_id)
            .where(RolePermission.role_id.in_(role_ids))
        )
        for role_id, permission_id in result.all():
            permissions[role_id].append(permission_id)
        return permissions
    @staticmethod
    async def assign_permissions(db, role_id, permission_ids):
        if not await RoleService.get_role(db, role_id): return False
        unique_permission_ids = list(dict.fromkeys(permission_ids))
        if unique_permission_ids:
            existing = set((await db.execute(select(Permission.id).where(Permission.id.in_(unique_permission_ids)))).scalars().all())
            missing = set(unique_permission_ids) - existing
            if missing:
                raise ValueError('包含不存在的权限')
        await db.execute(delete(RolePermission).where(RolePermission.role_id == role_id))
        for permission_id in unique_permission_ids: db.add(RolePermission(role_id=role_id, permission_id=permission_id))
        await db.commit(); return True
