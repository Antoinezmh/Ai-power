"""Normalize legacy demo tool records so they have valid launch metadata."""

from alembic import op
import sqlalchemy as sa


revision = "20260906_0004"
down_revision = "20260906_0003"
branch_labels = None
depends_on = None


DEMO_TOOLS = (
    ("MOSFET FoM 计算器", "mosfet-fom", "/capabilities/spec"),
    ("结壳热阻估算", "thermal-resistance", "/capabilities/spec"),
    ("TCAD 参数校准", "tcad-calibration", "/capabilities/model"),
    ("SOA 安全区绘制", "soa-plot", "/capabilities/test"),
    ("开关损耗计算器", "switching-loss", "/capabilities/test"),
    ("HTOL 在线监测", "htol-monitor", "/capabilities/reliability"),
    ("Binning 图工具", "wafer-binning", "/capabilities/test"),
)


def upgrade() -> None:
    bind = op.get_bind()
    if "tools" not in sa.inspect(bind).get_table_names():
        return
    statement = sa.text("""
        UPDATE tools
        SET namespace = :namespace,
            source = COALESCE(source, :source),
            status = CASE WHEN status IN ('稳定', 'Beta', 'beta') THEN 'active' ELSE status END
        WHERE name = :name
    """)
    for name, namespace, source in DEMO_TOOLS:
        bind.execute(statement, {"name": name, "namespace": namespace, "source": source})


def downgrade() -> None:
    # This deliberately does not restore invalid legacy launch metadata.
    pass
