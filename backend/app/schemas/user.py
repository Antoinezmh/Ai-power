from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Literal, Optional
from datetime import datetime

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    full_name: Optional[str] = Field(default=None, max_length=100)

    @field_validator('username')
    @classmethod
    def clean_username(cls, value: str) -> str:
        value = value.strip()
        if any(character.isspace() for character in value):
            raise ValueError('用户名不能包含空白字符')
        return value

    @field_validator('password')
    @classmethod
    def password_fits_bcrypt(cls, value: str) -> str:
        if len(value.encode('utf-8')) > 72:
            raise ValueError('密码的 UTF-8 长度不能超过 72 字节')
        return value

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=100)
    email: Optional[EmailStr] = None
    avatar: Optional[str] = Field(default=None, max_length=255)
    status: Optional[Literal['active', 'inactive']] = None

    @field_validator('email', 'status')
    @classmethod
    def required_updates_cannot_be_null(cls, value):
        if value is None:
            raise ValueError('该字段不能为空')
        return value

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: Optional[str] = None
    avatar: Optional[str] = None
    status: Literal['active', 'inactive']
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    roles: list[str] = Field(default_factory=list)  # role ids

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=12, max_length=128)

    _password_fits_bcrypt = field_validator('new_password')(UserCreate.password_fits_bcrypt.__func__)


class ProfileUpdate(BaseModel):
    nickname: Optional[str] = Field(default=None, max_length=100)
    email: Optional[EmailStr] = None
    bio: Optional[str] = Field(default=None, max_length=1000)
    avatar: Optional[str] = Field(default=None, max_length=255)

    @field_validator('email')
    @classmethod
    def email_cannot_be_null(cls, value):
        if value is None:
            raise ValueError('邮箱不能为空')
        return value


class ApiKeyCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
