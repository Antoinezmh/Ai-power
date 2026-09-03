import json
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.core.database import get_db
from app.schemas.tool import ToolCreate, ToolUpdate, ToolResponse
from app.services.tool_service import ToolService
from app.api.deps import get_current_user
from app.core.permissions import require_permission
from app.models.user import User
from app.models.tool import Tool
from app.models.category import Category   # 新增导入
from app.models.audit_log import AuditLog
from typing import Optional, List

router = APIRouter(prefix="/tools", tags=["tools"])


@router.get("", response_model=List[ToolResponse])
async def list_tools(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    group_name: Optional[str] = None,
    func_type: Optional[str] = None,
    namespace: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:tools:view")),
):
    tools = await ToolService.list_tools(db, skip, limit, category_id, search, group_name, func_type, namespace)
    return [
        ToolResponse(
            id=t.id,
            name=t.name,
            description=t.description,
            category_id=t.category_id,
            tags=json.loads(t.tags) if t.tags else [],
            owner=t.owner,
            icon=t.icon,
            rating=t.rating,
            status=t.status,
            usage_count=t.usage_count,
            is_active=t.is_active,
            created_at=t.created_at,
            updated_at=t.updated_at,
            type=t.type,
            source=t.source,
            config=t.config,
            entry=t.entry,

            group_name=t.group_name,

            func_type=t.func_type,

            namespace=t.namespace,
        )
        for t in tools
    ]


@router.get("/categories", response_model=List[dict])
async def get_tool_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:tools:view")),
):
    """
    获取分类树（包含所有层级的 id、name、count、子分类）
    """
    # 1. 查询所有分类
    result = await db.execute(select(Category))
    all_cats = result.scalars().all()

    # 2. 构建父级 -> 子级映射
    children_map = {cat.id: [] for cat in all_cats}
    roots = []
    for cat in all_cats:
        if cat.parent_id is None:
            roots.append(cat)
        else:
            if cat.parent_id in children_map:
                children_map[cat.parent_id].append(cat)

    # 3. 统计每个分类下的工具数量（直接关联）
    stmt = (
        select(Tool.category_id, func.count())
        .where(Tool.is_active == True)
        .group_by(Tool.category_id)
    )
    count_result = await db.execute(stmt)
    tool_counts = {row[0]: row[1] for row in count_result.all()}

    # 4. 递归计算每个分类的总数（包含所有子分类）
    def get_total_count(cat_id):
        total = tool_counts.get(cat_id, 0)
        for child in children_map.get(cat_id, []):
            total += get_total_count(child.id)
        return total

    # 5. 递归构建返回结构
    def build_tree(cat):
        return {
            "id": cat.id,
            "name": cat.name,
            "count": get_total_count(cat.id),
            "items": [build_tree(child) for child in children_map.get(cat.id, [])]
        }

    return [build_tree(root) for root in roots]


@router.get("/{tool_id}", response_model=ToolResponse)
async def get_tool(
    tool_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:tools:view")),
):
    tool = await ToolService.get_tool(db, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return ToolResponse(
        id=tool.id,
        name=tool.name,
        description=tool.description,
        category_id=tool.category_id,
        tags=json.loads(tool.tags) if tool.tags else [],
        owner=tool.owner,
        icon=tool.icon,
        rating=tool.rating,
        status=tool.status,
        usage_count=tool.usage_count,
        is_active=tool.is_active,
        created_at=tool.created_at,
        updated_at=tool.updated_at,
        type=tool.type,
        source=tool.source,
        config=tool.config,
        entry=tool.entry,

        group_name=tool.group_name,

        func_type=tool.func_type,

        namespace=tool.namespace,
    )


@router.post("", response_model=ToolResponse)
async def create_tool(
    data: ToolCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:tools:manage")),
):
    tool = await ToolService.create_tool(db, data)
    return ToolResponse(
        id=tool.id,
        name=tool.name,
        description=tool.description,
        category_id=tool.category_id,
        tags=json.loads(tool.tags) if tool.tags else [],
        owner=tool.owner,
        icon=tool.icon,
        rating=tool.rating,
        status=tool.status,
        usage_count=tool.usage_count,
        is_active=tool.is_active,
        created_at=tool.created_at,
        updated_at=tool.updated_at,
        type=tool.type,
        source=tool.source,
        config=tool.config,
        entry=tool.entry,

        group_name=tool.group_name,

        func_type=tool.func_type,

        namespace=tool.namespace,
    )


@router.put("/{tool_id}", response_model=ToolResponse)
async def update_tool(
    tool_id: str,
    data: ToolUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:tools:manage")),
):
    update_data = data.model_dump(exclude_unset=True)
    tool = await ToolService.update_tool(db, tool_id, update_data)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return ToolResponse(
        id=tool.id,
        name=tool.name,
        description=tool.description,
        category_id=tool.category_id,
        tags=json.loads(tool.tags) if tool.tags else [],
        owner=tool.owner,
        icon=tool.icon,
        rating=tool.rating,
        status=tool.status,
        usage_count=tool.usage_count,
        is_active=tool.is_active,
        created_at=tool.created_at,
        updated_at=tool.updated_at,
        type=tool.type,
        source=tool.source,
        config=tool.config,
        entry=tool.entry,

        group_name=tool.group_name,

        func_type=tool.func_type,

        namespace=tool.namespace,
    )


@router.delete("/{tool_id}")
async def delete_tool(
    tool_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:tools:manage")),
):
    success = await ToolService.delete_tool(db, tool_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tool not found")
    return {"message": "Tool deleted"}


@router.post("/{tool_id}/use")
async def use_tool(
    tool_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:tools:use")),
):
    tool = await ToolService.increment_usage(db, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    log = AuditLog(
        user_id=current_user.id,
        action="use_tool",
        resource="tool",
        resource_id=tool_id,
        details={"tool_name": tool.name},
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )
    db.add(log)
    await db.commit()
    return {"message": "Usage recorded", "usage_count": tool.usage_count}
