import base64
import hashlib
import re
import uuid
from urllib.parse import urlparse

import httpx
from cryptography.fernet import Fernet
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.agent_config import AgentConfig
from app.models.tool import Tool


class AgentService:
    @staticmethod
    def _cipher() -> Fernet:
        digest = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
        return Fernet(base64.urlsafe_b64encode(digest))

    @classmethod
    async def get_config(cls, db: AsyncSession) -> AgentConfig | None:
        return await db.scalar(select(AgentConfig).limit(1))

    @classmethod
    def config_view(cls, config: AgentConfig | None) -> dict:
        return {
            "provider": config.provider if config else "openai-compatible",
            "model": config.model if config else "gpt-4o-mini",
            "base_url": config.base_url if config else "https://api.openai.com/v1",
            "enabled": bool(config and config.enabled),
            "key_configured": bool(config and config.encrypted_api_key),
            "updated_at": config.updated_at.isoformat() if config and config.updated_at else None,
        }

    @classmethod
    async def save_config(cls, db: AsyncSession, data, user_id: str) -> AgentConfig:
        parsed = urlparse(data.base_url)
        if parsed.scheme not in ("https", "http") or not parsed.netloc:
            raise ValueError("API 地址必须是完整的 HTTP(S) 地址")
        if parsed.scheme != "https" and parsed.hostname not in ("localhost", "127.0.0.1"):
            raise ValueError("非本地 Agent 服务必须使用 HTTPS")
        config = await cls.get_config(db)
        if not config:
            config = AgentConfig(id=str(uuid.uuid4()))
            db.add(config)
        config.provider = data.provider.strip() or "openai-compatible"
        config.model = data.model.strip()
        config.base_url = data.base_url.rstrip("/")
        config.enabled = data.enabled
        config.updated_by = user_id
        if data.api_key:
            config.encrypted_api_key = cls._cipher().encrypt(data.api_key.strip().encode("utf-8")).decode("utf-8")
        await db.commit()
        await db.refresh(config)
        return config

    @staticmethod
    def _keywords(message: str) -> set[str]:
        return set(re.findall(r"[A-Za-z0-9]+|[\u4e00-\u9fff]{1,4}", message.lower()))

    @classmethod
    def suggest_tools(cls, message: str, tools: list[Tool]) -> list[dict]:
        keywords = cls._keywords(message)
        ranked: list[tuple[int, Tool]] = []
        for tool in tools:
            corpus = f"{tool.name} {tool.description or ''} {tool.group_name or ''} {tool.func_type or ''}".lower()
            score = sum(1 for word in keywords if word in corpus and len(word) > 1)
            # Power-device vocabulary gives practical recommendations even for Chinese phrase segmentation.
            if any(term in message.lower() for term in ("fom", "ron", "规格", "热阻")) and any(term in corpus for term in ("fom", "热阻")):
                score += 3
            if any(term in message.lower() for term in ("soa", "双脉冲", "损耗", "测试")) and any(term in corpus for term in ("soa", "损耗", "binning")):
                score += 3
            if any(term in message.lower() for term in ("可靠性", "寿命", "htol", "老化")) and "htol" in corpus:
                score += 3
            if score:
                ranked.append((score, tool))
        ranked.sort(key=lambda item: (-item[0], -(item[1].usage_count or 0)))
        return [
            {"id": tool.id, "name": tool.name, "description": tool.description, "icon": tool.icon, "reason": "与当前问题匹配"}
            for _, tool in ranked[:3]
        ]

    @classmethod
    async def reply(cls, db: AsyncSession, message: str) -> tuple[str, str, list[dict]]:
        tools = list((await db.execute(select(Tool).where(Tool.is_active.is_(True)).limit(100))).scalars().all())
        suggestions = cls.suggest_tools(message, tools)
        config = await cls.get_config(db)
        if not config or not config.enabled or not config.encrypted_api_key:
            suffix = "我先为你匹配了相关工具，可直接打开继续处理。" if suggestions else "目前尚未配置 Agent API Key；平台管理员完成配置后即可启用真实对话。"
            return f"我已理解你的问题：{message}\n\n{suffix}", "catalog", suggestions
        try:
            api_key = cls._cipher().decrypt(config.encrypted_api_key.encode("utf-8")).decode("utf-8")
            catalog = "\n".join(f"- {tool.name}: {tool.description or ''}" for tool in tools)
            payload = {
                "model": config.model,
                "messages": [
                    {"role": "system", "content": "你是功率器件部门 AI 助手。用简洁中文回答，只提供建议，不自动执行工具。可推荐的工具目录：\n" + catalog},
                    {"role": "user", "content": message},
                ],
                "temperature": 0.3,
            }
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(f"{config.base_url}/chat/completions", headers={"Authorization": f"Bearer {api_key}"}, json=payload)
                response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"].strip()
            return content, "agent", suggestions
        except Exception:
            suffix = "我已保留工具匹配结果，你可先从下方工具卡开始。" if suggestions else "请联系平台管理员检查 Agent 配置。"
            return f"Agent 暂时不可用。{suffix}", "catalog", suggestions
