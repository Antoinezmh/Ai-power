"""Store the user profile biography submitted by the settings page."""

from alembic import op
import sqlalchemy as sa


revision = "20260906_0008"
down_revision = "20260906_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "bio" not in columns:
        with op.batch_alter_table("users") as batch:
            batch.add_column(sa.Column("bio", sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "bio" in columns:
        with op.batch_alter_table("users") as batch:
            batch.drop_column("bio")
