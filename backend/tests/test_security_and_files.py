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
from app.services.file_service import FileService
from app.services.knowledge_service import KnowledgeService


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


def test_platform_knowledge_retrieves_tool_registration_rules():
    matches = KnowledgeService.search("怎样注册 Streamlit 工具并设置 namespace")

    assert matches
    assert any(match.source == "tool-registration-guide.md" for match in matches)


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
