from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import os


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
    ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-use-env-in-production-$(openssl rand -hex 32)"
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
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:8080"]
    LOG_LEVEL: str = "INFO"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    class Config:
        env_file = _resolve_env_file()
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
