from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.agent import AgentConfigOut, AgentConfigUpdate, AgentStatusOut, ChatRequest, ChatResponse
from app.services.agent_service import AgentService
from app.services.redis_service import RedisService
from app.core.permissions import require_permission

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/")
async def chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:chat:use")),
) -> ChatResponse:
    """Every authenticated department account may use the shared AI assistant."""
    await RedisService.enforce_rate_limit("chat", _current_user.id, 30, 60)
    history = [item.model_dump() for item in req.history]
    reply, mode, suggestions, sources = await AgentService.reply(db, req.message, _current_user, history)
    return ChatResponse(reply=reply, mode=mode, suggestions=suggestions, sources=sources)


@router.get("/status", response_model=AgentStatusOut)
async def agent_status(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:chat:use")),
):
    config, source = await AgentService.resolve_config(db, _current_user.id)
    return {"connected": bool(config), "mode": "agent" if config else "catalog", "source": source}


@router.get("/personal-config", response_model=AgentConfigOut)
async def get_personal_agent_config(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:chat:use")),
):
    return AgentService.user_config_view(
        await AgentService.get_user_config(db, current_user.id),
        await AgentService.get_config(db),
    )


@router.put("/personal-config", response_model=AgentConfigOut)
async def update_personal_agent_config(
    payload: AgentConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:chat:use")),
):
    try:
        config = await AgentService.save_user_config(db, payload, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return AgentService.user_config_view(config)


@router.get("/config", response_model=AgentConfigOut)
async def get_agent_config(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:chat:configure")),
):
    return AgentService.config_view(await AgentService.get_config(db))


@router.put("/config", response_model=AgentConfigOut)
async def update_agent_config(
    payload: AgentConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:chat:configure")),
):
    try:
        config = await AgentService.save_config(db, payload, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return AgentService.config_view(config)
