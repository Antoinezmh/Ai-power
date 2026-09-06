from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.stats_service import StatsService
from app.api.deps import get_current_user
from app.models.user import User
from app.core.permissions import require_permission

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/dashboard")
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:dashboard:view")),
):
    stats = await StatsService.get_dashboard_stats(db, current_user)
    return stats
