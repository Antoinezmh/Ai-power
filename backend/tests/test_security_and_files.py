from io import BytesIO

import pytest
from fastapi import HTTPException, UploadFile
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.core.config import Settings, settings
from app.core.database import Base
from app.models.file_asset import FileAsset
from app.models.file_permission import FilePermission
from app.models.user import User
from app.models.role import Role
from app.models.user_role import UserRole
from app.models.role_permission import RolePermission
from app.models.permission import Permission, PermissionType
from app.models.tool import Tool
from app.services.file_service import FileService
from app.services.file_permission_service import FilePermissionService
from app.services.knowledge_service import KnowledgeService
from app.services.tool_grant_service import ToolGrantService
from app.services.tool_service import ToolService
from app.services.user_service import UserService
from app.services.category_service import CategoryService
from app.services.role_service import RoleService
from app.services.agent_service import AgentService
from app.core.security import (
    create_file_download_ticket,
    decode_file_download_ticket,
    hash_password,
    verify_password,
)
from app.schemas.tool import ToolCreate
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.schemas.agent import AgentConfigUpdate
from app.schemas.user import UserCreate
from app.api.v1.files import router as files_router


@pytest.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()


def test_production_rejects_demo_seed_and_default_secret():
    with pytest.raises(ValueError):
        Settings(APP_ENV="production", SEED_DEMO_DATA=True, SECRET_KEY="short")


def test_production_accepts_separate_main_and_tool_origins():
    config = Settings(
        APP_ENV="production",
        SEED_DEMO_DATA=False,
        SECRET_KEY="x" * 40,
        DATABASE_URL="postgresql+asyncpg://user:password@postgres/db",
        REQUIRE_REDIS=True,
        PUBLIC_URL="https://ai.example.com",
        TOOL_PUBLIC_ORIGIN="https://tools.example.com",
        SESSION_COOKIE_SECURE=True,
        CORS_ORIGINS=["https://ai.example.com"],
    )
    assert config.TOOL_PUBLIC_ORIGIN == "https://tools.example.com"


def test_production_rejects_unimplemented_sso():
    with pytest.raises(ValueError, match="SSO_ENABLED"):
        Settings(
            APP_ENV="production",
            SEED_DEMO_DATA=False,
            SECRET_KEY="x" * 40,
            DATABASE_URL="postgresql+asyncpg://user:password@postgres/db",
            REQUIRE_REDIS=True,
            PUBLIC_URL="https://ai.example.com",
            TOOL_PUBLIC_ORIGIN="https://tools.example.com",
            SESSION_COOKIE_SECURE=True,
            CORS_ORIGINS=["https://ai.example.com"],
            SSO_ENABLED=True,
        )


def test_cors_origins_accepts_compose_comma_separated_environment(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://ai.example.com, https://admin.example.com")
    config = Settings(APP_ENV="development")
    assert config.CORS_ORIGINS == ["https://ai.example.com", "https://admin.example.com"]


def test_platform_knowledge_retrieves_tool_registration_rules():
    matches = KnowledgeService.search("怎样注册 Streamlit 工具并设置 namespace")

    assert matches
    assert any(match.source == "tool-registration-guide.md" for match in matches)


def test_agent_tool_matching_uses_tags_and_bounds_history():
    tagged = Tool(
        id="tagged-tool",
        name="分析工作台",
        description="通用处理",
        tags='["双脉冲", "Eon"]',
        group_name="器件组",
        func_type="数据处理",
        namespace="pulse-analysis",
        usage_count=0,
    )
    suggestions = AgentService.suggest_tools("请分析 Eon 波形", [tagged])
    assert suggestions and suggestions[0]["id"] == tagged.id

    history = [
        {"role": "user" if index % 2 == 0 else "assistant", "content": "x" * 4000}
        for index in range(12)
    ]
    bounded = AgentService._bounded_history(history)
    assert sum(len(item["content"]) for item in bounded) <= 16000
    assert bounded[-1]["role"] == "assistant"
    assert AgentService._visible_content("<think>internal</think>\nanswer") == "answer"
    assert AgentService._visible_content("answer<think>unfinished") == "answer"


@pytest.mark.asyncio
async def test_personal_agent_key_overrides_platform_key(db):
    user = User(id="agent-user", username="agent-user", email="agent-user@example.com", hashed_password="hash")
    db.add(user)
    await db.commit()
    platform = await AgentService.save_config(
        db,
        AgentConfigUpdate(model="platform-model", base_url="https://platform.example.com/v1", api_key="platform-key", enabled=True),
        "admin-user",
    )
    resolved, source = await AgentService.resolve_config(db, user.id)
    assert resolved is platform
    assert source == "platform"

    personal = await AgentService.save_user_config(
        db,
        AgentConfigUpdate(model="personal-model", base_url="https://personal.example.com/v1", api_key="personal-key", enabled=True),
        user.id,
    )
    resolved, source = await AgentService.resolve_config(db, user.id)
    assert resolved is personal
    assert source == "personal"
    assert AgentService.user_config_view(personal)["key_configured"] is True


def test_tool_registration_accepts_no_category_and_rejects_unsafe_sources():
    data = ToolCreate(
        name="Demo", description="Demo", group_name="器件组", func_type="数据处理",
        namespace="demo-tool", tags=["demo"], owner="owner", source="/tools/demo-tool",
        type="static", entry="index.html",
    )
    normalized = ToolService.validate_definition(data.model_dump())
    assert normalized["category_id"] is None
    assert normalized["source"] == "/tools/demo-tool/"

    unsafe = data.model_copy(update={"source": "javascript:alert(1)", "type": "external"})
    with pytest.raises(ValueError):
        ToolService.validate_definition(unsafe.model_dump())

    reserved = data.model_copy(update={"source": "/api/private", "type": "streamlit"})
    with pytest.raises(ValueError):
        ToolService.validate_definition(reserved.model_dump())

    invalid_group = data.model_copy(update={"group_name": "不存在的组"})
    with pytest.raises(ValueError):
        ToolService.validate_definition(invalid_group.model_dump())


def test_download_ticket_is_scoped_to_one_asset():
    ticket = create_file_download_ticket("asset-a", "user-a")
    second_ticket = create_file_download_ticket("asset-a", "user-a")
    assert decode_file_download_ticket(ticket, "asset-a")["sub"] == "user-a"
    assert decode_file_download_ticket(ticket, "asset-b") is None
    assert ticket != second_ticket


def test_signed_download_route_does_not_require_bearer_dependency():
    route = next(route for route in files_router.routes if route.path == "/files/download/{asset_id}")
    dependency_names = {getattr(dependency.call, "__name__", "") for dependency in route.dependant.dependencies}
    assert "get_current_user" not in dependency_names


@pytest.mark.asyncio
async def test_file_list_is_filtered_by_user_scope(db):
    user = User(username="engineer", email="engineer@example.com", hashed_password="x")
    other = User(username="other", email="other@example.com", hashed_password="x")
    admin = User(username="admin-test", email="admin-test@example.com", hashed_password="x", is_superuser=True)
    db.add_all([user, other, admin])
    await db.flush()
    db.add(FilePermission(user_id=user.id, group_name="器件组", access_level="read"))
    db.add_all([
        FileAsset(group_name="器件组", func_type="数据处理", namespace="tool-a", filename="a.txt", ext=".txt", size=1, storage_path="器件组/数据处理/tool-a/a.txt", owner_id=user.id),
        FileAsset(group_name="GaN功率组", func_type="数据处理", namespace="tool-b", filename="b.txt", ext=".txt", size=1, storage_path="GaN功率组/数据处理/tool-b/b.txt", owner_id=other.id),
    ])
    await db.commit()

    visible, visible_count = await FileService.list_files(db, user)
    hidden, hidden_count = await FileService.list_files(db, other)
    all_files, all_count = await FileService.list_files(db, admin)

    assert visible_count == 1 and visible[0].filename == "a.txt"
    assert hidden_count == 0 and hidden == []
    assert all_count == 2 and len(all_files) == 2


@pytest.mark.asyncio
async def test_upload_move_delete_stays_consistent(db, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "FILE_STORAGE_ROOT", str(tmp_path))
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE", 32)
    user = User(username="owner", email="owner@example.com", hashed_password="x")
    db.add(user)
    await db.flush()

    upload = UploadFile(filename="result.txt", file=BytesIO(b"measurement"))
    asset = await FileService.upload(db, "器件组", "数据处理", "tool-a", upload, user.id)
    original = tmp_path / asset.storage_path
    assert original.read_bytes() == b"measurement"

    with pytest.raises(HTTPException) as duplicate_error:
        await FileService.upload(db, "器件组", "数据处理", "tool-a", UploadFile(filename="result.txt", file=BytesIO(b"new")), user.id)
    assert duplicate_error.value.status_code == 409

    with pytest.raises(HTTPException) as type_error:
        await FileService.upload(db, "器件组", "数据处理", "tool-a", UploadFile(filename="payload.exe", file=BytesIO(b"bad")), user.id)
    assert type_error.value.status_code == 415

    moved = await FileService.move(db, asset.id, new_namespace="tool-b", new_filename="renamed.txt")
    destination = tmp_path / moved.storage_path
    assert destination.is_file() and not original.exists()

    await FileService.delete(db, asset.id)
    assert not destination.exists()
    assert await db.get(FileAsset, asset.id) is None


@pytest.mark.asyncio
async def test_chunk_upload_round_trip(db, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "FILE_STORAGE_ROOT", str(tmp_path))
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE", 32)
    monkeypatch.setattr(settings, "CHUNK_UPLOAD_SIZE", 5)
    user = User(username="chunk-owner", email="chunk@example.com", hashed_password="x")
    db.add(user)
    await db.commit()

    initialized = await FileService.init_chunk(
        db, "器件组", "数据处理", "chunk-tool", "result.txt", user.id, size=11,
    )
    upload_id = initialized["upload_id"]
    for index, value in enumerate((b"hello", b" worl", b"d")):
        await FileService.save_chunk(
            upload_id, index, UploadFile(filename="part", file=BytesIO(value)), user.id,
        )
    asset = await FileService.complete_chunk(
        db, upload_id, user.id, "器件组", "数据处理", "chunk-tool", "result.txt",
    )
    assert (tmp_path / asset.storage_path).read_bytes() == b"hello world"
    assert not (tmp_path / ".uploads" / upload_id.replace("-", "")).exists()


@pytest.mark.asyncio
async def test_role_tool_grant_controls_tool_and_file_access(db):
    role = Role(name="engineer-test")
    allowed = User(username="allowed", email="allowed@example.com", hashed_password="x")
    denied = User(username="denied", email="denied@example.com", hashed_password="x")
    tool = Tool(
        name="Role Tool", group_name="器件组", func_type="数据处理", namespace="role-tool",
        status="active", type="internal", source="/capabilities/spec", is_active=True,
    )
    db.add_all([role, allowed, denied, tool])
    await db.flush()
    db.add(UserRole(user_id=allowed.id, role_id=role.id))
    await db.commit()
    await ToolGrantService.grant(db, tool.id, role_id=role.id, level="write")

    assert await ToolService.can_access(db, allowed, tool.id)
    assert not await ToolService.can_access(db, denied, tool.id)
    assert await FilePermissionService.can(db, allowed, "器件组", "数据处理", "role-tool", "write")
    assert not await FilePermissionService.can(db, denied, "器件组", "数据处理", "role-tool", "read")


@pytest.mark.asyncio
async def test_role_based_platform_admin_has_global_resource_access(db):
    admin_role = Role(name="role-admin")
    role_admin = User(username="role-admin", email="role-admin@example.com", hashed_password="x")
    manage_users = Permission(
        name="管理用户",
        code="button:permissions:manageUsers",
        type=PermissionType.button,
    )
    manage_tools = Permission(
        name="管理工具",
        code="button:tools:manage",
        type=PermissionType.button,
    )
    private_tool = Tool(
        name="Private Tool",
        group_name="器件组",
        func_type="数据处理",
        namespace="private-tool",
        status="active",
        type="internal",
        source="/capabilities/spec",
        is_active=True,
        is_public=False,
    )
    db.add_all([admin_role, role_admin, manage_users, manage_tools, private_tool])
    await db.flush()
    db.add_all([
        UserRole(user_id=role_admin.id, role_id=admin_role.id),
        RolePermission(role_id=admin_role.id, permission_id=manage_users.id),
        RolePermission(role_id=admin_role.id, permission_id=manage_tools.id),
    ])
    await db.commit()

    assert await ToolService.can_access(db, role_admin, private_tool.id)
    assert await FilePermissionService.can(
        db, role_admin, "器件组", "数据处理", "private-tool", "manage",
    )


@pytest.mark.asyncio
async def test_proxy_source_and_file_grant_validation(db):
    user = User(username="validation-user", email="validation@example.com", hashed_password="x")
    existing = Tool(
        name="Existing", group_name="器件组", func_type="数据处理", namespace="shared-prefix",
        status="active", type="streamlit", source="/shared-prefix/", is_active=True,
    )
    db.add_all([user, existing])
    await db.commit()

    duplicate = ToolCreate(
        name="Duplicate", description="Duplicate", group_name="器件组", func_type="数据处理",
        namespace="shared-prefix", source="/shared-prefix", type="streamlit",
    )
    with pytest.raises(ValueError, match="代理地址"):
        await ToolService.create_tool(db, duplicate)

    with pytest.raises(ValueError, match="研发分组"):
        await FilePermissionService.grant(db, user.id, group_name="不存在的组")
    with pytest.raises(ValueError, match="namespace"):
        await FilePermissionService.grant(db, user.id, namespace="../bad")


@pytest.mark.asyncio
async def test_user_status_controls_authentication_flag_and_role_ids_are_validated(db):
    user = User(username="status-user", email="status@example.com", hashed_password="x")
    db.add(user)
    await db.commit()

    updated = await UserService.update_user(db, user.id, {"status": "inactive"})
    assert updated.status == "inactive"
    assert updated.is_active is False

    with pytest.raises(ValueError, match="角色"):
        await UserService.assign_roles(db, user.id, ["missing-role"])


@pytest.mark.asyncio
async def test_password_change_revokes_existing_token_version(db):
    old_password = "old-password-123"
    new_password = "新密码-password-456"
    user = User(
        username="password-user",
        email="password@example.com",
        hashed_password=hash_password(old_password),
    )
    db.add(user)
    await db.commit()
    original_version = user.auth_version or 0

    assert await UserService.change_password(db, user.id, old_password, new_password)
    assert user.auth_version == original_version + 1
    assert verify_password(new_password, user.hashed_password)
    assert not verify_password(old_password, user.hashed_password)


@pytest.mark.asyncio
async def test_new_users_receive_the_single_default_role(db):
    original_default = Role(name="original-default", is_default=True)
    db.add(original_default)
    await db.commit()

    user = await UserService.create_user(db, UserCreate(
        username="new-engineer",
        email="new-engineer@example.com",
        password="strong-pass-123",
    ))
    assert await UserService.get_user_roles(db, user.id) == [original_default.id]

    replacement = await RoleService.create_role(db, "replacement-default", is_default=True)
    await db.refresh(original_default)
    assert replacement.is_default is True
    assert original_default.is_default is False
    with pytest.raises(ValueError, match="其他角色"):
        await RoleService.update_role(db, replacement.id, is_default=False)


@pytest.mark.asyncio
async def test_category_cycles_and_assigned_role_deletion_are_rejected(db):
    parent = await CategoryService.create(db, CategoryCreate(name="parent"))
    child = await CategoryService.create(db, CategoryCreate(name="child", parent_id=parent.id))
    with pytest.raises(ValueError, match="循环"):
        await CategoryService.update(db, parent.id, CategoryUpdate(parent_id=child.id))

    role = Role(name="assigned-role")
    user = User(username="role-user", email="role-user@example.com", hashed_password="x")
    db.add_all([role, user])
    await db.flush()
    db.add(UserRole(user_id=user.id, role_id=role.id))
    await db.commit()
    with pytest.raises(ValueError, match="关联用户"):
        await RoleService.delete_role(db, role.id)
