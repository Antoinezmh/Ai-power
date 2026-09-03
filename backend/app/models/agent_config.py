from sqlalchemy import Boolean, Column, DateTime, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class AgentConfig(Base):
    """Singleton-like server-side Agent provider configuration.

    API keys are encrypted before persistence and are never included in a
    response payload.
    """

    __tablename__ = "agent_configs"

    id = Column(String(36), primary_key=True)
    provider = Column(String(40), nullable=False, default="openai-compatible")
    model = Column(String(120), nullable=False, default="gpt-4o-mini")
    base_url = Column(String(500), nullable=False, default="https://api.openai.com/v1")
    encrypted_api_key = Column(Text, nullable=True)
    enabled = Column(Boolean, nullable=False, default=False)
    updated_by = Column(String(36), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
