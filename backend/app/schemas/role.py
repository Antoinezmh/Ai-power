from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime   # 新增

class RoleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    description: Optional[str] = Field(default=None, max_length=500)
    is_default: bool = False

    @field_validator('name')
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError('角色名称不能为空')
        return value

class RoleUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    description: Optional[str] = Field(default=None, max_length=500)
    is_default: Optional[bool] = None

    @field_validator('name')
    @classmethod
    def name_cannot_be_null(cls, value):
        if value is None:
            raise ValueError('角色名称不能为空')
        value = value.strip()
        if not value:
            raise ValueError('角色名称不能为空')
        return value

class RoleResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_default: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    permissions: list[str] = Field(default_factory=list)
    user_count: int = 0

class AssignPermissionsRequest(BaseModel):
    permission_ids: list[str]
