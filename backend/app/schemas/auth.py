from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)

class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=20, max_length=4096)

class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = Field(default=None, min_length=20, max_length=4096)

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserInfo(BaseModel):
    id: str
    username: str
    email: str
    full_name: Optional[str] = None
    avatar: Optional[str] = None
    is_superuser: bool = False
    roles: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
