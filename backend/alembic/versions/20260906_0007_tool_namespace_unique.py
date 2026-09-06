"""Guarantee one tool registration per namespace."""

from alembic import op
import sqlalchemy as sa


revision = "20260906_0007"
down_revision = "20260906_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "tools" not in inspector.get_table_names():
        return
    names = {item.get("name") for item in inspector.get_unique_constraints("tools")}
    if "uq_tools_namespace" in names:
        return
    duplicates = bind.execute(sa.text("""
        SELECT COUNT(*) FROM (
            SELECT namespace FROM tools
            WHERE namespace IS NOT NULL
            GROUP BY namespace HAVING COUNT(*) > 1
        ) AS duplicate_rows
    """)).scalar_one()
    if duplicates:
        raise RuntimeError(
            "Cannot enforce unique tool namespaces: duplicate values exist. "
            "Rename duplicate namespaces before rerunning the migration."
        )
    with op.batch_alter_table("tools") as batch:
        batch.create_unique_constraint("uq_tools_namespace", ["namespace"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "tools" not in inspector.get_table_names():
        return
    names = {item.get("name") for item in inspector.get_unique_constraints("tools")}
    if "uq_tools_namespace" in names:
        with op.batch_alter_table("tools") as batch:
            batch.drop_constraint("uq_tools_namespace", type_="unique")
