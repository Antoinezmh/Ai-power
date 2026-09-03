from sqlalchemy import func, select
from app.models.tool import Tool
from app.models.user import User


class StatsService:
    @staticmethod
    async def get_dashboard_stats(db):
        total_tools = await db.scalar(select(func.count()).select_from(Tool))
        active_tools = await db.scalar(select(func.count()).select_from(Tool).where(Tool.is_active.is_(True)))
        total_users = await db.scalar(select(func.count()).select_from(User).where(User.is_active.is_(True)))
        return {
            'total_tools': int(total_tools or 0),
            'active_tools': int(active_tools or 0),
            'today_calls': 0,
            'total_calls': 0,
            'growth_rate': 0,
            'trend_up': True,
            'change_rate': 0,
            'usage_trend': [],
            'usage_trend_7': [],
            'usage_trend_30': [],
            'project_distribution': [],
            'recent_tools': [],
            'total_users': int(total_users or 0),
        }
