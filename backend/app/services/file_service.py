import asyncio
import json
import math
import mimetypes
import os
import re
import shutil
import time
import uuid
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy import and_, false, func, or_, select, true
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.file_center import FUNC_TYPES, GROUPS, is_valid_func_type, is_valid_group
from app.models.file_asset import FileAsset
from app.services.file_permission_service import FilePermissionService


class FileService:
    TEXT_EXTENSIONS = {".csv", ".json", ".txt", ".md", ".py", ".sql", ".log"}
    MAX_TEXT_PREVIEW_SIZE = 2 * 1024 * 1024
    _capacity_lock = asyncio.Lock()
    _inflight_bytes: dict[str, int] = {}

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

    @classmethod
    def _chunk_root(cls) -> Path:
        root = cls._root() / ".uploads"
        root.mkdir(parents=True, exist_ok=True)
        return root

    @classmethod
    def _chunk_dir(cls, upload_id: str) -> Path:
        try:
            normalized = uuid.UUID(upload_id).hex
        except (ValueError, AttributeError) as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "非法上传 ID") from exc
        return cls._chunk_root() / normalized

    @classmethod
    def _active_chunk_bytes(cls) -> int:
        total = 0
        for meta_path in cls._chunk_root().glob("*/meta.json"):
            try:
                total += max(0, int(json.loads(meta_path.read_text(encoding="utf-8")).get("size") or 0))
            except (OSError, ValueError, TypeError, json.JSONDecodeError):
                continue
        return total

    @classmethod
    async def _logical_usage(cls, db) -> int:
        total = await db.scalar(select(func.coalesce(func.sum(FileAsset.size), 0)))
        return int(total or 0)

    @classmethod
    async def _ensure_capacity(cls, db, incoming: int) -> None:
        incoming = max(0, incoming)
        logical = await cls._logical_usage(db)
        pending = sum(cls._inflight_bytes.values()) + await asyncio.to_thread(cls._active_chunk_bytes)
        quota = settings.FILE_STORAGE_QUOTA_BYTES
        if quota and logical + pending + incoming > quota:
            raise HTTPException(status.HTTP_507_INSUFFICIENT_STORAGE, "文件中心容量不足，请清理文件或提高存储配额")
        free = (await asyncio.to_thread(shutil.disk_usage, cls._root())).free
        if free - incoming < settings.FILE_STORAGE_MIN_FREE_BYTES:
            raise HTTPException(status.HTTP_507_INSUFFICIENT_STORAGE, "服务器磁盘剩余空间不足")

    @classmethod
    def _read_chunk_meta(cls, upload_id: str, owner_id: str | None = None) -> tuple[Path, dict]:
        upload_dir = cls._chunk_dir(upload_id)
        meta_path = upload_dir / "meta.json"
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except (OSError, ValueError, TypeError, json.JSONDecodeError) as exc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "分片上传任务不存在或已过期") from exc
        if owner_id is not None and meta.get("owner_id") != owner_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "无权访问该上传任务")
        return upload_dir, meta

    @classmethod
    def _cleanup_stale_chunks(cls) -> None:
        cutoff = time.time() - 24 * 60 * 60
        for entry in cls._chunk_root().iterdir():
            try:
                if entry.is_dir() and entry.stat().st_mtime < cutoff:
                    shutil.rmtree(entry)
            except OSError:
                continue

    @staticmethod
    def _validate(group: str, func_type: str, namespace: str) -> str:
        namespace = namespace.strip()
        if (
            not is_valid_group(group)
            or not is_valid_func_type(func_type)
            or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,49}", namespace)
        ):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "非法文件空间")
        return namespace

    @staticmethod
    def _validate_filename(filename: str) -> tuple[str, str]:
        if not filename or len(filename) > 255 or re.search(r'[\x00-\x1f<>:"/\\|?*]', filename):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "非法文件名")
        clean = os.path.basename(filename).strip()
        if not clean or clean in {".", ".."}:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "非法文件名")
        extension = os.path.splitext(clean)[1].lower()
        if extension not in settings.ALLOWED_UPLOAD_EXTS:
            raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"不支持的文件类型：{extension or '无扩展名'}")
        return clean, extension

    @staticmethod
    def _validate_tags(tags) -> list[str]:
        if not tags:
            return []
        cleaned = list(dict.fromkeys(str(tag).strip() for tag in tags))
        if len(cleaned) > 20 or any(not tag or len(tag) > 50 for tag in cleaned):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "标签最多 20 个，每个 1-50 个字符")
        return cleaned

    @staticmethod
    async def _visibility_predicate(db, user):
        if await FilePermissionService.is_admin(db, user):
            return true()
        grants = await FilePermissionService.list_effective_grants(db, user.id)
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
        if await FilePermissionService.is_admin(db, user):
            return [{"group_name": group, "func_types": FUNC_TYPES} for group in GROUPS]
        grants = await FilePermissionService.list_effective_grants(db, user.id)
        return [{"group_name": group, "func_types": FUNC_TYPES} for group in GROUPS if any(item.group_name in (None, group) for item in grants)]

    @classmethod
    async def upload(cls, db, group, func_type, namespace, file, owner_id, tags=None):
        namespace = cls._validate(group, func_type, namespace)
        filename, extension = cls._validate_filename(file.filename or "")
        tag_values = cls._validate_tags(tags)
        relative_path = os.path.join(group, func_type, namespace, filename)
        path = cls._safe_path(relative_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        expected_size = int(file.size or 0)
        reservation_id = uuid.uuid4().hex

        async with cls._capacity_lock:
            await cls._ensure_capacity(db, expected_size or settings.MAX_UPLOAD_SIZE)
            cls._inflight_bytes[reservation_id] = expected_size or settings.MAX_UPLOAD_SIZE

        def write_file() -> int:
            size = 0
            file.file.seek(0)
            try:
                # xb 原子占位；并发上传同名文件时只有一个请求能成功。
                with path.open("xb") as output:
                    while chunk := file.file.read(1024 * 1024):
                        size += len(chunk)
                        if size > settings.MAX_UPLOAD_SIZE:
                            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "文件超过上传大小限制")
                        if expected_size and size > expected_size:
                            raise HTTPException(status.HTTP_400_BAD_REQUEST, "上传内容超过声明大小")
                        output.write(chunk)
                return size
            except FileExistsError as exc:
                raise HTTPException(status.HTTP_409_CONFLICT, "同一文件空间已存在同名文件") from exc
            except Exception:
                path.unlink(missing_ok=True)
                raise

        try:
            size = await asyncio.to_thread(write_file)
        finally:
            async with cls._capacity_lock:
                cls._inflight_bytes.pop(reservation_id, None)
        asset = FileAsset(group_name=group, func_type=func_type, namespace=namespace, filename=filename, ext=extension, size=size, mime=file.content_type or mimetypes.guess_type(filename)[0], storage_path=relative_path, tags=tag_values, owner_id=owner_id)
        try:
            db.add(asset)
            await db.commit()
            await db.refresh(asset)
        except IntegrityError as exc:
            await db.rollback()
            await asyncio.to_thread(path.unlink, missing_ok=True)
            raise HTTPException(status.HTTP_409_CONFLICT, "同一文件空间已存在同名文件") from exc
        except Exception:
            await db.rollback()
            await asyncio.to_thread(path.unlink, missing_ok=True)
            raise
        return asset

    @classmethod
    async def init_chunk(cls, db, group, func_type, namespace, filename, owner_id, size=None):
        namespace = cls._validate(group, func_type, namespace)
        clean_name, _ = cls._validate_filename(filename)
        expected_size = int(size or 0)
        if expected_size <= 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "分片上传必须提供有效文件大小")
        if expected_size > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "文件超过上传大小限制")
        target = cls._safe_path(os.path.join(group, func_type, namespace, clean_name))
        if target.exists():
            raise HTTPException(status.HTTP_409_CONFLICT, "同一文件空间已存在同名文件")
        async with cls._capacity_lock:
            await asyncio.to_thread(cls._cleanup_stale_chunks)
            await cls._ensure_capacity(db, expected_size)
            upload_id = str(uuid.uuid4())
            upload_dir = cls._chunk_dir(upload_id)
            upload_dir.mkdir(parents=False, exist_ok=False)
            meta = {
                "owner_id": owner_id,
                "group": group,
                "func_type": func_type,
                "namespace": namespace,
                "filename": clean_name,
                "size": expected_size,
                "chunk_size": settings.CHUNK_UPLOAD_SIZE,
                "created_at": int(time.time()),
            }
            (upload_dir / "meta.json").write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
        return {"upload_id": upload_id, "chunk_size": settings.CHUNK_UPLOAD_SIZE}

    @classmethod
    async def save_chunk(cls, upload_id, index, file, owner_id):
        upload_dir, meta = cls._read_chunk_meta(upload_id, owner_id)
        expected_parts = max(1, math.ceil(meta["size"] / meta["chunk_size"]))
        if index < 0 or index >= expected_parts:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "分片序号超出范围")
        max_part_size = meta["chunk_size"] if index < expected_parts - 1 else meta["size"] - index * meta["chunk_size"]
        temp_path = upload_dir / f".{index}.{uuid.uuid4().hex}.uploading"
        part_path = upload_dir / f"{index}.part"

        def write_part() -> int:
            written = 0
            file.file.seek(0)
            try:
                with temp_path.open("xb") as output:
                    while chunk := file.file.read(1024 * 1024):
                        written += len(chunk)
                        if written > max_part_size:
                            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "分片超过允许大小")
                        output.write(chunk)
                if written != max_part_size:
                    raise HTTPException(status.HTTP_400_BAD_REQUEST, "分片大小不正确")
                temp_path.replace(part_path)
                os.utime(upload_dir, None)
                return written
            except Exception:
                temp_path.unlink(missing_ok=True)
                raise

        written = await asyncio.to_thread(write_part)
        return {"upload_id": upload_id, "index": index, "size": written}

    @classmethod
    async def complete_chunk(cls, db, upload_id, owner_id, group, func_type, namespace, filename, tags=None):
        upload_dir, meta = cls._read_chunk_meta(upload_id, owner_id)
        namespace = cls._validate(group, func_type, namespace)
        clean_name, extension = cls._validate_filename(filename)
        tag_values = cls._validate_tags(tags)
        if (group, func_type, namespace, clean_name) != (
            meta["group"], meta["func_type"], meta["namespace"], meta["filename"]
        ):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "完成参数与初始化任务不一致")

        part_count = max(1, math.ceil(meta["size"] / meta["chunk_size"]))
        parts = [upload_dir / f"{index}.part" for index in range(part_count)]
        if any(not part.is_file() for part in parts):
            raise HTTPException(status.HTTP_409_CONFLICT, "分片尚未全部上传")
        if sum(part.stat().st_size for part in parts) != meta["size"]:
            raise HTTPException(status.HTTP_409_CONFLICT, "分片总大小与原文件不一致")

        relative_path = os.path.join(group, func_type, namespace, clean_name)
        path = cls._safe_path(relative_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        free = (await asyncio.to_thread(shutil.disk_usage, cls._root())).free
        if free - meta["size"] < settings.FILE_STORAGE_MIN_FREE_BYTES:
            raise HTTPException(status.HTTP_507_INSUFFICIENT_STORAGE, "服务器磁盘剩余空间不足")

        def merge_parts() -> None:
            try:
                with path.open("xb") as output:
                    for part in parts:
                        with part.open("rb") as source:
                            shutil.copyfileobj(source, output, 1024 * 1024)
            except FileExistsError as exc:
                raise HTTPException(status.HTTP_409_CONFLICT, "同一文件空间已存在同名文件") from exc
            except Exception:
                path.unlink(missing_ok=True)
                raise

        await asyncio.to_thread(merge_parts)
        asset = FileAsset(
            group_name=group, func_type=func_type, namespace=namespace,
            filename=clean_name, ext=extension, size=meta["size"],
            mime=mimetypes.guess_type(clean_name)[0], storage_path=relative_path,
            tags=tag_values, owner_id=owner_id,
        )
        try:
            db.add(asset)
            await db.commit()
            await db.refresh(asset)
        except IntegrityError as exc:
            await db.rollback()
            await asyncio.to_thread(path.unlink, missing_ok=True)
            raise HTTPException(status.HTTP_409_CONFLICT, "同一文件空间已存在同名文件") from exc
        except Exception:
            await db.rollback()
            await asyncio.to_thread(path.unlink, missing_ok=True)
            raise
        await asyncio.to_thread(shutil.rmtree, upload_dir, True)
        return asset

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
        filtered = query.subquery()
        aggregate = (
            select(
                filtered.c.group_name,
                filtered.c.func_type,
                filtered.c.namespace,
                func.count().label("file_count"),
            )
            .group_by(filtered.c.group_name, filtered.c.func_type, filtered.c.namespace)
            .order_by(filtered.c.group_name, filtered.c.func_type, filtered.c.namespace)
        )
        rows = (await db.execute(aggregate)).all()
        groups: dict[str, dict[str, list[dict]]] = {}
        for row in rows:
            groups.setdefault(row.group_name, {}).setdefault(row.func_type, []).append({
                "namespace": row.namespace,
                "file_count": int(row.file_count),
                "files": [],
            })
        return [
            {"group": group_name, "func_types": [
                {"func_type": func_name, "tools": tools}
                for func_name, tools in functions.items()
            ]}
            for group_name, functions in groups.items()
        ]

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
        tag_values = cls._validate_tags(new_tags) if new_tags is not None else None
        old_path = cls._safe_path(asset.storage_path)
        new_relative = os.path.join(target_group, target_func, target_namespace, target_filename)
        new_path = cls._safe_path(new_relative)
        moved = old_path != new_path
        if moved:
            if not old_path.is_file():
                raise HTTPException(status.HTTP_410_GONE, "原物理文件已丢失")
            new_path.parent.mkdir(parents=True, exist_ok=True)

            def move_without_overwrite() -> None:
                try:
                    os.link(old_path, new_path)
                    old_path.unlink()
                except FileExistsError as exc:
                    raise HTTPException(status.HTTP_409_CONFLICT, "目标位置已存在同名文件") from exc

            await asyncio.to_thread(move_without_overwrite)
        asset.group_name = target_group
        asset.func_type = target_func
        asset.namespace = target_namespace
        asset.filename = target_filename
        asset.ext = target_ext
        asset.storage_path = new_relative
        if new_tags is not None:
            asset.tags = tag_values
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
