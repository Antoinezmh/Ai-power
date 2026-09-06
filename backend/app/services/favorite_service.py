from sqlalchemy import delete, select
from app.models.user_favorite import UserFavorite
from app.models.tool import Tool
from app.services.tool_service import ToolService


class FavoriteService:
    @staticmethod
    async def add(db, user_id, tool_id):
        existing = await db.execute(select(UserFavorite).where(UserFavorite.user_id == user_id, UserFavorite.tool_id == tool_id))
        if not existing.scalar_one_or_none(): db.add(UserFavorite(user_id=user_id, tool_id=tool_id)); await db.commit()
    @staticmethod
    async def remove(db, user_id, tool_id):
        await db.execute(delete(UserFavorite).where(UserFavorite.user_id == user_id, UserFavorite.tool_id == tool_id)); await db.commit()
    @staticmethod
    async def get_user_favorites(db, user):
        result = await db.execute(
            select(Tool)
            .join(UserFavorite, UserFavorite.tool_id == Tool.id)
            .where(
                UserFavorite.user_id == user.id,
                Tool.is_active.is_(True),
                ToolService.access_predicate(user),
            )
            .order_by(UserFavorite.created_at.desc())
        )
        return list(result.scalars().all())
