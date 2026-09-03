from sqlalchemy import delete, select
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.repositories.role_repo import RoleRepository


class RoleService:
    @staticmethod
    async def list_roles(db): return await RoleRepository(db).list()
    @staticmethod
    async def get_role(db, role_id): return await RoleRepository(db).get(role_id)
    @staticmethod
    async def create_role(db, name, description=None, is_default=False): return await RoleRepository(db).create(name=name, description=description, is_default=is_default)
    @staticmethod
    async def update_role(db, role_id, **data): return await RoleRepository(db).update(role_id, **data)
    @staticmethod
    async def delete_role(db, role_id): return await RoleRepository(db).delete(role_id)
    @staticmethod
    async def get_role_permissions(db, role_id):
        result = await db.execute(select(RolePermission.permission_id).where(RolePermission.role_id == role_id)); return [x[0] for x in result.all()]
    @staticmethod
    async def assign_permissions(db, role_id, permission_ids):
        if not await RoleService.get_role(db, role_id): return False
        await db.execute(delete(RolePermission).where(RolePermission.role_id == role_id))
        for permission_id in permission_ids: db.add(RolePermission(role_id=role_id, permission_id=permission_id))
        await db.commit(); return True
