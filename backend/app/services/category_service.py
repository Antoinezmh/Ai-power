from sqlalchemy import select
from app.models.category import Category
from app.repositories.base import BaseRepository


class CategoryService:
    @staticmethod
    async def list_all(db): return await BaseRepository(Category, db).list()
    @staticmethod
    async def create(db, data):
        values = data.model_dump() if hasattr(data, 'model_dump') else data.dict()
        return await BaseRepository(Category, db).create(**values)
    @staticmethod
    async def update(db, category_id, data):
        values = data.model_dump(exclude_unset=True) if hasattr(data, 'model_dump') else data.dict(exclude_unset=True)
        return await BaseRepository(Category, db).update(category_id, **values)
    @staticmethod
    async def delete(db, category_id): return await BaseRepository(Category, db).delete(category_id)
    @staticmethod
    async def get_tree(db):
        rows = await CategoryService.list_all(db); by_id = {x.id: x for x in rows}; roots = []
        for row in rows:
            if row.parent_id and row.parent_id in by_id:
                parent = by_id[row.parent_id]
                if not hasattr(parent, 'children'): parent.children = []
                parent.children.append(row)
            elif row.parent_id is None: roots.append(row)
        return roots
