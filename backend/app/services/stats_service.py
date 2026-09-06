from sqlalchemy import func, select
from app.models.tool import Tool
from app.models.user import User
from app.models.audit_log import AuditLog
from app.services.tool_service import ToolService
from datetime import datetime, timedelta, timezone


class StatsService:
    @staticmethod
    async def get_dashboard_stats(db, user):
        access = ToolService.access_predicate(user)
        total_tools = await db.scalar(select(func.count()).select_from(Tool).where(access))
        active_tools = await db.scalar(
            select(func.count()).select_from(Tool).where(
                Tool.is_active.is_(True), Tool.status == 'active', access,
            )
        )
        total_users = await db.scalar(select(func.count()).select_from(User).where(User.is_active.is_(True)))
        total_calls = await db.scalar(
            select(func.count()).select_from(AuditLog).where(
                AuditLog.user_id == user.id,
                AuditLog.action == 'use_tool',
            )
        )
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)
        today_calls = await db.scalar(
            select(func.count()).select_from(AuditLog).where(
                AuditLog.user_id == user.id,
                AuditLog.action == 'use_tool',
                AuditLog.created_at >= today_start,
            )
        )
        yesterday_calls = await db.scalar(
            select(func.count()).select_from(AuditLog).where(
                AuditLog.user_id == user.id,
                AuditLog.action == 'use_tool',
                AuditLog.created_at >= yesterday_start,
                AuditLog.created_at < today_start,
            )
        )
        trend_start = today_start - timedelta(days=29)
        trend_rows = (await db.execute(
            select(
                func.date(AuditLog.created_at).label('day'),
                func.count().label('count'),
            )
            .where(
                AuditLog.user_id == user.id,
                AuditLog.action == 'use_tool',
                AuditLog.created_at >= trend_start,
            )
            .group_by(func.date(AuditLog.created_at))
            .order_by(func.date(AuditLog.created_at))
        )).all()
        counts_by_day = {str(day): int(count) for day, count in trend_rows}
        usage_trend_30 = [
            {
                'date': (trend_start + timedelta(days=offset)).date().isoformat(),
                'count': counts_by_day.get((trend_start + timedelta(days=offset)).date().isoformat(), 0),
            }
            for offset in range(30)
        ]

        distribution_rows = (await db.execute(
            select(
                func.coalesce(Tool.group_name, '未分类').label('group_name'),
                func.count().label('count'),
            )
            .select_from(AuditLog)
            .join(Tool, Tool.id == AuditLog.resource_id)
            .where(
                AuditLog.user_id == user.id,
                AuditLog.action == 'use_tool',
                access,
            )
            .group_by(func.coalesce(Tool.group_name, '未分类'))
            .order_by(func.count().desc())
        )).all()
        distribution_total = sum(int(count) for _, count in distribution_rows)
        project_distribution = [
            {
                'name': group_name,
                'value': int(count),
                'percent': round(int(count) * 100 / distribution_total, 1) if distribution_total else 0,
            }
            for group_name, count in distribution_rows
        ]
        recent_rows = (await db.execute(
            select(AuditLog, Tool)
            .join(Tool, Tool.id == AuditLog.resource_id)
            .where(
                AuditLog.user_id == user.id,
                AuditLog.action == 'use_tool',
                access,
            )
            .order_by(AuditLog.created_at.desc())
            .limit(30)
        )).all()
        recent_tools = []
        seen = set()
        for log, tool in recent_rows:
            if tool.id in seen:
                continue
            seen.add(tool.id)
            recent_tools.append({
                'id': tool.id,
                'name': tool.name,
                'description': tool.description or '',
                'owner': tool.owner or '',
                'usage_count': int(tool.usage_count or 0),
                'icon': tool.icon or '◫',
                'time': log.created_at.isoformat() if log.created_at else '',
            })
            if len(recent_tools) == 5:
                break
        today_count = int(today_calls or 0)
        yesterday_count = int(yesterday_calls or 0)
        if yesterday_count:
            growth_rate = round((today_count - yesterday_count) * 100 / yesterday_count, 1)
        else:
            growth_rate = 100.0 if today_count else 0.0
        return {
            'total_tools': int(total_tools or 0),
            'active_tools': int(active_tools or 0),
            'today_calls': today_count,
            'total_calls': int(total_calls or 0),
            'growth_rate': growth_rate,
            'trend_up': growth_rate >= 0,
            'change_rate': growth_rate,
            'usage_trend': usage_trend_30[-7:],
            'usage_trend_7': usage_trend_30[-7:],
            'usage_trend_30': usage_trend_30,
            'project_distribution': project_distribution,
            'recent_tools': recent_tools,
            'total_users': int(total_users or 0) if user.is_superuser else 0,
        }
