"""User and authentication business logic."""
from typing import List, Optional
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.models.user_role import UserRole
from app.repositories.user_repo import UserRepository


class UserService:
    @staticmethod
    async def create_user(db: AsyncSession, data) -> User:
        return await UserRepository(db).create(
            username=data.username, email=data.email,
            hashed_password=hash_password(data.password), full_name=getattr(data, 'full_name', None),
            is_active=True, is_superuser=False,
        )

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
        await UserRepository(db).update(user_id, hashed_password=hash_password(new_password))
        return True

    @staticmethod
    async def get_user_roles(db: AsyncSession, user_id: str) -> List[str]:
        result = await db.execute(select(UserRole.role_id).where(UserRole.user_id == user_id))
        return [row[0] for row in result.all()]

    @staticmethod
    async def assign_roles(db: AsyncSession, user_id: str, role_ids: List[str]) -> bool:
        if not await UserService.get_user_by_id(db, user_id):
            return False
        await db.execute(delete(UserRole).where(UserRole.user_id == user_id))
        for role_id in role_ids:
            db.add(UserRole(user_id=user_id, role_id=role_id))
        await db.commit()
        return True

    @staticmethod
    async def count_users_by_role(db: AsyncSession, role_id: str) -> int:
        result = await db.execute(select(func.count()).select_from(UserRole).where(UserRole.role_id == role_id))
        return int(result.scalar() or 0)
