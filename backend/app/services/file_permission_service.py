from sqlalchemy import select
from app.models.file_permission import FilePermission
from app.models.tool_grant import ToolGrant
from app.models.tool import Tool
from app.models.user_role import UserRole
from app.models.role_permission import RolePermission
from app.models.permission import Permission
from app.models.user import User
from app.core.file_center import is_valid_func_type, is_valid_group
from types import SimpleNamespace
import re


class FilePermissionService:
    @staticmethod
    async def is_admin(db, user):
        if getattr(user, 'is_superuser', False):
            return True
        result = await db.scalar(
            select(RolePermission.role_id)
            .join(Permission, Permission.id == RolePermission.permission_id)
            .join(UserRole, UserRole.role_id == RolePermission.role_id)
            .where(
                UserRole.user_id == user.id,
                Permission.code == 'button:permissions:manageUsers',
            )
            .limit(1)
        )
        return result is not None
    @staticmethod
    async def can(db, user, group, func_type, namespace, level='read'):
        if await FilePermissionService.is_admin(db, user): return True
        order = {'read': 1, 'write': 2, 'manage': 3}
        for item in await FilePermissionService.list_effective_grants(db, user.id):
            matches = all(value is None or value == target for value, target in ((item.group_name, group), (item.func_type, func_type), (item.namespace, namespace)))
            if matches and order.get(item.access_level, 0) >= order.get(level, 1): return True
        return False
    @staticmethod
    async def list_user_grants(db, user_id):
        result = await db.execute(select(FilePermission).where(FilePermission.user_id == user_id)); return list(result.scalars().all())
    @staticmethod
    async def list_effective_grants(db, user_id):
        """Combine manual file grants with direct and role-based tool grants."""
        direct = await FilePermissionService.list_user_grants(db, user_id)
        role_ids = select(UserRole.role_id).where(UserRole.user_id == user_id)
        query = (
            select(ToolGrant, Tool)
            .join(Tool, Tool.id == ToolGrant.tool_id)
            .where((ToolGrant.user_id == user_id) | (ToolGrant.role_id.in_(role_ids)))
        )
        rows = (await db.execute(query)).all()
        derived = [
            SimpleNamespace(
                id=f"tool:{grant.id}",
                group_name=tool.group_name,
                func_type=tool.func_type,
                namespace=tool.namespace,
                access_level=grant.level,
            )
            for grant, tool in rows
            if tool.group_name and tool.func_type and tool.namespace
        ]
        return [*direct, *derived]
    @staticmethod
    async def grant(db, user_id, group_name=None, func_type=None, namespace=None, access_level='read'):
        if not await db.get(User, user_id):
            raise ValueError('用户不存在')
        if group_name is not None and not is_valid_group(group_name):
            raise ValueError('研发分组不存在')
        if func_type is not None and not is_valid_func_type(func_type):
            raise ValueError('功能型不存在')
        if namespace is not None and not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,49}', namespace):
            raise ValueError('namespace 只能包含小写字母、数字和连字符，长度为 1-50')
        if access_level not in {'read', 'write', 'manage'}:
            raise ValueError('授权级别仅可为 read/write/manage')
        item = FilePermission(user_id=user_id, group_name=group_name, func_type=func_type, namespace=namespace, access_level=access_level)
        db.add(item); await db.commit(); await db.refresh(item); return item
    @staticmethod
    async def user_scope_view(db, user, groups, func_types):
        """返回文件中心前端使用的层级权限结构。

        前端需要按 group -> func_type -> namespace 判断权限，不能只返回
        分组/功能型字符串列表，否则 scopes 加载完成后会在渲染阶段崩溃。
        """
        is_admin = await FilePermissionService.is_admin(db, user)
        grants = [] if is_admin else await FilePermissionService.list_effective_grants(db, user.id)
        rank = {'read': 1, 'write': 2, 'manage': 3}

        def strongest(items):
            if not items:
                return 'read'
            return max(items, key=lambda value: rank.get(value, 0))

        if is_admin:
            return {
                'is_admin': True,
                'groups': [
                    {
                        'group_name': group,
                        'access_level': 'manage',
                        'func_types': [
                            {'func_type': func, 'access_level': 'manage', 'tools': None}
                            for func in func_types
                        ],
                    }
                    for group in groups
                ],
            }

        result = []
        for group in groups:
            group_grants = [g for g in grants if g.group_name in (None, group)]
            if not group_grants:
                continue
            group_level = strongest([g.access_level for g in group_grants])
            func_nodes = []
            for func in func_types:
                func_grants = [g for g in group_grants if g.func_type in (None, func)]
                if not func_grants:
                    continue
                func_level = strongest([g.access_level for g in func_grants])
                tool_grants = [g for g in func_grants if g.namespace]
                func_nodes.append({
                    'func_type': func,
                    'access_level': func_level,
                    'tools': [
                        {'namespace': g.namespace, 'access_level': g.access_level}
                        for g in tool_grants
                    ] or None,
                })
            result.append({'group_name': group, 'access_level': group_level, 'func_types': func_nodes})
        return {'is_admin': False, 'groups': result}
