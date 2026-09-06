"""Add explicit public/restricted tool visibility."""

from alembic import op
import sqlalchemy as sa


revision = "20260906_0006"
down_revision = "20260906_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "tools" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("tools")}
    if "is_public" in columns:
        return
    # Existing tools preserve their prior visible-to-all behaviour. Newly
    # registered tools default to restricted after this migration.
    op.add_column(
        "tools",
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    with op.batch_alter_table("tools") as batch:
        batch.alter_column(
            "is_public",
            existing_type=sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "tools" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("tools")}
    if "is_public" in columns:
        with op.batch_alter_table("tools") as batch:
            batch.drop_column("is_public")
