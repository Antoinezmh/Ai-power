from sqlalchemy import Column, String, Text, Integer, Float, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

class Tool(Base):
    __tablename__ = "tools"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    tags = Column(Text, nullable=True)  # JSON string array
    owner = Column(String(50), nullable=True)
    usage_count = Column(Integer, default=0)
    icon = Column(String(10), nullable=True)
    rating = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    status = Column(String(20), default="active")  # active, inactive, deprecated

    type = Column(String(20), default="internal")  # internal, static, external
    source = Column(String(500), nullable=True)
    config = Column(JSON, nullable=True)
    entry = Column(String(200), nullable=True)
    # ---- 文件中心定位（八组/三型/工具空间）----
    group_name = Column(String(50), nullable=True, index=True)   # 一级分组（八组之一）
    func_type = Column(String(50), nullable=True)                # 功能型：数据处理/报告产出/原始数据
    namespace = Column(String(50), nullable=True, index=True)    # 工具空间标识（文件中心最底层目录）


    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())