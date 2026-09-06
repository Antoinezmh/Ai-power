"""Add private per-user AI provider configuration."""

from alembic import op
import sqlalchemy as sa


revision = "20260906_0014"
down_revision = "20260906_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if "user_agent_configs" in sa.inspect(bind).get_table_names():
        return
    op.create_table(
        "user_agent_configs",
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("provider", sa.String(length=40), nullable=False, server_default="openai-compatible"),
        sa.Column("model", sa.String(length=120), nullable=False, server_default="gpt-4o-mini"),
        sa.Column("base_url", sa.String(length=500), nullable=False, server_default="https://api.openai.com/v1"),
        sa.Column("encrypted_api_key", sa.Text(), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    bind = op.get_bind()
    if "user_agent_configs" in sa.inspect(bind).get_table_names():
        op.drop_table("user_agent_configs")
