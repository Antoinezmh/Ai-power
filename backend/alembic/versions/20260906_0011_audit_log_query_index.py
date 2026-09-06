"""Add an index for dashboard and audit-log retention queries."""

from alembic import op
import sqlalchemy as sa


revision = "20260906_0011"
down_revision = "20260906_0010"
branch_labels = None
depends_on = None


INDEX_NAME = "ix_audit_logs_user_action_created_at"


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "audit_logs" not in inspector.get_table_names():
        return
    indexes = {index["name"] for index in inspector.get_indexes("audit_logs")}
    if INDEX_NAME not in indexes:
        op.create_index(
            INDEX_NAME,
            "audit_logs",
            ["user_id", "action", "created_at"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "audit_logs" not in inspector.get_table_names():
        return
    indexes = {index["name"] for index in inspector.get_indexes("audit_logs")}
    if INDEX_NAME in indexes:
        op.drop_index(INDEX_NAME, table_name="audit_logs")
