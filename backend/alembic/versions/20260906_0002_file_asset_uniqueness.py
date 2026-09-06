"""Prevent duplicate file paths during concurrent uploads."""

from alembic import op
import sqlalchemy as sa


revision = "20260906_0002"
down_revision = "20260905_0001"
branch_labels = None
depends_on = None


def _constraint_names(inspector) -> set[str]:
    return {
        item.get("name")
        for item in inspector.get_unique_constraints("file_assets")
        if item.get("name")
    }


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "file_assets" not in inspector.get_table_names():
        return

    duplicate_space = bind.execute(sa.text("""
        SELECT COUNT(*) FROM (
            SELECT group_name, func_type, namespace, filename
            FROM file_assets
            GROUP BY group_name, func_type, namespace, filename
            HAVING COUNT(*) > 1
        ) AS duplicate_rows
    """)).scalar_one()
    duplicate_paths = bind.execute(sa.text("""
        SELECT COUNT(*) FROM (
            SELECT storage_path
            FROM file_assets
            GROUP BY storage_path
            HAVING COUNT(*) > 1
        ) AS duplicate_rows
    """)).scalar_one()
    if duplicate_space or duplicate_paths:
        raise RuntimeError(
            "Cannot add file uniqueness constraints: duplicate file_assets rows exist. "
            "Resolve duplicate paths before rerunning the migration."
        )

    names = _constraint_names(inspector)
    with op.batch_alter_table("file_assets") as batch:
        if "uq_file_asset_space_filename" not in names:
            batch.create_unique_constraint(
                "uq_file_asset_space_filename",
                ["group_name", "func_type", "namespace", "filename"],
            )
        if "uq_file_asset_storage_path" not in names:
            batch.create_unique_constraint(
                "uq_file_asset_storage_path",
                ["storage_path"],
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "file_assets" not in inspector.get_table_names():
        return
    names = _constraint_names(inspector)
    with op.batch_alter_table("file_assets") as batch:
        if "uq_file_asset_storage_path" in names:
            batch.drop_constraint("uq_file_asset_storage_path", type_="unique")
        if "uq_file_asset_space_filename" in names:
            batch.drop_constraint("uq_file_asset_space_filename", type_="unique")
