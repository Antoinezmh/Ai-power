from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    full_name: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    avatar: Optional[str] = None
    status: Optional[str] = None  # active / inactive

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: Optional[str] = None
    avatar: Optional[str] = None
    status: str  # active / inactive
    is_superuser: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    roles: list[str] = Field(default_factory=list)  # role ids

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=12, max_length=128)
