import asyncio
import mimetypes
import os
import shutil
import uuid
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy import and_, false, func, or_, select, true

from app.core.config import settings
from app.core.file_center import FUNC_TYPES, GROUPS, is_valid_func_type, is_valid_group
from app.models.file_asset import FileAsset
from app.services.file_permission_service import FilePermissionService


class FileService:
    TEXT_EXTENSIONS = {".csv", ".json", ".txt", ".md", ".py", ".sql", ".log"}
    MAX_TEXT_PREVIEW_SIZE = 2 * 1024 * 1024

    @staticmethod
    def _root() -> Path:
        root = Path(settings.FILE_STORAGE_ROOT).resolve()
        root.mkdir(parents=True, exist_ok=True)
        return root

    @classmethod
    def _safe_path(cls, relative_path: str) -> Path:
        root = cls._root()
        path = (root / relative_path).resolve()
        if path != root and root not in path.parents:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "非法文件路径")
        return path

    @staticmethod
    def _validate(group: str, func_type: str, namespace: str) -> str:
        namespace = namespace.strip()
        if not is_valid_group(group) or not is_valid_func_type(func_type) or not namespace or "/" in namespace or "\\" in namespace or namespace in {".", ".."}:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "非法文件空间")
        return namespace

    @staticmethod
    def _validate_filename(filename: str) -> tuple[str, str]:
        clean = os.path.basename(filename).strip()
        if not clean or clean in {".", ".."}:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "非法文件名")
        extension = os.path.splitext(clean)[1].lower()
        if extension not in settings.ALLOWED_UPLOAD_EXTS:
            raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"不支持的文件类型：{extension or '无扩展名'}")
        return clean, extension

    @staticmethod
    async def _visibility_predicate(db, user):
        if FilePermissionService.is_admin(user):
            return true()
        grants = await FilePermissionService.list_user_grants(db, user.id)
        clauses = []
        for grant in grants:
            if grant.access_level not in {"read", "write", "manage"}:
                continue
            parts = []
            if grant.group_name is not None:
                parts.append(FileAsset.group_name == grant.group_name)
            if grant.func_type is not None:
                parts.append(FileAsset.func_type == grant.func_type)
            if grant.namespace is not None:
                parts.append(FileAsset.namespace == grant.namespace)
            clauses.append(and_(*parts) if parts else true())
        return or_(*clauses) if clauses else false()

    @classmethod
    async def divisions_for_user(cls, db, user):
        if FilePermissionService.is_admin(user):
            return [{"group_name": group, "func_types": FUNC_TYPES} for group in GROUPS]
        grants = await FilePermissionService.list_user_grants(db, user.id)
        return [{"group_name": group, "func_types": FUNC_TYPES} for group in GROUPS if any(item.group_name in (None, group) for item in grants)]

    @classmethod
    async def upload(cls, db, group, func_type, namespace, file, owner_id, tags=None):
        namespace = cls._validate(group, func_type, namespace)
        filename, extension = cls._validate_filename(file.filename or "")
        relative_path = os.path.join(group, func_type, namespace, filename)
        path = cls._safe_path(relative_path)
        if path.exists():
            raise HTTPException(status.HTTP_409_CONFLICT, "同一文件空间已存在同名文件")
        path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = path.with_name(f".{path.name}.{uuid.uuid4().hex}.uploading")

        def write_file() -> int:
            size = 0
            file.file.seek(0)
            try:
                with temp_path.open("xb") as output:
                    while chunk := file.file.read(1024 * 1024):
                        size += len(chunk)
                        if size > settings.MAX_UPLOAD_SIZE:
                            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "文件超过上传大小限制")
                        output.write(chunk)
                temp_path.replace(path)
                return size
            except Exception:
                temp_path.unlink(missing_ok=True)
                raise

        size = await asyncio.to_thread(write_file)
        asset = FileAsset(group_name=group, func_type=func_type, namespace=namespace, filename=filename, ext=extension, size=size, mime=file.content_type or mimetypes.guess_type(filename)[0], storage_path=relative_path, tags=tags or [], owner_id=owner_id)
        try:
            db.add(asset)
            await db.commit()
            await db.refresh(asset)
        except Exception:
            await db.rollback()
            await asyncio.to_thread(path.unlink, missing_ok=True)
            raise
        return asset

    @classmethod
    async def init_chunk(cls, group, func_type, namespace, filename, size=None):
        cls._validate(group, func_type, namespace)
        cls._validate_filename(filename)
        if size is not None and size > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "文件超过上传大小限制")
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "分片上传尚未启用，请使用普通上传")

    @staticmethod
    async def save_chunk(upload_id, index, file):
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "分片上传尚未启用")

    @staticmethod
    async def complete_chunk(*args, **kwargs):
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "分片上传尚未启用")

    @classmethod
    async def _filtered_query(cls, db, user, group=None, func_type=None, namespace=None, keyword=None, archived=None):
        query = select(FileAsset).where(await cls._visibility_predicate(db, user))
        for field, value in {"group_name": group, "func_type": func_type, "namespace": namespace}.items():
            if value:
                query = query.where(getattr(FileAsset, field) == value)
        if keyword:
            query = query.where(FileAsset.filename.ilike(f"%{keyword}%"))
        if archived is not None:
            query = query.where(FileAsset.is_archived == archived)
        return query

    @classmethod
    async def list_files(cls, db, user, group=None, func_type=None, namespace=None, keyword=None, archived=None, page=1, page_size=50):
        query = await cls._filtered_query(db, user, group, func_type, namespace, keyword, archived)
        total = await db.scalar(select(func.count()).select_from(query.subquery()))
        result = await db.execute(query.order_by(FileAsset.created_at.desc()).offset((page - 1) * page_size).limit(page_size))
        return list(result.scalars().all()), int(total or 0)

    @classmethod
    async def get_tree(cls, db, user, group=None, func_type=None, namespace=None):
        query = await cls._filtered_query(db, user, group, func_type, namespace)
        rows = list((await db.execute(query.order_by(FileAsset.group_name, FileAsset.func_type, FileAsset.namespace, FileAsset.filename))).scalars().all())
        groups: dict[str, dict[str, dict[str, list[FileAsset]]]] = {}
        for asset in rows:
            groups.setdefault(asset.group_name, {}).setdefault(asset.func_type, {}).setdefault(asset.namespace, []).append(asset)
        return [{"group": group_name, "func_types": [{"func_type": func_name, "tools": [{"namespace": tool_name, "file_count": len(files), "files": [{"id": item.id, "filename": item.filename, "size": item.size or 0, "mime": item.mime, "ext": item.ext, "storage_path": item.storage_path, "is_archived": bool(item.is_archived), "created_at": item.created_at} for item in files]} for tool_name, files in tools.items()]} for func_name, tools in functions.items()]} for group_name, functions in groups.items()]

    @classmethod
    async def download_meta(cls, db, asset_id):
        asset = await db.get(FileAsset, asset_id)
        if not asset:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "文件不存在")
        path = cls._safe_path(asset.storage_path)
        if not path.is_file():
            raise HTTPException(status.HTTP_410_GONE, "文件记录存在，但物理文件已丢失")
        return asset, path

    @classmethod
    async def content(cls, db, asset_id):
        asset, path = await cls.download_meta(db, asset_id)
        if (asset.ext or "").lower() not in cls.TEXT_EXTENSIONS:
            raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "该文件类型不支持文本预览")
        if path.stat().st_size > cls.MAX_TEXT_PREVIEW_SIZE:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "文件过大，无法在线预览")
        try:
            return await asyncio.to_thread(path.read_text, encoding="utf-8")
        except UnicodeDecodeError as exc:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "文件不是有效的 UTF-8 文本") from exc

    @classmethod
    async def move(cls, db, asset_id, new_group=None, new_func_type=None, new_namespace=None, new_filename=None, new_tags=None, new_archived=None):
        asset = await db.get(FileAsset, asset_id)
        if not asset:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "文件不存在")
        target_group = new_group or asset.group_name
        target_func = new_func_type or asset.func_type
        target_namespace = cls._validate(target_group, target_func, new_namespace or asset.namespace)
        target_filename, target_ext = cls._validate_filename(new_filename or asset.filename)
        old_path = cls._safe_path(asset.storage_path)
        new_relative = os.path.join(target_group, target_func, target_namespace, target_filename)
        new_path = cls._safe_path(new_relative)
        moved = old_path != new_path
        if moved:
            if not old_path.is_file():
                raise HTTPException(status.HTTP_410_GONE, "原物理文件已丢失")
            if new_path.exists():
                raise HTTPException(status.HTTP_409_CONFLICT, "目标位置已存在同名文件")
            new_path.parent.mkdir(parents=True, exist_ok=True)
            await asyncio.to_thread(shutil.move, str(old_path), str(new_path))
        asset.group_name = target_group
        asset.func_type = target_func
        asset.namespace = target_namespace
        asset.filename = target_filename
        asset.ext = target_ext
        asset.storage_path = new_relative
        if new_tags is not None:
            asset.tags = new_tags
        if new_archived is not None:
            asset.is_archived = new_archived
        try:
            await db.commit()
            await db.refresh(asset)
        except Exception:
            await db.rollback()
            if moved and new_path.exists():
                old_path.parent.mkdir(parents=True, exist_ok=True)
                await asyncio.to_thread(shutil.move, str(new_path), str(old_path))
            raise
        return asset

    @classmethod
    async def delete(cls, db, asset_id):
        asset = await db.get(FileAsset, asset_id)
        if not asset:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "文件不存在")
        path = cls._safe_path(asset.storage_path)
        trash_path = cls._root() / ".trash" / f"{asset.id}-{asset.filename}"
        moved_to_trash = False
        if path.exists():
            trash_path.parent.mkdir(parents=True, exist_ok=True)
            await asyncio.to_thread(shutil.move, str(path), str(trash_path))
            moved_to_trash = True
        try:
            await db.delete(asset)
            await db.commit()
        except Exception:
            await db.rollback()
            if moved_to_trash and trash_path.exists():
                path.parent.mkdir(parents=True, exist_ok=True)
                await asyncio.to_thread(shutil.move, str(trash_path), str(path))
            raise
        if moved_to_trash:
            await asyncio.to_thread(trash_path.unlink, missing_ok=True)
        return {"success": True, "message": "已删除"}
