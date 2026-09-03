# app/api/v1/favorites.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_       # ✅ 关键修复1：显式导入 select
from app.core.database import get_db
from app.services.favorite_service import FavoriteService
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.tool import ToolResponse
from app.models.category import Category
from typing import List
import json                            # ✅ 关键修复2：导入 json 用于解析

router = APIRouter(prefix="/favorites", tags=["favorites"])

@router.post("/{tool_id}")
async def add_favorite(
    tool_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await FavoriteService.add(db, current_user.id, tool_id)
    return {"message": "Added to favorites"}

@router.delete("/{tool_id}")
async def remove_favorite(
    tool_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await FavoriteService.remove(db, current_user.id, tool_id)
    return {"message": "Removed from favorites"}

@router.get("", response_model=List[ToolResponse])
async def list_favorites(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tools = await FavoriteService.get_user_favorites(db, current_user.id)
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

        # 2. 获取分类名称
        category_name = None
        if t.category_id:
            # ✅ 使用 sqlalchemy 的 select
            cat_result = await db.execute(
                select(Category).where(Category.id == t.category_id)
            )
            cat_obj = cat_result.scalar_one_or_none()
            if cat_obj:
                category_name = cat_obj.name

        # 3. 构建响应对象
        result.append(ToolResponse(
            id=t.id,
            name=t.name,
            description=t.description,
            category_id=t.category_id,
            category_name=category_name,   # 这个字段在 ToolResponse 中是可选的
            tags=tags_list,                # ✅ 传入列表而非字符串
            owner=t.owner,
            icon=t.icon,
            rating=t.rating,
            status=t.status,
            type=t.type,
            source=t.source,
            config=t.config,
            entry=t.entry,
            usage_count=t.usage_count,
            is_active=t.is_active,
            created_at=t.created_at,
            updated_at=t.updated_at
        ))
    return result