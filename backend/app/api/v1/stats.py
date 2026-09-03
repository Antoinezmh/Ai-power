from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.stats_service import StatsService
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/dashboard")
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stats = await StatsService.get_dashboard_stats(db)
    return stats