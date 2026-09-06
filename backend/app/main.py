"""Ai Power FastAPI application entrypoint."""
import logging
import os
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
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
from app.models.audit_log import AuditLog
from app.services.redis_service import RedisService
from sqlalchemy import delete, func, select, text
import app.models  # noqa: F401 - register all ORM models before create_all

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL, logging.INFO))

app = FastAPI(
    title="AI Silicon Platform API",
    version="1.1.0",
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


@app.get("/api/health/live")
async def liveness():
    return {"status": "ok"}


@app.get("/api/health")
async def readiness():
    checks = {"database": "ok", "redis": "disabled", "storage": "ok"}
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
    except Exception as exc:
        logging.error("Database readiness check failed: %s", exc)
        checks["database"] = "unavailable"
    if redis_client and RedisService.should_attempt():
        try:
            await redis_client.ping()
            checks["redis"] = "ok"
        except Exception as exc:
            logging.warning("Redis readiness check failed: %s", exc)
            checks["redis"] = "unavailable"
    try:
        storage_root = Path(settings.FILE_STORAGE_ROOT)
        storage_root.mkdir(parents=True, exist_ok=True)
        free = shutil.disk_usage(storage_root).free
        if not os.access(storage_root, os.W_OK) or free < settings.FILE_STORAGE_MIN_FREE_BYTES:
            checks["storage"] = "unavailable"
    except OSError as exc:
        logging.error("File storage readiness check failed: %s", exc)
        checks["storage"] = "unavailable"
    ready = (
        checks["database"] == "ok"
        and checks["storage"] == "ok"
        and (not settings.REQUIRE_REDIS or checks["redis"] == "ok")
    )
    if not ready:
        raise HTTPException(status_code=503, detail={"status": "degraded", "checks": checks})
    return {"status": "ok", "checks": checks}


@app.on_event("startup")
async def startup():
    # Production schema changes are applied by Alembic before Uvicorn starts.
    # Local development keeps the zero-setup SQLite path.
    if settings.APP_ENV.lower() != "production":
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
        role_lookup = await seed_access_control(db)
        user_count = await db.scalar(select(func.count()).select_from(User))
        if settings.APP_ENV.lower() == "production" and not user_count and not (
            settings.BOOTSTRAP_ADMIN_USERNAME
            and settings.BOOTSTRAP_ADMIN_EMAIL
            and settings.BOOTSTRAP_ADMIN_PASSWORD
        ):
            raise RuntimeError("Empty database requires bootstrap administrator credentials")
        if not user_count and settings.BOOTSTRAP_ADMIN_USERNAME:
            bootstrap_admin = User(
                username=settings.BOOTSTRAP_ADMIN_USERNAME,
                email=settings.BOOTSTRAP_ADMIN_EMAIL,
                hashed_password=hash_password(settings.BOOTSTRAP_ADMIN_PASSWORD),
                full_name="平台管理员",
                is_active=True,
                is_superuser=True,
            )
            db.add(bootstrap_admin)
            await db.flush()
            await assign_role_if_empty(db, bootstrap_admin.id, role_lookup["platform_admin"])
            logging.warning("Created the one-time bootstrap administrator account")
        # These local accounts are only for development. Real SSO identities are
        # mapped to the same role catalogue by the SSO adapter.
        if settings.SEED_DEMO_DATA:
            for username, email, password, full_name, is_superuser in demo_users:
                result = await db.execute(select(User).where(User.username == username))
                if not result.scalar_one_or_none():
                    db.add(User(username=username, email=email, hashed_password=hash_password(password), full_name=full_name, is_active=True, is_superuser=is_superuser))
            await db.flush()
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
        if settings.SEED_DEMO_DATA:
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
        if settings.SEED_DEMO_DATA:
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
                ('MOSFET FoM 计算器', 'FoM 与 Ron,sp 多电压档对照', '规格', 'mosfet-fom', '/capabilities/spec', '🔢'),
                ('结壳热阻估算', 'Rth(j-c) 与瞬态热阻折算估算', '规格', 'thermal-resistance', '/capabilities/spec', '🌡️'),
                ('TCAD 参数校准', '导入实测 IV/CV，自动校准仿真参数', '建模', 'tcad-calibration', '/capabilities/model', '📐'),
                ('SOA 安全区绘制', '解析 TLP 数据并绘制 SOA 边界', '测试', 'soa-plot', '/capabilities/test', '📊'),
                ('开关损耗计算器', '从双脉冲波形计算 Eon/Eoff', '测试', 'switching-loss', '/capabilities/test', '⚡'),
                ('HTOL 在线监测', '老化试验样本状态与预警', '可靠性', 'htol-monitor', '/capabilities/reliability', '🧪'),
                ('Binning 图工具', 'Wafer 级别 Vth/Ron binning', '测试', 'wafer-binning', '/capabilities/test', '◫'),
            )
            for name, description, group_name, namespace, source, icon in tool_seeds:
                result = await db.execute(select(Tool).where(Tool.name == name))
                existing_tool = result.scalar_one_or_none()
                if existing_tool:
                    if existing_tool.category_id is None:
                        existing_tool.category_id = category_ids[group_name]
                    if not existing_tool.source:
                        existing_tool.source = source
                    if existing_tool.namespace != namespace:
                        existing_tool.namespace = namespace
                    if existing_tool.status in {'稳定', 'Beta', 'beta'}:
                        existing_tool.status = 'active'
                else:
                    db.add(Tool(name=name, description=description, category_id=category_ids[group_name], group_name=group_name, func_type='数据处理', namespace=namespace, status='active', type='internal', source=source, icon=icon, owner='功率器件研发部', rating=5.0, usage_count=0, is_active=True, is_public=True))
        await db.commit()
    async with AsyncSessionLocal() as db:
        cutoff = datetime.now(timezone.utc) - timedelta(days=settings.AUDIT_LOG_RETENTION_DAYS)
        result = await db.execute(delete(AuditLog).where(AuditLog.created_at < cutoff))
        await db.commit()
        if result.rowcount:
            logging.info(
                "Removed %d audit records older than %d days",
                result.rowcount,
                settings.AUDIT_LOG_RETENTION_DAYS,
            )
    if redis_client:
        try:
            await redis_client.ping()
            legacy_keys = [key async for key in redis_client.scan_iter(match="user_api_keys:*")]
            if legacy_keys:
                await redis_client.delete(*legacy_keys)
                logging.warning("Removed %d legacy plaintext API-key records; users must create new hashed keys", len(legacy_keys))
            logging.info("Redis connected")
        except Exception as exc:
            RedisService.mark_unavailable()
            if settings.REQUIRE_REDIS:
                raise RuntimeError("Redis is required but unavailable") from exc
            logging.warning("Redis ping failed: %s", exc)
    logging.info("Application started")


@app.on_event("shutdown")
async def shutdown():
    if redis_client:
        await redis_client.close()
    await engine.dispose()
    logging.info("Application shutdown")
