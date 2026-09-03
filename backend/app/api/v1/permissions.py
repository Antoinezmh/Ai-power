from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.permission import PermissionResponse
from app.services.permission_service import PermissionService
from app.api.deps import get_current_user
from app.core.permissions import require_permission
from app.models.user import User

router = APIRouter(prefix="/permissions", tags=["permissions"])

@router.get("/tree", response_model=list[PermissionResponse])
async def get_permission_tree(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:permissions:view")),
):
    """获取权限树（用于前端渲染树形结构）"""
    tree = await PermissionService.get_permission_tree(db)
    # 递归转换为响应模型
    def to_response(p):
        return PermissionResponse(
            id=p.id, name=p.name, code=p.code, type=p.type,
            parent_id=p.parent_id, path=p.path, icon=p.icon,
            sort_order=p.sort_order, description=p.description,
            created_at=p.created_at,
            children=[to_response(c) for c in getattr(p, 'children', [])]
        )
    return [to_response(p) for p in tree]

@router.get("", response_model=list[PermissionResponse])
async def list_permissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:permissions:view")),
):
    """获取扁平权限列表（用于表格展示）"""
    perms = await PermissionService.get_all_permissions(db)
    return [PermissionResponse(
        id=p.id, name=p.name, code=p.code, type=p.type,
        parent_id=p.parent_id, path=p.path, icon=p.icon,
        sort_order=p.sort_order, description=p.description,
        created_at=p.created_at, children=[]
    ) for p in perms]
