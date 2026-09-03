from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class FileAssetBase(BaseModel):
    group_name: str
    func_type: str
    namespace: str
    filename: str


class FileAssetIn(FileAssetBase):
    """上传参数（文件本体走 multipart）"""
    tags: Optional[List[str]] = None


class FileAssetUpdate(BaseModel):
    filename: Optional[str] = None        # 重命名（物理+DB 同步）
    group_name: Optional[str] = None      # 移动一级分组
    func_type: Optional[str] = None       # 移动功能型
    namespace: Optional[str] = None       # 移动工具空间
    tags: Optional[List[str]] = None
    is_archived: Optional[bool] = None


class FileAssetOut(FileAssetBase):
    id: str
    ext: Optional[str] = None
    size: int
    mime: Optional[str] = None
    storage_path: str
    tags: Optional[List[str]] = None
    is_archived: bool
    owner_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DivisionOut(BaseModel):
    """八组 × 三型 目录结构"""
    group_name: str
    func_types: List[str] = Field(default_factory=list)


class DeleteResult(BaseModel):
    success: bool
    message: str
