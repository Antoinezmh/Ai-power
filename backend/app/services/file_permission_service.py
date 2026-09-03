from sqlalchemy import select
from app.models.file_permission import FilePermission


class FilePermissionService:
    @staticmethod
    def is_admin(user): return bool(getattr(user, 'is_superuser', False))
    @staticmethod
    async def can(db, user, group, func_type, namespace, level='read'):
        if FilePermissionService.is_admin(user): return True
        order = {'read': 1, 'write': 2, 'manage': 3}
        result = await db.execute(select(FilePermission).where(FilePermission.user_id == user.id))
        for item in result.scalars().all():
            matches = all(value is None or value == target for value, target in ((item.group_name, group), (item.func_type, func_type), (item.namespace, namespace)))
            if matches and order.get(item.access_level, 0) >= order.get(level, 1): return True
        return False
    @staticmethod
    async def list_user_grants(db, user_id):
        result = await db.execute(select(FilePermission).where(FilePermission.user_id == user_id)); return list(result.scalars().all())
    @staticmethod
    async def grant(db, user_id, group_name=None, func_type=None, namespace=None, access_level='read'):
        item = FilePermission(user_id=user_id, group_name=group_name, func_type=func_type, namespace=namespace, access_level=access_level)
        db.add(item); await db.commit(); await db.refresh(item); return item
    @staticmethod
    async def user_scope_view(db, user, groups, func_types):
        """返回文件中心前端使用的层级权限结构。

        前端需要按 group -> func_type -> namespace 判断权限，不能只返回
        分组/功能型字符串列表，否则 scopes 加载完成后会在渲染阶段崩溃。
        """
        is_admin = FilePermissionService.is_admin(user)
        grants = [] if is_admin else await FilePermissionService.list_user_grants(db, user.id)
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
            group_level = strongest([g.access_level for g in group_grants if g.group_name == group])
            func_nodes = []
            for func in func_types:
                func_grants = [g for g in group_grants if g.func_type in (None, func)]
                if not func_grants:
                    continue
                func_level = strongest([g.access_level for g in func_grants if g.func_type == func])
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
