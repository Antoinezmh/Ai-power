import json
from typing import Any, Optional
import re
from urllib.parse import urlparse
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from app.models.tool import Tool
from app.models.category import Category
from app.models.tool_grant import ToolGrant
from app.models.user_role import UserRole
from app.models.role_permission import RolePermission
from app.models.permission import Permission
from app.repositories.tool_repo import ToolRepository
from app.core.file_center import is_valid_func_type, is_valid_group
from app.core.config import settings


class ToolService:
    ALLOWED_TYPES = {'internal', 'static', 'external', 'streamlit'}
    ALLOWED_STATUSES = {'active', 'inactive', 'deprecated'}
    NAMESPACE_PATTERN = re.compile(r'^[a-z0-9][a-z0-9-]{0,49}$')

    @staticmethod
    def normalize_status(value: Any) -> str:
        status = str(value or 'active').strip()
        return {
            '稳定': 'active',
            'Beta': 'active',
            'beta': 'active',
            '启用': 'active',
            '停用': 'inactive',
            '已弃用': 'deprecated',
        }.get(status, status.lower())

    @classmethod
    def validate_definition(cls, values: dict[str, Any]) -> dict[str, Any]:
        tool_type = str(values.get('type') or 'internal').strip().lower()
        if tool_type == 'executable':
            raise ValueError('可执行文件运行器尚未启用，不能注册为可执行工具')
        if tool_type not in cls.ALLOWED_TYPES:
            raise ValueError(f'不支持的工具类型: {tool_type}')

        status = cls.normalize_status(values.get('status'))
        if status not in cls.ALLOWED_STATUSES:
            raise ValueError(f'不支持的工具状态: {status}')

        namespace = str(values.get('namespace') or '').strip().lower()
        if not cls.NAMESPACE_PATTERN.fullmatch(namespace):
            raise ValueError('namespace 只能包含小写字母、数字和连字符，长度为 1-50')

        group_name = str(values.get('group_name') or '').strip()
        func_type = str(values.get('func_type') or '').strip()
        if not is_valid_group(group_name):
            raise ValueError('工具必须属于平台定义的研发分组')
        if not is_valid_func_type(func_type):
            raise ValueError('工具必须属于平台定义的功能型')

        source = str(values.get('source') or '').strip()
        if not source:
            raise ValueError('工具访问地址不能为空')
        if source.lower().startswith(('javascript:', 'data:', 'file:')):
            raise ValueError('工具访问地址协议不安全')

        if tool_type == 'internal':
            if not source.startswith('/') or source.startswith('/api/'):
                raise ValueError('内部工具必须填写主站前端路由，例如 /capabilities/spec')
        elif tool_type == 'static':
            source = source.rstrip('/') + '/'
            if source != f'/tools/{namespace}/':
                raise ValueError('静态工具地址必须为 /tools/<namespace>/，并与 namespace 一致')
        elif source.startswith('/'):
            if source.startswith('//'):
                raise ValueError('站内代理地址不能以 // 开头')
            reserved = ('/api', '/_launch', '/_tool_auth', '/healthz', '/tools')
            if source == '/' or any(source == prefix or source.startswith(f'{prefix}/') for prefix in reserved):
                raise ValueError('动态工具必须使用独立的站内代理前缀')
            source = source.rstrip('/') + '/'
            if source != f'/{namespace}/':
                raise ValueError('动态工具站内代理地址必须为 /<namespace>/，并与 namespace 一致')
        else:
            parsed = urlparse(source)
            if parsed.scheme not in {'http', 'https'} or not parsed.netloc:
                raise ValueError('外部工具地址必须是 http(s) URL 或以 / 开头的站内代理路径')
            if parsed.username or parsed.password:
                raise ValueError('外部工具地址不能包含账号或密码')
            if settings.APP_ENV.lower() == 'production' and parsed.scheme != 'https':
                raise ValueError('生产环境的外部工具必须使用 HTTPS')

        values['type'] = tool_type
        values['status'] = status
        values['namespace'] = namespace
        values['group_name'] = group_name
        values['func_type'] = func_type
        values['source'] = source
        if values.get('entry') is not None:
            values['entry'] = str(values['entry']).strip().lstrip('/')
            if '..' in values['entry'].split('/'):
                raise ValueError('入口文件不能包含上级目录')
        if tool_type == 'static' and not values.get('entry'):
            raise ValueError('静态工具入口文件不能为空')
        return values

    @staticmethod
    async def list_tools(db: AsyncSession, skip=0, limit=100, category_id=None, search=None, group_name=None, func_type=None, namespace=None, user=None):
        query = select(Tool).where(Tool.is_active.is_(True))
        if user is not None:
            query = query.where(ToolService.access_predicate(user))
        for field, value in {'category_id': category_id, 'group_name': group_name, 'func_type': func_type, 'namespace': namespace}.items():
            if value:
                query = query.where(getattr(Tool, field) == value)
        if search:
            term = f'%{search}%'
            query = query.where(or_(
                Tool.name.ilike(term),
                Tool.description.ilike(term),
                Tool.tags.ilike(term),
                Tool.owner.ilike(term),
                Tool.namespace.ilike(term),
                Tool.group_name.ilike(term),
                Tool.func_type.ilike(term),
            ))
        result = await db.execute(query.order_by(Tool.usage_count.desc()).offset(skip).limit(limit))
        return list(result.scalars().all())

    @staticmethod
    async def get_tool(db, tool_id, user=None):
        tool = await ToolRepository(db).get(tool_id)
        if tool and user is not None and not await ToolService.can_access(db, user, tool_id):
            return None
        return tool

    @staticmethod
    async def create_tool(db, data):
        values = data.model_dump() if hasattr(data, 'model_dump') else data.dict()
        values = ToolService.validate_definition(values)
        if values.get('category_id') and not await db.get(Category, values['category_id']):
            raise ValueError('工具分类不存在')
        await ToolService._ensure_proxy_source_available(db, values)
        values['tags'] = json.dumps(values['tags']) if isinstance(values.get('tags'), list) else values.get('tags')
        try:
            return await ToolRepository(db).create(**values)
        except IntegrityError as exc:
            await db.rollback()
            raise ValueError('namespace 已被其他工具使用') from exc

    @staticmethod
    async def update_tool(db, tool_id, update_data):
        tool = await ToolRepository(db).get(tool_id)
        if not tool:
            return None
        merged = {
            key: getattr(tool, key)
            for key in (
                'name', 'description', 'category_id', 'group_name', 'func_type',
                'namespace', 'tags', 'owner', 'icon', 'rating', 'status', 'type',
                'source', 'config', 'entry', 'is_public',
            )
        }
        merged.update(update_data)
        validated = ToolService.validate_definition(merged)
        if validated.get('category_id') and not await db.get(Category, validated['category_id']):
            raise ValueError('工具分类不存在')
        await ToolService._ensure_proxy_source_available(db, validated, tool_id)
        normalized_update = {key: validated[key] for key in update_data}
        if isinstance(normalized_update.get('tags'), list):
            normalized_update['tags'] = json.dumps(normalized_update['tags'])
        try:
            return await ToolRepository(db).update(tool_id, **normalized_update)
        except IntegrityError as exc:
            await db.rollback()
            raise ValueError('namespace 已被其他工具使用') from exc

    @staticmethod
    async def delete_tool(db, tool_id): return await ToolRepository(db).delete(tool_id)

    @staticmethod
    async def _ensure_proxy_source_available(db, values: dict[str, Any], tool_id: str | None = None) -> None:
        """One protected proxy prefix must identify exactly one tool session."""
        source = values.get('source') or ''
        if values.get('type') == 'internal' or not source.startswith('/'):
            return
        query = select(Tool.id).where(Tool.source == source)
        if tool_id:
            query = query.where(Tool.id != tool_id)
        if await db.scalar(query):
            raise ValueError('该站内代理地址已被其他工具使用')

    @staticmethod
    async def increment_usage(db, tool_id, user=None):
        tool = await ToolRepository(db).get(tool_id)
        if not tool: return None
        if user is not None and not await ToolService.can_access(db, user, tool_id):
            raise PermissionError('未获得该工具的授权')
        if not tool.is_active or ToolService.normalize_status(tool.status) != 'active':
            raise ValueError('工具当前不可用')
        # Increment in SQL so simultaneous launches cannot overwrite each
        # other's counter value.
        await db.execute(
            update(Tool)
            .where(Tool.id == tool_id)
            .values(usage_count=func.coalesce(Tool.usage_count, 0) + 1)
        )
        await db.commit()
        await db.refresh(tool)
        return tool
    @staticmethod
    def access_predicate(user):
        if getattr(user, 'is_superuser', False):
            return True
        role_ids = select(UserRole.role_id).where(UserRole.user_id == user.id)
        can_manage_all = select(RolePermission.role_id).join(
            Permission, Permission.id == RolePermission.permission_id,
        ).where(
            RolePermission.role_id.in_(role_ids),
            Permission.code == 'button:tools:manage',
        ).exists()
        matching_grant = select(ToolGrant.id).where(
            ToolGrant.tool_id == Tool.id,
            or_(ToolGrant.user_id == user.id, ToolGrant.role_id.in_(role_ids)),
        ).exists()
        return or_(can_manage_all, Tool.is_public.is_(True), matching_grant)

    @staticmethod
    async def can_access(db, user, tool_id: str) -> bool:
        if getattr(user, 'is_superuser', False):
            return True
        result = await db.scalar(
            select(Tool.id).where(Tool.id == tool_id, ToolService.access_predicate(user))
        )
        return result is not None
