from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.agent import AgentConfigOut, AgentConfigUpdate, ChatRequest, ChatResponse
from app.services.agent_service import AgentService
from app.services.redis_service import RedisService

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/")
async def chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> ChatResponse:
    """Every authenticated department account may use the shared AI assistant."""
    await RedisService.enforce_rate_limit("chat", _current_user.id, 30, 60)
    reply, mode, suggestions, sources = await AgentService.reply(db, req.message)
    return ChatResponse(reply=reply, mode=mode, suggestions=suggestions, sources=sources)


@router.get("/status")
async def agent_status(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    config = await AgentService.get_config(db)
    connected = bool(config and config.enabled and config.encrypted_api_key)
    return {"connected": connected, "mode": "agent" if connected else "catalog"}


def _require_platform_admin(user: User) -> None:
    if not user.is_superuser:
        raise HTTPException(status_code=403, detail="Only platform administrators can configure the Agent")


@router.get("/config", response_model=AgentConfigOut)
async def get_agent_config(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_platform_admin(current_user)
    return AgentService.config_view(await AgentService.get_config(db))


@router.put("/config", response_model=AgentConfigOut)
async def update_agent_config(
    payload: AgentConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_platform_admin(current_user)
    try:
        config = await AgentService.save_config(db, payload, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return AgentService.config_view(config)
