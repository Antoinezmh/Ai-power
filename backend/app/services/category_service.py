from sqlalchemy import select
from app.models.category import Category
from app.repositories.base import BaseRepository
from sqlalchemy.exc import IntegrityError


class CategoryService:
    @staticmethod
    async def list_all(db): return await BaseRepository(Category, db).list()
    @staticmethod
    async def create(db, data):
        values = data.model_dump() if hasattr(data, 'model_dump') else data.dict()
        if values.get('parent_id') and not await db.get(Category, values['parent_id']):
            raise ValueError('父分类不存在')
        try:
            return await BaseRepository(Category, db).create(**values)
        except IntegrityError as exc:
            await db.rollback()
            raise ValueError('分类名称已存在') from exc
    @staticmethod
    async def update(db, category_id, data):
        values = data.model_dump(exclude_unset=True) if hasattr(data, 'model_dump') else data.dict(exclude_unset=True)
        category = await db.get(Category, category_id)
        if not category:
            return None
        if 'parent_id' in values and values['parent_id']:
            parent_id = values['parent_id']
            if parent_id == category_id:
                raise ValueError('分类不能作为自己的父分类')
            parent = await db.get(Category, parent_id)
            if not parent:
                raise ValueError('父分类不存在')
            seen = set()
            while parent and parent.id not in seen:
                if parent.id == category_id:
                    raise ValueError('父子分类不能形成循环')
                seen.add(parent.id)
                parent = await db.get(Category, parent.parent_id) if parent.parent_id else None
        try:
            return await BaseRepository(Category, db).update(category_id, **values)
        except IntegrityError as exc:
            await db.rollback()
            raise ValueError('分类名称已存在') from exc
    @staticmethod
    async def delete(db, category_id): return await BaseRepository(Category, db).delete(category_id)
    @staticmethod
    async def get_tree(db):
        rows = await CategoryService.list_all(db); by_id = {x.id: x for x in rows}; roots = []
        for row in rows:
            row.children = []
        for row in rows:
            if row.parent_id and row.parent_id in by_id:
                parent = by_id[row.parent_id]
                parent.children.append(row)
            else:
                roots.append(row)
        return roots
