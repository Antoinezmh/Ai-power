from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Any
from datetime import datetime
import json

class ToolBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=2000)
    category_id: Optional[str] = Field(default=None, max_length=36)
    group_name: Optional[str] = Field(default=None, max_length=50)
    func_type: Optional[str] = Field(default=None, max_length=50)
    namespace: Optional[str] = Field(default=None, max_length=50)
    tags: List[str] = Field(default_factory=list, max_length=20)
    owner: Optional[str] = Field(default=None, max_length=50)
    icon: Optional[str] = Field(default=None, max_length=10)
    rating: Optional[float] = Field(default=0.0, ge=0, le=5)
    status: str = Field(default="active", max_length=20)
    type: str = Field(default="internal", max_length=20)
    source: Optional[str] = Field(default=None, max_length=500)
    config: Optional[Any] = None
    entry: Optional[str] = Field(default=None, max_length=200)
    is_public: bool = False

    @field_validator('status', mode='before')
    @classmethod
    def normalize_legacy_status(cls, value):
        if isinstance(value, str):
            return {
                '稳定': 'active',
                'Beta': 'active',
                'beta': 'active',
                '启用': 'active',
                '停用': 'inactive',
                '已弃用': 'deprecated',
            }.get(value.strip(), value.strip().lower())
        return value

    @field_validator('name')
    @classmethod
    def validate_name(cls, value):
        if value is None:
            raise ValueError('工具名称不能为空')
        value = value.strip()
        if not value:
            raise ValueError('工具名称不能为空')
        return value

    @field_validator('tags')
    @classmethod
    def validate_tags(cls, values):
        if values is None:
            raise ValueError('标签不能为空')
        cleaned = []
        for value in values:
            item = value.strip()
            if not item or len(item) > 50:
                raise ValueError('标签必须为 1-50 个字符')
            if item not in cleaned:
                cleaned.append(item)
        return cleaned

    @field_validator('config')
    @classmethod
    def validate_config_size(cls, value):
        if value is not None and len(json.dumps(value, ensure_ascii=False)) > 20_000:
            raise ValueError('工具配置不能超过 20 KB')
        return value

class ToolCreate(ToolBase):
    pass

class ToolUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=2000)
    category_id: Optional[str] = Field(default=None, max_length=36)
    group_name: Optional[str] = Field(default=None, max_length=50)
    func_type: Optional[str] = Field(default=None, max_length=50)
    namespace: Optional[str] = Field(default=None, max_length=50)
    tags: Optional[List[str]] = Field(default=None, max_length=20)
    owner: Optional[str] = Field(default=None, max_length=50)
    icon: Optional[str] = Field(default=None, max_length=10)
    rating: Optional[float] = Field(default=None, ge=0, le=5)
    status: Optional[str] = Field(default=None, max_length=20)
    is_active: Optional[bool] = None
    type: Optional[str] = Field(default=None, max_length=20)
    source: Optional[str] = Field(default=None, max_length=500)
    config: Optional[Any] = None
    entry: Optional[str] = Field(default=None, max_length=200)
    is_public: Optional[bool] = None

    _validate_name = field_validator('name')(ToolBase.validate_name.__func__)
    _validate_tags = field_validator('tags')(ToolBase.validate_tags.__func__)
    _validate_config_size = field_validator('config')(ToolBase.validate_config_size.__func__)

    @field_validator('type', 'status', 'source', 'group_name', 'func_type', 'namespace', 'is_active', 'is_public')
    @classmethod
    def required_updates_cannot_be_null(cls, value):
        if value is None:
            raise ValueError('该字段不能为空')
        return value

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
