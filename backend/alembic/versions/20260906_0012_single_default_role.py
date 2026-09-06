"""Enforce a single default role for newly created users."""

from alembic import op
import sqlalchemy as sa


revision = "20260906_0012"
down_revision = "20260906_0011"
branch_labels = None
depends_on = None


INDEX_NAME = "uq_roles_single_default"


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "roles" not in inspector.get_table_names():
        return
    default_ids = list(bind.execute(
        sa.text(
            "SELECT id FROM roles WHERE is_default = :enabled "
            "ORDER BY created_at, id"
        ),
        {"enabled": True},
    ).scalars())
    if len(default_ids) > 1:
        bind.execute(
            sa.text("UPDATE roles SET is_default = :disabled WHERE id <> :keep_id AND is_default = :enabled"),
            {"disabled": False, "enabled": True, "keep_id": default_ids[0]},
        )
    indexes = {index["name"] for index in inspector.get_indexes("roles")}
    if INDEX_NAME not in indexes:
        op.create_index(
            INDEX_NAME,
            "roles",
            ["is_default"],
            unique=True,
            postgresql_where=sa.text("is_default IS TRUE"),
            sqlite_where=sa.text("is_default = 1"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "roles" not in inspector.get_table_names():
        return
    indexes = {index["name"] for index in inspector.get_indexes("roles")}
    if INDEX_NAME in indexes:
        op.drop_index(INDEX_NAME, table_name="roles")
