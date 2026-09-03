from pydantic import BaseModel
from typing import Optional


# 前端把华为回调带回的 code 交给后端换取登录态
class SsoCallbackRequest(BaseModel):
    code: str
    # 可选：回调时携带 state，用于 CSRF 校验
    state: Optional[str] = None


# 后端需要给前端跳转授权页的地址信息
class SsoAuthorizeInfo(BaseModel):
    enabled: bool
    authorize_url: str
    client_id: str
    redirect_uri: str
    scope: str
    state: str = ""
