from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.schemas.sso import SsoCallbackRequest, SsoAuthorizeInfo
from app.schemas.auth import TokenResponse
from app.services import sso_service

router = APIRouter(prefix="/auth/sso", tags=["sso"])


@router.get("/config", response_model=SsoAuthorizeInfo)
async def get_sso_config():
    """前端拉取 SSO 是否开启及授权地址（避免把 client_secret 暴露给前端）"""
    if not sso_service.is_sso_enabled():
        return SsoAuthorizeInfo(
            enabled=False,
            authorize_url="",
            client_id="",
            redirect_uri="",
            scope="",
        )
    return SsoAuthorizeInfo(
        enabled=True,
        authorize_url=sso_service.build_authorize_url(),
        client_id=settings.SSO_CLIENT_ID,
        redirect_uri=settings.SSO_REDIRECT_URI,
        scope=settings.SSO_SCOPE,
    )


@router.post("/callback", response_model=TokenResponse)
async def sso_callback(
    req: SsoCallbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """前端把华为回调带回的 code 交给后端，换取自家 JWT"""
    if not sso_service.is_sso_enabled():
        raise HTTPException(status_code=404, detail="SSO not configured")
    try:
        access_token, refresh_token = await sso_service.sso_login(db, req.code)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)
