"""Make tool grants unambiguous and idempotent."""

from alembic import op
import sqlalchemy as sa


revision = "20260906_0003"
down_revision = "20260906_0002"
branch_labels = None
depends_on = None


def _names(inspector, kind: str) -> set[str]:
    getter = inspector.get_unique_constraints if kind == "unique" else inspector.get_check_constraints
    return {item.get("name") for item in getter("tool_grants") if item.get("name")}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "tool_grants" not in inspector.get_table_names():
        return

    invalid = bind.execute(sa.text("""
        SELECT COUNT(*) FROM tool_grants
        WHERE (user_id IS NULL AND role_id IS NULL)
           OR (user_id IS NOT NULL AND role_id IS NOT NULL)
    """)).scalar_one()
    duplicate_users = bind.execute(sa.text("""
        SELECT COUNT(*) FROM (
            SELECT tool_id, user_id FROM tool_grants
            WHERE user_id IS NOT NULL GROUP BY tool_id, user_id HAVING COUNT(*) > 1
        ) AS duplicate_rows
    """)).scalar_one()
    duplicate_roles = bind.execute(sa.text("""
        SELECT COUNT(*) FROM (
            SELECT tool_id, role_id FROM tool_grants
            WHERE role_id IS NOT NULL GROUP BY tool_id, role_id HAVING COUNT(*) > 1
        ) AS duplicate_rows
    """)).scalar_one()
    if invalid or duplicate_users or duplicate_roles:
        raise RuntimeError(
            "Cannot add tool grant constraints: invalid or duplicate tool_grants rows exist. "
            "Resolve those records before rerunning the migration."
        )

    unique_names = _names(inspector, "unique")
    check_names = _names(inspector, "check")
    with op.batch_alter_table("tool_grants") as batch:
        if "ck_tool_grant_single_target" not in check_names:
            batch.create_check_constraint(
                "ck_tool_grant_single_target",
                "(user_id IS NOT NULL AND role_id IS NULL) OR (user_id IS NULL AND role_id IS NOT NULL)",
            )
        if "uq_tool_grant_tool_user" not in unique_names:
            batch.create_unique_constraint("uq_tool_grant_tool_user", ["tool_id", "user_id"])
        if "uq_tool_grant_tool_role" not in unique_names:
            batch.create_unique_constraint("uq_tool_grant_tool_role", ["tool_id", "role_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "tool_grants" not in inspector.get_table_names():
        return
    unique_names = _names(inspector, "unique")
    check_names = _names(inspector, "check")
    with op.batch_alter_table("tool_grants") as batch:
        if "uq_tool_grant_tool_role" in unique_names:
            batch.drop_constraint("uq_tool_grant_tool_role", type_="unique")
        if "uq_tool_grant_tool_user" in unique_names:
            batch.drop_constraint("uq_tool_grant_tool_user", type_="unique")
        if "ck_tool_grant_single_target" in check_names:
            batch.drop_constraint("ck_tool_grant_single_target", type_="check")
