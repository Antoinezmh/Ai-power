"""Permission queries and permission tree construction."""
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.permission import Permission
from app.models.role_permission import RolePermission
from app.models.user_role import UserRole
from app.repositories.permission_repo import PermissionRepository


class PermissionService:
    @staticmethod
    async def get_all_permissions(db: AsyncSession) -> List[Permission]:
        return await PermissionRepository(db).list()

    @staticmethod
    async def get_permission_tree(db: AsyncSession) -> List[Permission]:
        permissions = await PermissionService.get_all_permissions(db)
        by_id = {item.id: item for item in permissions}
        roots = []
        for item in permissions:
            if item.parent_id and item.parent_id in by_id:
                parent = by_id[item.parent_id]
                if not hasattr(parent, 'children'):
                    parent.children = []
                parent.children.append(item)
            elif item.parent_id is None:
                roots.append(item)
        return roots

    @staticmethod
    async def get_user_permission_codes(db: AsyncSession, user_id: str) -> List[str]:
        roles = await db.execute(select(UserRole.role_id).where(UserRole.user_id == user_id))
        role_ids = [row[0] for row in roles.all()]
        if not role_ids:
            return []
        permissions = await db.execute(select(RolePermission.permission_id).where(RolePermission.role_id.in_(role_ids)))
        permission_ids = [row[0] for row in permissions.all()]
        if not permission_ids:
            return []
        result = await db.execute(select(Permission.code).where(Permission.id.in_(permission_ids)))
        return [row[0] for row in result.all()]

    @staticmethod
    async def get_effective_permission_codes(db: AsyncSession, user) -> List[str]:
        """Return server-authoritative permission codes for API and UI bootstrap."""
        if getattr(user, "is_superuser", False):
            return ["*"]
        return await PermissionService.get_user_permission_codes(db, user.id)
