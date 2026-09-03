from sqlalchemy import Column, String, DateTime, Integer, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class ToolUsage(Base):
    __tablename__ = "tool_usages"
    id = Column(String(36), primary_key=True)
    tool_id = Column(String(36), ForeignKey("tools.id", ondelete="CASCADE"))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    used_at = Column(DateTime, server_default=func.now())
    duration = Column(Integer, default=0)  # 秒
