from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.services.category_service import CategoryService
from app.api.deps import get_current_user
from app.core.permissions import require_permission
from app.models.user import User
from typing import List

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/tree", response_model=List[CategoryResponse])
async def get_category_tree(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:categories:manage")),
):
    """获取分类树（含二级）"""
    tree = await CategoryService.get_tree(db)
    # 递归转为响应模型

    def to_response(cat):
        return CategoryResponse(
            id=cat.id, name=cat.name, parent_id=cat.parent_id,
            sort_order=cat.sort_order, created_at=cat.created_at,
            updated_at=cat.updated_at,
            children=[to_response(c) for c in getattr(cat, 'children', [])]
        )
    return [to_response(c) for c in tree]


@router.get("", response_model=List[CategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:categories:manage")),
):
    cats = await CategoryService.list_all(db)
    return [CategoryResponse(
        id=c.id, name=c.name, parent_id=c.parent_id,
        sort_order=c.sort_order, created_at=c.created_at,
        updated_at=c.updated_at, children=[]
    ) for c in cats]


@router.post("", response_model=CategoryResponse)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:categories:manage")),
):
    cat = await CategoryService.create(db, data)
    return CategoryResponse(
        id=cat.id, name=cat.name, parent_id=cat.parent_id,
        sort_order=cat.sort_order, created_at=cat.created_at,
        updated_at=cat.updated_at, children=[]
    )


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:categories:manage")),
):
    cat = await CategoryService.update(db, category_id, data)
    return CategoryResponse(
        id=cat.id, name=cat.name, parent_id=cat.parent_id,
        sort_order=cat.sort_order, created_at=cat.created_at,
        updated_at=cat.updated_at, children=[]
    )


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:categories:manage")),
):
    await CategoryService.delete(db, category_id)
    return {"message": "Category deleted"}
