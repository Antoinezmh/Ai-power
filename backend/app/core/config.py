from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict
from pydantic import Field, field_validator, model_validator
from typing import Annotated, List
import os
from urllib.parse import urlparse


def _resolve_env_file() -> list[str]:
    """按 APP_ENV 选择加载的环境文件，实现 开发/测试/生产 分离。
    - 未设置 APP_ENV 时，默认 development，回退加载 .env.development / .env
    - APP_ENV=production 时加载 .env.production
    - 检查顺序：优先 os.environ 里的直接键值（如 docker 注入），再读 env 文件
    """
    env = os.environ.get("APP_ENV", "development")
    files = [f".env.{env}", ".env"]
    # 只保留实际存在的文件（本地开发可能没有 .env.production 等）
    return [f for f in files if os.path.exists(f)]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_resolve_env_file(),
        env_file_encoding="utf-8",
        case_sensitive=True,
    )
    APP_ENV: str = "development"
    ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-use-env-in-production-$(openssl rand -hex 32)"
    SEED_DEMO_DATA: bool = True
    REQUIRE_REDIS: bool = False
    BOOTSTRAP_ADMIN_USERNAME: str = ""
    BOOTSTRAP_ADMIN_EMAIL: str = ""
    BOOTSTRAP_ADMIN_PASSWORD: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    # ---------- 华为统一登录 IDaaS（SSO / OAuth2 授权码模式）------------
    # 参考《IDaaS 2.0 集成指导（OAuth2.0 版）》
    # 未配置以下项时，SSO 接入处于关闭状态，登录页仅显示本地账号登录
    SSO_ENABLED: bool = False
    # 申请方 APPID（用于 IDaaS 控制台备案，仅作记录，不参与 OAuth 请求）
    SSO_APPID: str = ""
    SSO_CLIENT_ID: str = ""
    SSO_CLIENT_SECRET: str = ""
    # IDaaS 服务基址（不含路径）：测试 https://uniportal-beta.huawei.com，生产 https://uniportal.huawei.com
    SSO_BASE_URL: str = "https://uniportal.huawei.com"
    # OAuth 路径（基于上述基址拼接）
    SSO_AUTHORIZE_PATH: str = "/saaslogin1/oauth2/authorize"
    SSO_TOKEN_PATH: str = "/saaslogin1/oauth2/accesstoken"
    SSO_USERINFO_PATH: str = "/saaslogin1/oauth2/userinfo"
    SSO_REFRESH_PATH: str = "/saaslogin1/oauth2/refreshtoken"
    SSO_LOGOUT_PATH: str = "/saaslogin1/oauth2/logout"
    SSO_SCOPE: str = "base.profile"
    # 回调地址，需与 IDaaS 控制台登记的应用域名 + 端口 + 文根完全匹配
    SSO_REDIRECT_URI: str = ""
    # 首次通过 SSO 登录时，是否自动在本地建号（生产建议改为 False 走白名单/同步）
    SSO_AUTO_CREATE_USER: bool = True
    # SSO 返回的用户信息里，用哪个字段作为本地 username 映射
    # 注意：IDaaS 默认仅返回 tenantid/uuid/globalUserID，其余字段需在控制台申请附加信息
    SSO_USERNAME_FIELD: str = "uuid"
    # SSO 返回的用户信息里，用哪个字段作为显示姓名
    SSO_NAME_FIELD: str = "name"
    # SSO 返回的用户信息里，用哪个字段作为邮箱
    SSO_EMAIL_FIELD: str = "mail"

    DATABASE_URL: str = "sqlite+aiosqlite:///./test.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    PUBLIC_URL: str = ""
    TOOL_PUBLIC_ORIGIN: str = ""
    # 平台文件中心数据根（容器内路径，对应宿主卷挂载点）
    # 生产挂载：/opt/aixsilicon/files -> /data/files
    FILE_STORAGE_ROOT: str = os.environ.get("FILE_STORAGE_ROOT", "/data/files")
    # 上传白名单扩展名（小写）
    ALLOWED_UPLOAD_EXTS: List[str] = [
        ".csv", ".xlsx", ".xls", ".json", ".txt", ".md", ".pdf", ".docx", ".doc",
        ".pptx", ".ppt", ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".svg",
        ".zip", ".tar", ".gz", ".7z", ".py", ".sql", ".log",
    ]
    # 单文件大小上限（字节），默认 200MB
    MAX_UPLOAD_SIZE: int = 200 * 1024 * 1024
    # 文件中心可用的逻辑总容量；0 表示仅受磁盘空间约束。
    FILE_STORAGE_QUOTA_BYTES: int = 20 * 1024 * 1024 * 1024
    # 始终为系统和数据库预留的磁盘空间。
    FILE_STORAGE_MIN_FREE_BYTES: int = 1024 * 1024 * 1024
    CHUNK_UPLOAD_SIZE: int = 5 * 1024 * 1024
    # HTTPS 部署时必须设为 true；纯 HTTP 内网验收环境保持 false。
    SESSION_COOKIE_SECURE: bool = False
    CORS_ORIGINS: Annotated[List[str], NoDecode] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:8080"]
    LOG_LEVEL: str = "INFO"
    # 审计记录用于近期活动与安全追溯；定期清理避免长期部署后数据库无限增长。
    AUDIT_LOG_RETENTION_DAYS: int = Field(default=180, ge=7, le=3650)

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @model_validator(mode="after")
    def validate_production_settings(self):
        if self.APP_ENV.lower() != "production":
            return self
        if len(self.SECRET_KEY) < 32 or self.SECRET_KEY.startswith("dev-secret-key") or self.SECRET_KEY.startswith("replace-with"):
            raise ValueError("Production SECRET_KEY must be a non-default value with at least 32 characters")
        if self.SEED_DEMO_DATA:
            raise ValueError("SEED_DEMO_DATA must be false in production")
        if not self.DATABASE_URL.startswith("postgresql+asyncpg://"):
            raise ValueError("Production DATABASE_URL must use postgresql+asyncpg")
        if not self.REQUIRE_REDIS:
            raise ValueError("REQUIRE_REDIS must be true in production")
        if self.BOOTSTRAP_ADMIN_PASSWORD and len(self.BOOTSTRAP_ADMIN_PASSWORD) < 12:
            raise ValueError("BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters")
        if len(self.BOOTSTRAP_ADMIN_PASSWORD.encode("utf-8")) > 72:
            raise ValueError("BOOTSTRAP_ADMIN_PASSWORD must not exceed 72 UTF-8 bytes")
        if self.BOOTSTRAP_ADMIN_USERNAME and (
            not 3 <= len(self.BOOTSTRAP_ADMIN_USERNAME) <= 50
            or any(character.isspace() for character in self.BOOTSTRAP_ADMIN_USERNAME)
        ):
            raise ValueError("BOOTSTRAP_ADMIN_USERNAME must be 3-50 characters without whitespace")
        if self.BOOTSTRAP_ADMIN_EMAIL and (
            len(self.BOOTSTRAP_ADMIN_EMAIL) > 100 or "@" not in self.BOOTSTRAP_ADMIN_EMAIL
        ):
            raise ValueError("BOOTSTRAP_ADMIN_EMAIL must be a valid email-like address")
        if self.SSO_ENABLED:
            raise ValueError("SSO_ENABLED cannot be used until the provider adapter is implemented and verified")
        if self.FILE_STORAGE_QUOTA_BYTES and self.FILE_STORAGE_QUOTA_BYTES < self.MAX_UPLOAD_SIZE:
            raise ValueError("FILE_STORAGE_QUOTA_BYTES must be 0 or at least MAX_UPLOAD_SIZE")
        public = urlparse(self.PUBLIC_URL) if self.PUBLIC_URL else None
        tool_public = urlparse(self.TOOL_PUBLIC_ORIGIN) if self.TOOL_PUBLIC_ORIGIN else None
        if not public or public.scheme not in {"http", "https"} or not public.netloc:
            raise ValueError("PUBLIC_URL must be a complete HTTP(S) origin in production")
        if not tool_public or tool_public.scheme not in {"http", "https"} or not tool_public.netloc:
            raise ValueError("TOOL_PUBLIC_ORIGIN must be a complete HTTP(S) origin in production")
        if public.username or public.password or tool_public.username or tool_public.password:
            raise ValueError("Public origins must not contain credentials")
        if public.path not in {"", "/"} or public.query or public.fragment:
            raise ValueError("PUBLIC_URL must not contain a path, query, or fragment")
        if tool_public.path not in {"", "/"} or tool_public.query or tool_public.fragment:
            raise ValueError("TOOL_PUBLIC_ORIGIN must not contain a path, query, or fragment")
        if (public.scheme, public.netloc) == (tool_public.scheme, tool_public.netloc):
            raise ValueError("TOOL_PUBLIC_ORIGIN must use a different origin (port or host) from PUBLIC_URL")
        if public.scheme == "https" and tool_public.scheme != "https":
            raise ValueError("HTTPS PUBLIC_URL requires an HTTPS TOOL_PUBLIC_ORIGIN")
        if self.PUBLIC_URL.rstrip("/") not in {origin.rstrip("/") for origin in self.CORS_ORIGINS}:
            raise ValueError("CORS_ORIGINS must include PUBLIC_URL")
        for origin in self.CORS_ORIGINS:
            parsed_origin = urlparse(origin)
            if (
                origin == "*"
                or parsed_origin.scheme not in {"http", "https"}
                or not parsed_origin.netloc
                or parsed_origin.username
                or parsed_origin.password
                or parsed_origin.path not in {"", "/"}
                or parsed_origin.query
                or parsed_origin.fragment
            ):
                raise ValueError("CORS_ORIGINS must contain only credential-free HTTP(S) origins")
        if self.SESSION_COOKIE_SECURE and tool_public.scheme != "https":
            raise ValueError("SESSION_COOKIE_SECURE requires an HTTPS TOOL_PUBLIC_ORIGIN")
        if tool_public.scheme == "https" and not self.SESSION_COOKIE_SECURE:
            raise ValueError("HTTPS TOOL_PUBLIC_ORIGIN requires SESSION_COOKIE_SECURE=true")
        return self

settings = Settings()
