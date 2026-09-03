"""Platform RBAC catalogue and idempotent bootstrap helpers.

The permission *code* is the contract shared by UI, API and future SSO
adapters. Database IDs remain implementation details and must never be sent by
an identity provider.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.permission import Permission, PermissionType
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.models.user_role import UserRole


PERMISSIONS = (
    # name, code, type, parent_code, path, description
    ("工作台", "menu:dashboard", PermissionType.menu, None, "/dashboard", "访问个人工作台"),
    ("查看工作台", "button:dashboard:view", PermissionType.button, "menu:dashboard", None, "查看工作台内容"),
    ("能力模块", "menu:capabilities", PermissionType.menu, None, None, "访问规格、建模、测试、可靠性模块"),
    ("查看能力模块", "button:capabilities:view", PermissionType.button, "menu:capabilities", None, "查看模块工作区"),
    ("工具市场", "menu:tools", PermissionType.menu, None, "/tools", "浏览部门工具"),
    ("查看工具", "button:tools:view", PermissionType.button, "menu:tools", None, "查看工具定义和说明"),
    ("使用工具", "button:tools:use", PermissionType.button, "menu:tools", None, "运行已获授权的工具"),
    ("管理工具", "button:tools:manage", PermissionType.button, "menu:tools", None, "新增、编辑、下线工具"),
    ("文件中心", "menu:files", PermissionType.menu, None, "/files", "进入研发资料空间"),
    ("查看资料", "button:files:view", PermissionType.button, "menu:files", None, "查看已获空间授权的资料"),
    ("上传资料", "button:files:upload", PermissionType.button, "menu:files", None, "向已获写入权的空间上传资料"),
    ("管理资料", "button:files:manage", PermissionType.button, "menu:files", None, "移动、删除或归档空间资料"),
    ("AI 助手", "menu:chat", PermissionType.menu, None, "/chat", "进入 AI 助手"),
    ("使用 AI 助手", "button:chat:use", PermissionType.button, "menu:chat", None, "向 AI 提问并调用已授权上下文"),
    ("个人设置", "menu:settings", PermissionType.menu, None, "/settings", "查看个人设置"),
    ("查看设置", "button:settings:view", PermissionType.button, "menu:settings", None, "查看个人设置"),
    ("修改设置", "button:settings:edit", PermissionType.button, "menu:settings", None, "修改个人资料与个人密钥"),
    ("分类设置", "menu:categories", PermissionType.menu, None, "/categories", "查看工具分类"),
    ("管理分类", "button:categories:manage", PermissionType.button, "menu:categories", None, "维护工具分类"),
    ("权限管理", "menu:permissions", PermissionType.menu, None, "/permissions", "进入用户与角色管理"),
    ("查看权限", "button:permissions:view", PermissionType.button, "menu:permissions", None, "查看用户、角色及授权"),
    ("管理角色", "button:permissions:manageRoles", PermissionType.button, "menu:permissions", None, "维护角色与角色权限"),
    ("管理用户", "button:permissions:manageUsers", PermissionType.button, "menu:permissions", None, "分配用户角色与资源权限"),
)

# code is for SSO mapping; name is the display value stored by the current ORM.
ROLES = {
    "platform_admin": {
        "name": "平台管理员",
        "description": "管理平台配置、用户、角色与所有研发资源。",
        "permissions": "*",
    },
    "department_manager": {
        "name": "部门负责人",
        "description": "统筹部门工具、资料与研发协作，不可分配平台角色。",
        "permissions": (
            "menu:dashboard", "button:dashboard:view", "menu:capabilities", "button:capabilities:view",
            "menu:tools", "button:tools:view", "button:tools:use", "button:tools:manage",
            "menu:files", "button:files:view", "button:files:upload", "button:files:manage",
            "menu:chat", "button:chat:use", "menu:settings", "button:settings:view", "button:settings:edit",
            "menu:categories", "button:categories:manage",
            "menu:permissions", "button:permissions:view",
        ),
    },
    "tool_owner": {
        "name": "工具负责人",
        "description": "负责工具发布、维护与所属资料空间协作。",
        "permissions": (
            "menu:dashboard", "button:dashboard:view", "menu:capabilities", "button:capabilities:view",
            "menu:tools", "button:tools:view", "button:tools:use", "button:tools:manage",
            "menu:files", "button:files:view", "button:files:upload", "button:files:manage",
            "menu:chat", "button:chat:use", "menu:settings", "button:settings:view", "button:settings:edit",
            "menu:categories", "button:categories:manage",
        ),
    },
    "engineer": {
        "name": "研发工程师",
        "description": "默认部门成员，可在获授权的工具与资料空间中开展研发。",
        "permissions": (
            "menu:dashboard", "button:dashboard:view", "menu:capabilities", "button:capabilities:view",
            "menu:tools", "button:tools:view", "button:tools:use",
            "menu:files", "button:files:view", "button:files:upload",
            "menu:chat", "button:chat:use", "menu:settings", "button:settings:view", "button:settings:edit",
        ),
    },
    "viewer": {
        "name": "只读协作者",
        "description": "可查看获授权的模块、工具和资料，不可运行工具或写入资料。",
        "permissions": (
            "menu:dashboard", "button:dashboard:view", "menu:capabilities", "button:capabilities:view",
            "menu:tools", "button:tools:view", "menu:files", "button:files:view",
            "menu:chat", "button:chat:use",
            "menu:settings", "button:settings:view",
        ),
    },
}


async def seed_access_control(db: AsyncSession) -> dict[str, Role]:
    """Create missing permissions, roles and role grants without overwriting admin edits."""
    result = await db.execute(select(Permission))
    permissions_by_code = {permission.code: permission for permission in result.scalars().all()}

    # Roots are inserted before children so parent_id can be set consistently.
    for name, code, kind, parent_code, path, description in PERMISSIONS:
        if code not in permissions_by_code:
            permission = Permission(name=name, code=code, type=kind, path=path, description=description)
            db.add(permission)
            await db.flush()
            permissions_by_code[code] = permission
        permission = permissions_by_code[code]
        if parent_code and permission.parent_id is None:
            permission.parent_id = permissions_by_code[parent_code].id

    result = await db.execute(select(Role))
    roles_by_name = {role.name: role for role in result.scalars().all()}
    role_lookup: dict[str, Role] = {}
    all_codes = tuple(permissions_by_code)
    for role_code, definition in ROLES.items():
        role = roles_by_name.get(definition["name"])
        if not role:
            role = Role(name=definition["name"], description=definition["description"], is_default=role_code == "engineer")
            db.add(role)
            await db.flush()
        role_lookup[role_code] = role
        wanted_codes = all_codes if definition["permissions"] == "*" else definition["permissions"]
        existing = await db.execute(select(RolePermission.permission_id).where(RolePermission.role_id == role.id))
        existing_ids = {row[0] for row in existing.all()}
        for code in wanted_codes:
            permission_id = permissions_by_code[code].id
            if permission_id not in existing_ids:
                db.add(RolePermission(role_id=role.id, permission_id=permission_id))
    return role_lookup


async def assign_role_if_empty(db: AsyncSession, user_id: str, role: Role) -> None:
    """Give demo or first-login users a default role without replacing explicit grants."""
    result = await db.execute(select(UserRole.role_id).where(UserRole.user_id == user_id))
    if not result.first():
        db.add(UserRole(user_id=user_id, role_id=role.id))
