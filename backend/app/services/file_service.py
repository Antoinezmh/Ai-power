import asyncio, mimetypes, os, uuid
from sqlalchemy import func, select
from fastapi import HTTPException, status
from app.core.config import settings
from app.core.file_center import GROUPS, FUNC_TYPES, is_valid_group, is_valid_func_type
from app.models.file_asset import FileAsset
from app.services.file_permission_service import FilePermissionService


class FileService:
    @staticmethod
    def _root(): return settings.FILE_STORAGE_ROOT
    @staticmethod
    def _validate(group, func_type, namespace):
        if not is_valid_group(group) or not is_valid_func_type(func_type) or not namespace or '/' in namespace or '\\' in namespace:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, '非法文件空间')
        return namespace.strip()
    @classmethod
    async def divisions_for_user(cls, db, user):
        if FilePermissionService.is_admin(user): return [{'group_name': g, 'func_types': FUNC_TYPES} for g in GROUPS]
        grants = await FilePermissionService.list_user_grants(db, user.id)
        return [{'group_name': g, 'func_types': FUNC_TYPES} for g in GROUPS if any(x.group_name in (None, g) for x in grants)]
    @classmethod
    async def upload(cls, db, group, func_type, namespace, file, owner_id, tags=None):
        namespace = cls._validate(group, func_type, namespace); filename = os.path.basename(file.filename or 'file')
        directory = os.path.join(cls._root(), group, func_type, namespace); await asyncio.to_thread(os.makedirs, directory, exist_ok=True)
        path = os.path.join(directory, filename); await asyncio.to_thread(lambda: file.file.seek(0))
        size = 0
        def write():
            nonlocal size
            with open(path, 'wb') as output:
                while chunk := file.file.read(1024 * 1024): size += len(chunk); output.write(chunk)
        await asyncio.to_thread(write)
        asset = FileAsset(group_name=group, func_type=func_type, namespace=namespace, filename=filename, ext=os.path.splitext(filename)[1].lower(), size=size, mime=file.content_type or mimetypes.guess_type(filename)[0], storage_path=os.path.join(group, func_type, namespace, filename), tags=tags or [], owner_id=owner_id)
        db.add(asset); await db.commit(); await db.refresh(asset); return asset
    @classmethod
    async def init_chunk(cls, group, func_type, namespace, filename, size=None): return {'upload_id': uuid.uuid4().hex, 'filename': os.path.basename(filename), 'group_name': group, 'func_type': func_type, 'namespace': namespace}
    @classmethod
    async def save_chunk(cls, upload_id, index, file): return {'upload_id': upload_id, 'index': index, 'size': 0}
    @classmethod
    async def complete_chunk(cls, *args, **kwargs): raise HTTPException(501, '分片上传服务尚未启用')
    @classmethod
    async def list_files(cls, db, user, group=None, func_type=None, namespace=None, keyword=None, archived=None, page=1, page_size=50):
        query = select(FileAsset)
        for field, value in {'group_name': group, 'func_type': func_type, 'namespace': namespace}.items():
            if value: query = query.where(getattr(FileAsset, field) == value)
        if keyword: query = query.where(FileAsset.filename.ilike(f'%{keyword}%'))
        if archived is not None: query = query.where(FileAsset.is_archived == archived)
        result = await db.execute(query.offset((page - 1) * page_size).limit(page_size)); rows = list(result.scalars().all())
        total = await db.scalar(select(func.count()).select_from(query.subquery()))
        return rows, int(total or 0)
    @classmethod
    async def get_tree(cls, db, user, group=None, func_type=None, namespace=None): return []
    @classmethod
    async def download_meta(cls, db, asset_id):
        asset = await db.get(FileAsset, asset_id)
        if not asset: raise HTTPException(404, '文件不存在')
        path = os.path.join(cls._root(), asset.storage_path); return asset, path
    @classmethod
    async def content(cls, db, asset_id):
        asset, path = await cls.download_meta(db, asset_id)
        return await asyncio.to_thread(lambda: open(path, encoding='utf-8').read())
    @classmethod
    async def move(cls, db, asset_id, new_group=None, new_func_type=None, new_namespace=None, new_filename=None, new_tags=None, new_archived=None):
        asset = await db.get(FileAsset, asset_id)
        if not asset: raise HTTPException(404, '文件不存在')
        for field, value in {'group_name': new_group, 'func_type': new_func_type, 'namespace': new_namespace, 'filename': new_filename, 'tags': new_tags, 'is_archived': new_archived}.items():
            if value is not None: setattr(asset, field, value)
        await db.commit(); await db.refresh(asset); return asset
    @classmethod
    async def delete(cls, db, asset_id):
        asset = await db.get(FileAsset, asset_id)
        if not asset: raise HTTPException(404, '文件不存在')
        await db.delete(asset); await db.commit(); return {'success': True, 'message': '已删除'}
