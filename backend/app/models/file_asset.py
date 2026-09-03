from sqlalchemy import Column, String, Integer, BigInteger, Text, DateTime, Boolean, JSON
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class FileAsset(Base):
    """平台文件中心：文件资产表。

    物理文件保留原始文件名落盘于
      <data_root>/<一级分组>/<功能型>/<工具 namespace>/<原文件名>
    id 为唯一标识主键（用于接口定位/勾选），与 filename 一一对应。
    """
    __tablename__ = "file_assets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # 目录三层定位
    group_name = Column(String(50), index=True, nullable=False)   # 一级分组（八组之一）
    func_type = Column(String(50), index=True, nullable=False)    # 功能型：数据处理/报告产出/原始数据
    namespace = Column(String(50), index=True, nullable=False)    # 工具标识（最底层隔离）
    # 文件信息
    filename = Column(String(255), nullable=False)   # 原始文件名（物理落盘名，展示用）
    ext = Column(String(20), nullable=True)
    size = Column(BigInteger, default=0)
    mime = Column(String(100), nullable=True)
    storage_path = Column(String(500), nullable=False)   # 相对 <data_root> 的物理路径
    # 逻辑元数据
    tags = Column(JSON, nullable=True)                   # 标签列表
    is_archived = Column(Boolean, default=False)         # 归档（软删，物理保留）
    owner_id = Column(String(36), index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<FileAsset(id={self.id}, group={self.group_name}, func={self.func_type}, ns={self.namespace})>"
