import bcrypt
import jwt
import uuid
from jwt import InvalidTokenError
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from app.core.config import settings

def _bcrypt_bytes(password: str) -> bytes:
    # bcrypt only considers the first 72 *bytes*. Character slicing is wrong
    # for Chinese and other multi-byte input and can exceed the library limit.
    return password.encode('utf-8')[:72]

def hash_password(password: str) -> str:
    pwd = _bcrypt_bytes(password)
    return bcrypt.hashpw(pwd, bcrypt.gensalt()).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    pwd = _bcrypt_bytes(plain)
    try:
        return bcrypt.checkpw(pwd, hashed.encode('utf-8'))
    except ValueError:
        return False

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(data: Dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_file_download_ticket(asset_id: str, user_id: str, auth_version: int = 0) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=2)
    return jwt.encode(
        {"sub": user_id, "asset_id": asset_id, "ver": auth_version, "jti": uuid.uuid4().hex, "exp": expire, "type": "file_download"},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

def decode_file_download_ticket(token: str, asset_id: str) -> Optional[Dict[str, Any]]:
    payload = decode_token(token)
    if not payload or payload.get("type") != "file_download" or payload.get("asset_id") != asset_id:
        return None
    return payload

def create_tool_launch_ticket(tool_id: str, user_id: str, auth_version: int = 0) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=2)
    return jwt.encode(
        {"sub": user_id, "tool_id": tool_id, "ver": auth_version, "jti": uuid.uuid4().hex, "exp": expire, "type": "tool_launch"},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

def create_tool_session(tool_id: str, user_id: str, source_prefix: str, auth_version: int = 0) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    return jwt.encode(
        {
            "sub": user_id,
            "tool_id": tool_id,
            "source_prefix": source_prefix,
            "ver": auth_version,
            "exp": expire,
            "type": "tool_session",
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

def decode_typed_token(token: str, token_type: str) -> Optional[Dict[str, Any]]:
    payload = decode_token(token)
    if not payload or payload.get("type") != token_type:
        return None
    return payload

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except InvalidTokenError:
        return None
