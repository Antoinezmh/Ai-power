"""Register tools as optional file-center spaces."""

from alembic import op
import sqlalchemy as sa


revision = "20260914_0015"
down_revision = "20260906_0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "tools" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("tools")}
    if "file_space_enabled" not in columns:
        with op.batch_alter_table("tools") as batch:
            batch.add_column(sa.Column(
                "file_space_enabled", sa.Boolean(), nullable=False, server_default=sa.true(),
            ))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "tools" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("tools")}
    if "file_space_enabled" in columns:
        with op.batch_alter_table("tools") as batch:
            batch.drop_column("file_space_enabled")
