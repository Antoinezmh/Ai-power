from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from datetime import datetime
import json

class ToolBase(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: str
    group_name: Optional[str] = None
    func_type: Optional[str] = None
    namespace: Optional[str] = None
    tags: Optional[List[str]] = []
    owner: Optional[str] = None
    icon: Optional[str] = None
    rating: Optional[float] = 0.0
    status: str = "active"
    type: str = "internal"
    source: Optional[str] = None
    config: Optional[Any] = None
    entry: Optional[str] = None

class ToolCreate(ToolBase):
    pass

class ToolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    group_name: Optional[str] = None
    func_type: Optional[str] = None
    namespace: Optional[str] = None
    tags: Optional[List[str]] = None
    owner: Optional[str] = None
    icon: Optional[str] = None
    rating: Optional[float] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    type: Optional[str] = None
    source: Optional[str] = None
    config: Optional[Any] = None
    entry: Optional[str] = None

class ToolResponse(ToolBase):
    id: str
    usage_count: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_validator('tags', mode='before')
    @classmethod
    def parse_tags(cls, v):
        """将数据库中的 JSON 字符串自动转换为 Python 列表"""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return []
        return v