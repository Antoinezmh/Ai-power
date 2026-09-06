from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    parent_id: Optional[str] = Field(default=None, max_length=36)
    sort_order: int = Field(default=0, ge=0, le=10000)

    @field_validator('name')
    @classmethod
    def clean_name(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError('分类名称不能为空')
        value = value.strip()
        if not value:
            raise ValueError('分类名称不能为空')
        return value

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    parent_id: Optional[str] = Field(default=None, max_length=36)
    sort_order: Optional[int] = Field(default=None, ge=0, le=10000)

    _clean_name = field_validator('name')(CategoryBase.clean_name.__func__)

class CategoryResponse(CategoryBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    children: List['CategoryResponse'] = Field(default_factory=list)
