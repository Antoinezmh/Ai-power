from pydantic import BaseModel
from datetime import datetime

class ProjectSummary(BaseModel):
    id: str
    name: str
    status: str
    owner: str
    updatedAt: datetime

class ProjectStats(BaseModel):
    total: int
    active: int
    todayCalls: int
    health: float