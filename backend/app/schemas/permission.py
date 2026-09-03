from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime   # 新增导入
from enum import Enum

class PermissionType(str, Enum):
    menu = "menu"
    button = "button"
    data = "data"

class PermissionBase(BaseModel):
    name: str
    code: str
    type: PermissionType
    parent_id: Optional[str] = None
    path: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0
    description: Optional[str] = None

class PermissionCreate(PermissionBase):
    pass

class PermissionUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    type: Optional[PermissionType] = None
    parent_id: Optional[str] = None
    path: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None
    description: Optional[str] = None

class PermissionResponse(PermissionBase):
    id: str
    created_at: datetime
    children: List['PermissionResponse'] = []

# 支持递归模型引用
PermissionResponse.model_rebuild()