"""Ai Power FastAPI application entrypoint."""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as v1_router
from app.core.config import settings
from app.core.database import AsyncSessionLocal, Base, engine
from app.core.redis_client import redis_client
from app.core.security import hash_password
from app.core.access_control import assign_role_if_empty, seed_access_control
from app.models.user import User
from app.models.tool import Tool
from app.models.category import Category
from app.models.file_permission import FilePermission
from sqlalchemy import select
import app.models  # noqa: F401 - register all ORM models before create_all

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL, logging.INFO))

app = FastAPI(
    title="AI Silicon Platform API",
    version="0.1.0",
    description="Backend for AI Development Tool Integration Platform",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
app.include_router(v1_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.on_event("startup")
async def startup():
    # This integrated copy does not include Alembic migrations yet.  Create the
    # local SQLite schema on first run so the login flow is usable immediately.
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        demo_users = (
            ('admin', 'admin@example.com', 'admin123', '超级管理员', True),
            ('manager', 'manager@example.com', 'manager123', '部门负责人', False),
            ('tooladmin', 'tooladmin@example.com', 'tool123', '工具负责人', False),
            ('zhangsan', 'zhangsan@example.com', '123456', '研发工程师', False),
            ('viewer', 'viewer@example.com', 'viewer123', '只读协作者', False),
        )
        for username, email, password, full_name, is_superuser in demo_users:
            result = await db.execute(select(User).where(User.username == username))
            if not result.scalar_one_or_none():
                db.add(User(username=username, email=email, hashed_password=hash_password(password), full_name=full_name, is_active=True, is_superuser=is_superuser))
        await db.flush()
        role_lookup = await seed_access_control(db)
        # These local accounts are only for development. Real SSO identities are
        # mapped to the same role catalogue by the SSO adapter.
        for username, role_code in (
            ("admin", "platform_admin"),
            ("manager", "department_manager"),
            ("tooladmin", "tool_owner"),
            ("zhangsan", "engineer"),
            ("viewer", "viewer"),
        ):
            result = await db.execute(select(User).where(User.username == username))
            user = result.scalar_one_or_none()
            if user:
                await assign_role_if_empty(db, user.id, role_lookup[role_code])

        # Resource grants deliberately differ from role grants so the UI can
        # exercise read/write/manage behaviour during development.
        demo_file_scopes = (
            ("manager", None, "manage"),
            ("tooladmin", None, "manage"),
            ("zhangsan", "器件组", "write"),
            ("viewer", "器件组", "read"),
        )
        for username, group_name, access_level in demo_file_scopes:
            result = await db.execute(select(User).where(User.username == username))
            user = result.scalar_one_or_none()
            if not user:
                continue
            existing = await db.execute(select(FilePermission).where(
                FilePermission.user_id == user.id,
                FilePermission.group_name == group_name,
                FilePermission.func_type.is_(None),
                FilePermission.namespace.is_(None),
            ))
            if not existing.scalar_one_or_none():
                db.add(FilePermission(user_id=user.id, group_name=group_name, access_level=access_level))
        category_ids = {}
        for category_name in ('规格', '建模', '测试', '可靠性'):
            result = await db.execute(select(Category).where(Category.name == category_name))
            category = result.scalar_one_or_none()
            if not category:
                category = Category(name=category_name, sort_order=len(category_ids) + 1)
                db.add(category)
                await db.flush()
            category_ids[category_name] = category.id
        tool_seeds = (
            ('MOSFET FoM 计算器', 'FoM 与 Ron,sp 多电压档对照', '规格', '稳定', '🔢'),
            ('结壳热阻估算', 'Rth(j-c) 与瞬态热阻折算估算', '规格', '稳定', '🌡️'),
            ('TCAD 参数校准', '导入实测 IV/CV，自动校准仿真参数', '建模', '稳定', '📐'),
            ('SOA 安全区绘制', '解析 TLP 数据并绘制 SOA 边界', '测试', 'Beta', '📊'),
            ('开关损耗计算器', '从双脉冲波形计算 Eon/Eoff', '测试', '稳定', '⚡'),
            ('HTOL 在线监测', '老化试验样本状态与预警', '可靠性', '稳定', '🧪'),
            ('Binning 图工具', 'Wafer 级别 Vth/Ron binning', '测试', '稳定', '◫'),
        )
        for name, description, group_name, status, icon in tool_seeds:
            result = await db.execute(select(Tool).where(Tool.name == name))
            existing_tool = result.scalar_one_or_none()
            if existing_tool:
                if existing_tool.category_id is None:
                    existing_tool.category_id = category_ids[group_name]
            else:
                db.add(Tool(name=name, description=description, category_id=category_ids[group_name], group_name=group_name, func_type='数据处理', namespace=name.lower().replace(' ', '-'), status=status, type='internal', icon=icon, owner='功率器件研发部', rating=5.0, usage_count=0, is_active=True))
        await db.commit()
    if redis_client:
        try:
            await redis_client.ping()
            logging.info("Redis connected")
        except Exception as exc:
            logging.warning("Redis ping failed: %s", exc)
    logging.info("Application started")


@app.on_event("shutdown")
async def shutdown():
    if redis_client:
        await redis_client.close()
    await engine.dispose()
    logging.info("Application shutdown")
