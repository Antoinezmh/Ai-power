from sqlalchemy import delete, select
from app.models.tool import Tool
from app.models.tool_grant import ToolGrant


class ToolGrantService:
    LEVELS = ('read', 'write', 'manage')
    @staticmethod
    async def grant(db, tool_id, user_id=None, role_id=None, level='read', granted_by=None):
        tool = await db.get(Tool, tool_id)
        if not tool or level not in ToolGrantService.LEVELS or not (user_id or role_id): raise ValueError('invalid grant')
        item = ToolGrant(tool_id=tool_id, user_id=user_id, role_id=role_id, level=level, granted_by=granted_by); db.add(item); await db.commit(); await db.refresh(item); return item
    @staticmethod
    async def revoke(db, tool_id, user_id=None, role_id=None):
        query = delete(ToolGrant).where(ToolGrant.tool_id == tool_id)
        if user_id: query = query.where(ToolGrant.user_id == user_id)
        if role_id: query = query.where(ToolGrant.role_id == role_id)
        await db.execute(query); await db.commit(); return True
    @staticmethod
    async def list_by_user(db, user_id=None, role_ids=None):
        query = select(ToolGrant, Tool).join(Tool, Tool.id == ToolGrant.tool_id)
        if user_id: query = query.where(ToolGrant.user_id == user_id)
        result = await db.execute(query)
        return [{'tool_id': t.id, 'tool_name': t.name, 'group_name': t.group_name, 'func_type': t.func_type, 'namespace': t.namespace or t.name, 'level': g.level} for g, t in result.all()]
