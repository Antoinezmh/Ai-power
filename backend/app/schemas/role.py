from pydantic import BaseModel
from typing import Optional
from datetime import datetime   # 新增

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: bool = False

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None

class RoleResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_default: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    permissions: list[str] = []

class AssignPermissionsRequest(BaseModel):
    permission_ids: list[str]