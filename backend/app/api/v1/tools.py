import json
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse, Response
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
from app.core.config import settings
from app.core.security import create_tool_launch_ticket, create_tool_session, decode_typed_token
from app.services.redis_service import RedisService
from typing import Optional, List

router = APIRouter(prefix="/tools", tags=["tools"])


@router.get("", response_model=List[ToolResponse])
async def list_tools(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    group_name: Optional[str] = None,
    func_type: Optional[str] = None,
    namespace: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:tools:view")),
):
    tools = await ToolService.list_tools(db, skip, limit, category_id, search, group_name, func_type, namespace, current_user)
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
            is_public=t.is_public,
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
        .where(Tool.is_active == True, ToolService.access_predicate(current_user))
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


@router.get("/authorize-path", include_in_schema=False)
async def authorize_tool_path(
    x_original_uri: str = Header(""),
    tool_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    """Nginx auth_request target for protected same-origin tool assets."""
    payload = decode_typed_token(tool_session or "", "tool_session")
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    tool_id = payload.get("tool_id")
    user_id = payload.get("sub")
    source_prefix = payload.get("source_prefix")
    request_path = x_original_uri.split("?", 1)[0]
    if not all(isinstance(value, str) and value for value in (tool_id, user_id, source_prefix)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    if not request_path.startswith(source_prefix):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    user = await db.get(User, user_id)
    tool = await db.get(Tool, tool_id)
    if (
        not user or not user.is_active
        or payload.get("ver") != (user.auth_version or 0)
        or not tool or not tool.is_active
        or ToolService.normalize_status(tool.status) != "active"
        or tool.source != source_prefix
        or not await ToolService.can_access(db, user, tool_id)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{tool_id}", response_model=ToolResponse)
async def get_tool(
    tool_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:tools:view")),
):
    tool = await ToolService.get_tool(db, tool_id, current_user)
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
        is_public=tool.is_public,
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


@router.post("/{tool_id}/launch")
async def prepare_tool_launch(
    tool_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:tools:use")),
):
    tool = await ToolService.get_tool(db, tool_id, current_user)
    if not tool:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="工具不存在或未授权")
    if not tool.is_active or ToolService.normalize_status(tool.status) != "active":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="工具当前不可用")
    if not tool.source:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="工具尚未配置访问地址")
    if not tool.source.startswith("/") or tool.type == "internal":
        return {"url": tool.source, "ticket_required": False}
    if settings.APP_ENV.lower() != "production":
        return {"url": tool.source, "ticket_required": False}
    ticket = create_tool_launch_ticket(tool.id, current_user.id, current_user.auth_version or 0)
    return {
        "url": f"{settings.TOOL_PUBLIC_ORIGIN.rstrip('/')}/_launch/{tool.id}/launch-ticket?ticket={ticket}",
        "ticket_required": True,
    }


@router.get("/{tool_id}/launch-ticket")
async def launch_tool_with_ticket(
    tool_id: str,
    ticket: str = Query(..., min_length=20),
    db: AsyncSession = Depends(get_db),
):
    payload = decode_typed_token(ticket, "tool_launch")
    if not payload or payload.get("tool_id") != tool_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="工具启动地址无效或已过期")
    user = await db.get(User, payload.get("sub"))
    tool = await db.get(Tool, tool_id)
    if (
        not user or not user.is_active
        or payload.get("ver") != (user.auth_version or 0)
        or not tool or not tool.is_active
        or ToolService.normalize_status(tool.status) != "active"
        or not await ToolService.can_access(db, user, tool_id)
        or not tool.source or not tool.source.startswith("/")
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="工具不可用或未授权")
    try:
        redeemed = await RedisService.consume_once("tool-launch", ticket)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="工具启动服务暂不可用") from exc
    if not redeemed:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="工具启动地址已使用")
    target = tool.source
    if tool.type == "static":
        target = f"{tool.source}{(tool.entry or 'index.html').lstrip('/')}"
    response = RedirectResponse(target, status_code=status.HTTP_303_SEE_OTHER)
    response.set_cookie(
        key="tool_session",
        value=create_tool_session(tool.id, user.id, tool.source, user.auth_version or 0),
        max_age=15 * 60,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite="strict",
        path=tool.source,
    )
    return response


@router.post("", response_model=ToolResponse)
async def create_tool(
    data: ToolCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:tools:manage")),
):
    try:
        tool = await ToolService.create_tool(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
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
        is_public=tool.is_public,
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
    try:
        tool = await ToolService.update_tool(db, tool_id, update_data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
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
        is_public=tool.is_public,
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
    try:
        tool = await ToolService.increment_usage(db, tool_id, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
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
