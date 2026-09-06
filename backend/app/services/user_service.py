"""User and authentication business logic."""
from typing import Dict, List, Optional
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.models.user_role import UserRole
from app.models.role import Role
from app.repositories.user_repo import UserRepository


class UserService:
    @staticmethod
    async def create_user(db: AsyncSession, data) -> User:
        user = User(
            username=data.username, email=data.email,
            hashed_password=hash_password(data.password), full_name=getattr(data, 'full_name', None),
            is_active=True, is_superuser=False,
        )
        db.add(user)
        await db.flush()
        default_role = await db.scalar(
            select(Role).where(Role.is_default.is_(True)).order_by(Role.created_at, Role.id).limit(1)
        )
        if default_role:
            db.add(UserRole(user_id=user.id, role_id=default_role.id))
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
        return await UserRepository(db).get(user_id)

    @staticmethod
    async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
        return await UserRepository(db).get_by_username(username)

    @staticmethod
    async def authenticate(db: AsyncSession, username: str, password: str) -> Optional[User]:
        user = await UserService.get_user_by_username(db, username)
        return user if user and user.is_active and verify_password(password, user.hashed_password) else None

    @staticmethod
    async def update_user(db: AsyncSession, user_id: str, update_data: dict):
        if 'password' in update_data:
            update_data['hashed_password'] = hash_password(update_data.pop('password'))
        if 'status' in update_data:
            update_data['is_active'] = update_data['status'] == 'active'
        return await UserRepository(db).update(user_id, **update_data)

    @staticmethod
    async def delete_user(db: AsyncSession, user_id: str) -> bool:
        return await UserRepository(db).delete(user_id)

    @staticmethod
    async def list_users(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[User]:
        return await UserRepository(db).list(skip, limit)

    @staticmethod
    async def change_password(db: AsyncSession, user_id: str, old_password: str, new_password: str) -> bool:
        user = await UserService.get_user_by_id(db, user_id)
        if not user or not verify_password(old_password, user.hashed_password):
            return False
        await UserRepository(db).update(
            user_id,
            hashed_password=hash_password(new_password),
            auth_version=(user.auth_version or 0) + 1,
        )
        return True

    @staticmethod
    async def get_user_roles(db: AsyncSession, user_id: str) -> List[str]:
        result = await db.execute(select(UserRole.role_id).where(UserRole.user_id == user_id))
        return [row[0] for row in result.all()]

    @staticmethod
    async def get_users_roles(db: AsyncSession, user_ids: List[str]) -> Dict[str, List[str]]:
        roles_by_user = {user_id: [] for user_id in user_ids}
        if not user_ids:
            return roles_by_user
        result = await db.execute(
            select(UserRole.user_id, UserRole.role_id).where(UserRole.user_id.in_(user_ids))
        )
        for user_id, role_id in result.all():
            roles_by_user[user_id].append(role_id)
        return roles_by_user

    @staticmethod
    async def assign_roles(db: AsyncSession, user_id: str, role_ids: List[str]) -> bool:
        if not await UserService.get_user_by_id(db, user_id):
            return False
        unique_role_ids = list(dict.fromkeys(role_ids))
        if unique_role_ids:
            existing = set((await db.execute(select(Role.id).where(Role.id.in_(unique_role_ids)))).scalars().all())
            missing = set(unique_role_ids) - existing
            if missing:
                raise ValueError('包含不存在的角色')
        await db.execute(delete(UserRole).where(UserRole.user_id == user_id))
        for role_id in unique_role_ids:
            db.add(UserRole(user_id=user_id, role_id=role_id))
        await db.commit()
        return True

    @staticmethod
    async def count_users_by_role(db: AsyncSession, role_id: str) -> int:
        result = await db.execute(select(func.count()).select_from(UserRole).where(UserRole.role_id == role_id))
        return int(result.scalar() or 0)

    @staticmethod
    async def count_users_by_roles(db: AsyncSession, role_ids: List[str]) -> Dict[str, int]:
        counts = {role_id: 0 for role_id in role_ids}
        if not role_ids:
            return counts
        result = await db.execute(
            select(UserRole.role_id, func.count())
            .where(UserRole.role_id.in_(role_ids))
            .group_by(UserRole.role_id)
        )
        counts.update({role_id: int(count) for role_id, count in result.all()})
        return counts
