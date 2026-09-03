from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
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
    roles: list[str] = []  # role ids

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str