from sqlalchemy import delete, select, or_
from app.models.tool import Tool
from app.models.tool_grant import ToolGrant
from app.models.user import User
from app.models.role import Role
from app.models.user_role import UserRole


class ToolGrantService:
    LEVELS = ('read', 'write', 'manage')
    @staticmethod
    async def grant(db, tool_id, user_id=None, role_id=None, level='read', granted_by=None):
        tool = await db.get(Tool, tool_id)
        if not tool:
            raise ValueError('工具不存在')
        if level not in ToolGrantService.LEVELS:
            raise ValueError('授权级别仅可为 read/write/manage')
        if bool(user_id) == bool(role_id):
            raise ValueError('必须且只能选择一个用户或角色')
        if not (tool.group_name and tool.func_type and tool.namespace):
            raise ValueError('工具缺少分组、功能型或 namespace，无法建立文件权限联动')
        if user_id and not await db.get(User, user_id):
            raise ValueError('用户不存在')
        if role_id and not await db.get(Role, role_id):
            raise ValueError('角色不存在')
        query = select(ToolGrant).where(ToolGrant.tool_id == tool_id)
        query = query.where(ToolGrant.user_id == user_id) if user_id else query.where(ToolGrant.role_id == role_id)
        item = (await db.execute(query)).scalar_one_or_none()
        if item:
            item.level = level
            item.granted_by = granted_by
        else:
            item = ToolGrant(tool_id=tool_id, user_id=user_id, role_id=role_id, level=level, granted_by=granted_by)
            db.add(item)
        # Once a tool is explicitly granted it stays restricted, even if the
        # final grant is later revoked.
        tool.is_public = False
        await db.commit(); await db.refresh(item); return item
    @staticmethod
    async def revoke(db, tool_id, user_id=None, role_id=None):
        if bool(user_id) == bool(role_id):
            raise ValueError('撤销时必须且只能指定一个用户或角色')
        query = delete(ToolGrant).where(ToolGrant.tool_id == tool_id)
        if user_id: query = query.where(ToolGrant.user_id == user_id)
        if role_id: query = query.where(ToolGrant.role_id == role_id)
        result = await db.execute(query); await db.commit(); return bool(result.rowcount)
    @staticmethod
    async def list_by_user(db, user_id=None, role_ids=None):
        query = select(ToolGrant, Tool).join(Tool, Tool.id == ToolGrant.tool_id)
        if user_id:
            roles = select(UserRole.role_id).where(UserRole.user_id == user_id)
            query = query.where(or_(ToolGrant.user_id == user_id, ToolGrant.role_id.in_(roles)))
        result = await db.execute(query)
        return [ToolGrantService._row(g, t) for g, t in result.all()]

    @staticmethod
    async def list_all(db):
        result = await db.execute(select(ToolGrant, Tool).join(Tool, Tool.id == ToolGrant.tool_id))
        rows = []
        for grant, tool in result.all():
            row = ToolGrantService._row(grant, tool)
            target = await db.get(User if grant.user_id else Role, grant.user_id or grant.role_id)
            row['target_name'] = getattr(target, 'username', None) or getattr(target, 'name', None) or '已删除对象'
            rows.append(row)
        return rows

    @staticmethod
    def _row(grant, tool):
        return {
            'grant_id': grant.id,
            'tool_id': tool.id,
            'tool_name': tool.name,
            'group_name': tool.group_name,
            'func_type': tool.func_type,
            'namespace': tool.namespace,
            'level': grant.level,
            'user_id': grant.user_id,
            'role_id': grant.role_id,
            'target_type': 'user' if grant.user_id else 'role',
        }
