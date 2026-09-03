from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class ToolGrant(Base):
    """工具授权：授予用户/角色某具体工具（含其对应文件中心 namespace）的使用/文件权限。
    这是「用户拥有哪些工具使用权限 -> 对应文件中心文件权限」的联动枢纽。
    优先匹配 user_id，其次匹配 role_id。"""
    __tablename__ = "tool_grants"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tool_id = Column(String(36), ForeignKey("tools.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    role_id = Column(String(36), ForeignKey("roles.id", ondelete="CASCADE"), nullable=True, index=True)
    # read / write / manage  （对应文件中心的文件权限级别）
    level = Column(String(20), default="read", nullable=False)
    granted_by = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
