from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class UserAgentConfig(Base):
    """Private model-provider configuration owned by one platform user."""

    __tablename__ = "user_agent_configs"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    provider = Column(String(40), nullable=False, default="openai-compatible")
    model = Column(String(120), nullable=False, default="gpt-4o-mini")
    base_url = Column(String(500), nullable=False, default="https://api.openai.com/v1")
    encrypted_api_key = Column(Text, nullable=True)
    enabled = Column(Boolean, nullable=False, default=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
