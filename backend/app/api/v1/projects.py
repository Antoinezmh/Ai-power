from fastapi import APIRouter
from app.schemas.project import ProjectSummary, ProjectStats
from datetime import datetime

router = APIRouter()

@router.get("/projects", response_model=list[ProjectSummary])
async def list_projects():
    # 模拟数据，实际应从数据库查询
    return [
        ProjectSummary(id="1", name="AI 代码生成", status="active", owner="张三", updatedAt=datetime.now()),
        ProjectSummary(id="2", name="智能文档处理", status="inactive", owner="李四", updatedAt=datetime.now()),
    ]

@router.get("/stats", response_model=ProjectStats)
async def get_stats():
    return ProjectStats(total=12, active=8, todayCalls=145, health=98.5)