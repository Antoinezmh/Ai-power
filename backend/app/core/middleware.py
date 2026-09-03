from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.core.security import decode_token
from app.core.redis_client import redis_client
from app.services.user_service import UserService
from app.services.redis_service import RedisService
import json

class AuthMiddleware(BaseHTTPMiddleware):
    """统一认证中间件（可选，也可在路由依赖中处理）"""
    async def dispatch(self, request: Request, call_next):
        # 对需要认证的路径进行拦截，可配置白名单
        public_paths = ["/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/health", "/docs", "/openapi.json"]
        if any(request.url.path.startswith(p) for p in public_paths):
            return await call_next(request)

        token = request.headers.get("Authorization")
        if token and token.startswith("Bearer "):
            token = token[7:]
            payload = decode_token(token)
            if payload and payload.get("type") == "access":
                # 可以将用户信息存入 request.state
                request.state.user_id = payload.get("sub")
                request.state.user_roles = payload.get("roles", [])
                # 可选检查 Redis 中的黑名单（登出后失效）
                is_blacklisted = await RedisService.is_token_blacklisted(token)
                if is_blacklisted:
                    raise HTTPException(status_code=401, detail="Token revoked")
                return await call_next(request)
        raise HTTPException(status_code=401, detail="Unauthorized")