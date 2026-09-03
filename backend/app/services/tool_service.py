import json
from typing import Any, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.tool import Tool
from app.repositories.tool_repo import ToolRepository


class ToolService:
    @staticmethod
    async def list_tools(db: AsyncSession, skip=0, limit=100, category_id=None, search=None, group_name=None, func_type=None, namespace=None):
        query = select(Tool).where(Tool.is_active.is_(True))
        for field, value in {'category_id': category_id, 'group_name': group_name, 'func_type': func_type, 'namespace': namespace}.items():
            if value:
                query = query.where(getattr(Tool, field) == value)
        if search:
            term = f'%{search}%'
            query = query.where((Tool.name.ilike(term)) | (Tool.description.ilike(term)))
        result = await db.execute(query.order_by(Tool.usage_count.desc()).offset(skip).limit(limit))
        return list(result.scalars().all())

    @staticmethod
    async def get_tool(db, tool_id): return await ToolRepository(db).get(tool_id)

    @staticmethod
    async def create_tool(db, data):
        values = data.model_dump() if hasattr(data, 'model_dump') else data.dict()
        values['tags'] = json.dumps(values['tags']) if isinstance(values.get('tags'), list) else values.get('tags')
        return await ToolRepository(db).create(**values)

    @staticmethod
    async def update_tool(db, tool_id, update_data):
        if isinstance(update_data.get('tags'), list): update_data['tags'] = json.dumps(update_data['tags'])
        return await ToolRepository(db).update(tool_id, **update_data)

    @staticmethod
    async def delete_tool(db, tool_id): return await ToolRepository(db).delete(tool_id)

    @staticmethod
    async def increment_usage(db, tool_id):
        tool = await ToolRepository(db).get(tool_id)
        if not tool: return None
        tool.usage_count = (tool.usage_count or 0) + 1
        await db.commit(); await db.refresh(tool)
        return tool
