"""Add a per-user authentication version for credential revocation."""

from alembic import op
import sqlalchemy as sa


revision = "20260906_0010"
down_revision = "20260906_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "auth_version" not in columns:
        with op.batch_alter_table("users") as batch_op:
            batch_op.add_column(
                sa.Column("auth_version", sa.Integer(), nullable=False, server_default="0")
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "auth_version" in columns:
        with op.batch_alter_table("users") as batch_op:
            batch_op.drop_column("auth_version")
