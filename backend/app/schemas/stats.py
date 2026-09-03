from pydantic import BaseModel

class StatsOut(BaseModel):
    total_tools: int
    active_tools: int
    today_calls: int
    health: float