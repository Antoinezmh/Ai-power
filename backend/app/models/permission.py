from sqlalchemy import Column, String, Text, DateTime, Integer, Enum as SQLEnum
from sqlalchemy.sql import func
from app.core.database import Base
import uuid
import enum

class PermissionType(str, enum.Enum):
    menu = "menu"
    button = "button"
    data = "data"

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(50), nullable=False)
    code = Column(String(100), unique=True, index=True, nullable=False)
    type = Column(SQLEnum(PermissionType), nullable=False)
    parent_id = Column(String(36), nullable=True, index=True)
    path = Column(String(255), nullable=True)
    icon = Column(String(50), nullable=True)
    sort_order = Column(Integer, default=0)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())