"""Make the displayed user status and authentication flag consistent."""

from alembic import op
import sqlalchemy as sa


revision = "20260906_0009"
down_revision = "20260906_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if "users" not in sa.inspect(bind).get_table_names():
        return
    bind.execute(sa.text("UPDATE users SET is_active = false WHERE status = 'inactive'"))
    bind.execute(sa.text("UPDATE users SET is_active = true WHERE status = 'active'"))


def downgrade() -> None:
    # The former inconsistent state cannot be reconstructed safely.
    pass
