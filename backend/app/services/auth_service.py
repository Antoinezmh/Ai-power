"""Authentication service facade kept for service-layer callers."""
from app.core.security import create_access_token, hash_password, verify_password
from app.repositories.user_repo import UserRepository


class AuthService:
    def __init__(self, db):
        self.user_repo = UserRepository(db)

    async def register_user(self, user_data):
        return await self.user_repo.create(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hash_password(user_data.password),
            is_active=True,
        )

    async def authenticate_user(self, username, password):
        user = await self.user_repo.get_by_username(username)
        return user if user and verify_password(password, user.hashed_password) else None

    def create_token(self, user_id, username):
        return create_access_token({'sub': user_id, 'username': username})
