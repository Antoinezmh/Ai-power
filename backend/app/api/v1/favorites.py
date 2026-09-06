# app/api/v1/favorites.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.favorite_service import FavoriteService
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.tool import ToolResponse
from app.services.tool_service import ToolService
from app.core.permissions import require_permission
from typing import List
import json                            # ✅ 关键修复2：导入 json 用于解析

router = APIRouter(prefix="/favorites", tags=["favorites"])

@router.post("/{tool_id}")
async def add_favorite(
    tool_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:tools:view")),
):
    if not await ToolService.get_tool(db, tool_id, current_user):
        raise HTTPException(status_code=404, detail="工具不存在或未授权")
    await FavoriteService.add(db, current_user.id, tool_id)
    return {"message": "Added to favorites"}

@router.delete("/{tool_id}")
async def remove_favorite(
    tool_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:tools:view")),
):
    await FavoriteService.remove(db, current_user.id, tool_id)
    return {"message": "Removed from favorites"}

@router.get("", response_model=List[ToolResponse])
async def list_favorites(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:tools:view")),
):
    tools = await FavoriteService.get_user_favorites(db, current_user)
    result = []
    for t in tools:
        # 1. 处理 tags：如果是字符串且以 '[' 开头，解析为列表，否则保持空列表
        tags_data = t.tags
        if isinstance(tags_data, str) and tags_data.startswith('['):
            try:
                tags_list = json.loads(tags_data)
            except json.JSONDecodeError:
                tags_list = []
        elif isinstance(tags_data, list):
            tags_list = tags_data
        else:
            tags_list = []

        # 构建与工具列表一致的响应，收藏筛选仍需要文件空间字段。
        result.append(ToolResponse(
            id=t.id,
            name=t.name,
            description=t.description,
            category_id=t.category_id,
            tags=tags_list,
            owner=t.owner,
            icon=t.icon,
            rating=t.rating,
            status=t.status,
            type=t.type,
            source=t.source,
            config=t.config,
            entry=t.entry,
            group_name=t.group_name,
            func_type=t.func_type,
            namespace=t.namespace,
            usage_count=t.usage_count,
            is_active=t.is_active,
            is_public=t.is_public,
            created_at=t.created_at,
            updated_at=t.updated_at
        ))
    return result
