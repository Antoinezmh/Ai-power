from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.file_asset import (
    FileAssetOut, FileAssetUpdate, DivisionOut, DeleteResult,
)
from app.services.file_service import FileService
from app.services.file_permission_service import FilePermissionService
from app.core.file_center import GROUPS, FUNC_TYPES
from app.models.file_asset import FileAsset
from app.models.file_permission import FilePermission
from app.models.user import User

router = APIRouter(prefix="/files", tags=["文件中心"])


def _require_admin(user: User) -> None:
    """仅超级管理员可通过。"""
    if not FilePermissionService.is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "仅管理员可执行该操作")


async def _require_space(db: AsyncSession, user: User, group: str,
                         func_type: str, namespace: str, level: str) -> None:
    """校验当前用户在指定空间达到 level（read/write/manage）。"""
    if not await FilePermissionService.can(db, user, group, func_type, namespace, level):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"无权在 「{group}/{func_type}/{namespace}」空间执行该操作（需 {level} 级别）",
        )


async def _get_asset_or_404(db: AsyncSession, asset_id: str) -> FileAsset:
    asset = await db.get(FileAsset, asset_id)
    if not asset:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "文件不存在")
    return asset


def _to_out(a: FileAsset) -> FileAssetOut:
    return FileAssetOut(
        id=a.id,
        group_name=a.group_name,
        func_type=a.func_type,
        namespace=a.namespace,
        filename=a.filename,
        ext=a.ext,
        size=a.size or 0,
        mime=a.mime,
        storage_path=a.storage_path,
        tags=a.tags or [],
        is_archived=a.is_archived or False,
        owner_id=a.owner_id,
        created_at=a.created_at,
        updated_at=a.updated_at,
    )


@router.get("/divisions", response_model=List[DivisionOut], summary="八组×三型目录结构（按权限过滤）")
async def divisions(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 管理员全量；普通用户仅返回其可见分组（至少有一项 read 权限的分组）
    return await FileService.divisions_for_user(db, _user)


@router.get("/scopes", summary="当前用户可见的文件中心作用域与操作级别")
async def my_scopes(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await FilePermissionService.user_scope_view(db, user, GROUPS, FUNC_TYPES)


# ------------------------------------------------------------
# 授权管理（仅管理员）
# ------------------------------------------------------------
@router.get("/permissions", summary="查询某用户的文件中心授权（仅管理员）")
async def list_permissions(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    grants = await FilePermissionService.list_user_grants(db, user_id)
    return [
        {
            "id": g.id,
            "group_name": g.group_name,
            "func_type": g.func_type,
            "namespace": g.namespace,
            "access_level": g.access_level,
        }
        for g in grants
    ]


@router.post("/permissions", summary="授予用户文件中心空间访问权限（仅管理员）")
async def grant_permission(
    user_id: str = Form(...),
    group_name: Optional[str] = Form(None),
    func_type: Optional[str] = Form(None),
    namespace: Optional[str] = Form(None),
    access_level: str = Form("read"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    if access_level not in ("read", "write", "manage"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "access_level 仅可为 read/write/manage")
    # 若指定了更细维度，其上级维度为空即为通配，允许
    # 简单去重：完全相同的 scope 不重复插入
    existing = await FilePermissionService.list_user_grants(db, user_id)
    for g in existing:
        if (g.group_name == group_name and g.func_type == func_type
                and g.namespace == namespace):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "该授权已存在")
    fp = await FilePermissionService.grant(
        db, user_id, group_name, func_type, namespace, access_level,
    )
    return {"id": fp.id, "group_name": fp.group_name, "func_type": fp.func_type,
            "namespace": fp.namespace, "access_level": fp.access_level}


@router.delete("/permissions/{permission_id}", summary="撤销一条文件中心授权（仅管理员）")
async def revoke_permission(
    permission_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    fp = await db.get(FilePermission, permission_id)
    if not fp:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "授权记录不存在")
    await db.delete(fp)
    await db.commit()
    return {"success": True, "message": "已撤销授权"}


@router.post("/upload", response_model=FileAssetOut, summary="上传文件")
async def upload(
    file: UploadFile = File(...),
    group_name: str = Form(...),
    func_type: str = Form(...),
    namespace: str = Form(...),
    tags: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _require_space(db, user, group_name, func_type, namespace, "write")
    tag_list = [t.strip() for t in tags.split(",")] if tags else None
    asset = await FileService.upload(
        db=db, group=group_name, func_type=func_type,
        namespace=namespace, file=file,
        owner_id=user.id, tags=tag_list,
    )
    return _to_out(asset)


@router.post("/upload/chunk/init", summary="分片上传-初始化")
async def chunk_upload_init(
    group_name: str = Form(...),
    func_type: str = Form(...),
    namespace: str = Form(...),
    filename: str = Form(...),
    size: Optional[int] = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_space(db, user, group_name, func_type, namespace, "write")
    return await FileService.init_chunk(
        group=group_name, func_type=func_type,
        namespace=namespace, filename=filename, size=size,
    )


@router.post("/upload/chunk", summary="分片上传-上传分片")
async def chunk_upload_part(
    upload_id: str = Form(...),
    index: int = Form(...),
    file: UploadFile = File(...),
    _user: User = Depends(get_current_user),
):
    return await FileService.save_chunk(upload_id=upload_id, index=index, file=file)


@router.post("/upload/chunk/complete", response_model=FileAssetOut, summary="分片上传-合并完成")
async def chunk_upload_complete(
    upload_id: str = Form(...),
    group_name: str = Form(...),
    func_type: str = Form(...),
    namespace: str = Form(...),
    filename: str = Form(...),
    tags: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _require_space(db, user, group_name, func_type, namespace, "write")
    tag_list = [t.strip() for t in tags.split(",")] if tags else None
    asset = await FileService.complete_chunk(
        db=db, upload_id=upload_id, owner_id=user.id,
        group=group_name, func_type=func_type, namespace=namespace,
        filename=filename, tags=tag_list,
    )
    return _to_out(asset)



@router.get("", response_model=dict, summary="文件清单（分页过滤，按权限隔离）")
async def list_files(
    group_name: Optional[str] = None,
    func_type: Optional[str] = None,
    namespace: Optional[str] = None,
    keyword: Optional[str] = None,
    archived: Optional[bool] = None,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows, total = await FileService.list_files(
        db=db, user=user, group=group_name, func_type=func_type, namespace=namespace,
        keyword=keyword, archived=archived, page=page, page_size=page_size,
    )
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [_to_out(r) for r in rows],
    }


@router.get("/tree", summary="分组→功能型→工具→文件 树（按权限隔离）")
async def get_tree(
    group_name: Optional[str] = None,
    func_type: Optional[str] = None,
    namespace: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await FileService.get_tree(db, user, group_name, func_type, namespace)


@router.get("/{asset_id}/download", summary="下载文件")
async def download(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    asset = await _get_asset_or_404(db, asset_id)
    await _require_space(db, user, asset.group_name, asset.func_type, asset.namespace, "read")
    asset, path = await FileService.download_meta(db, asset_id)
    return FileResponse(
        path,
        filename=asset.filename,
        media_type=asset.mime or "application/octet-stream",
    )


@router.get("/{asset_id}/content", summary="读取文本文件内容")
async def read_content(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    asset = await _get_asset_or_404(db, asset_id)
    await _require_space(db, user, asset.group_name, asset.func_type, asset.namespace, "read")
    return {"id": asset_id, "content": await FileService.content(db, asset_id)}


@router.patch("/{asset_id}", response_model=FileAssetOut, summary="重命名/移动/打标签/归档")
async def update(
    asset_id: str,
    payload: FileAssetUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    asset = await _get_asset_or_404(db, asset_id)
    # 目标空间与当前空间都需有 write 权限（移动可能跨空间）
    await _require_space(db, user, asset.group_name, asset.func_type, asset.namespace, "write")
    if payload.group_name or payload.func_type or payload.namespace:
        ng = payload.group_name or asset.group_name
        nf = payload.func_type or asset.func_type
        nn = payload.namespace or asset.namespace
        await _require_space(db, user, ng, nf, nn, "write")
    asset = await FileService.move(
        db, asset_id,
        new_group=payload.group_name,
        new_func_type=payload.func_type,
        new_namespace=payload.namespace,
        new_filename=payload.filename,
        new_tags=payload.tags,
        new_archived=payload.is_archived,
    )
    return _to_out(asset)


@router.delete("/{asset_id}", response_model=DeleteResult, summary="删除文件（物理+DB）")
async def delete(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    asset = await _get_asset_or_404(db, asset_id)
    # 删除需要 manage 级别，且仅 owner 或超管
    await _require_space(db, user, asset.group_name, asset.func_type, asset.namespace, "manage")
    if not FilePermissionService.is_admin(user) and asset.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "无权删除该文件")
    return await FileService.delete(db, asset_id)


# ============ 工具授权 -> 文件权限 联动（新增） ============
from app.services.tool_grant_service import ToolGrantService
from app.models.tool import Tool

@router.post("/tool-grants")
async def grant_tool_access(
    tool_id: str,
    level: str = "read",
    user_id: str | None = None,
    role_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """授予某用户/角色某工具（及其文件中心 namespace）的访问权限。仅管理员。"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admin can grant tool access")
    try:
        g = await ToolGrantService.grant(db, tool_id, user_id=user_id, role_id=role_id, level=level, granted_by=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "granted", "grant_id": g.id}

@router.post("/tool-grants/revoke")
async def revoke_tool_access(
    tool_id: str,
    user_id: str | None = None,
    role_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admin can revoke tool access")
    ok = await ToolGrantService.revoke(db, tool_id, user_id=user_id, role_id=role_id)
    return {"message": "revoked", "ok": ok}

@router.get("/tool-grants")
async def list_tool_grants(
    user_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """列出当前用户（或指定用户）通过工具授权可访问的工具/文件空间。"""
    target = user_id or current_user.id
    rows = await ToolGrantService.list_by_user(db, user_id=target)
    return rows
