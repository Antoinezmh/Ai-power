"""文件中心访问授权表（细粒度：按用户 → 分组/工具空间 隔离）。

记录某用户被授权访问文件中心哪些空间，以及在该空间内的操作级别。
三级作用域（可任意组合，None 表示该维度不限定）：
  - group_name：一级分组（八组之一）；None = 全部分组
  - func_type ：功能型（数据处理/报告产出/原始数据）；None = 该分组下全部功能型
  - namespace ：工具空间；None = 该功能型下全部工具
访问级别 access_level：
  - read   ：可浏览 / 预览 / 下载
  - write  ：read + 上传 / 编辑(重命名/打标签/归档)
  - manage ：write + 删除 / 移动
超级管理员（users.is_superuser）默认拥有全平台 manage 权限，无需本表记录。
"""
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class FilePermission(Base):
    __tablename__ = "file_permissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"),
                     nullable=False, index=True)
    # 三级作用域；None 表示通配
    group_name = Column(String(50), nullable=True, index=True)
    func_type = Column(String(50), nullable=True)
    namespace = Column(String(50), nullable=True)
    # read / write / manage
    access_level = Column(String(20), default="read", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return (f"<FilePermission(user={self.user_id}, scope="
                f"{self.group_name}/{self.func_type}/{self.namespace}, "
                f"level={self.access_level})>")
