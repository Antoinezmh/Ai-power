from typing import Literal

from pydantic import BaseModel, Field


class AgentConfigUpdate(BaseModel):
    provider: str = "openai-compatible"
    model: str = Field(min_length=1, max_length=120)
    base_url: str = Field(min_length=1, max_length=500)
    api_key: str | None = Field(default=None, min_length=1, max_length=500)
    enabled: bool = False


class AgentConfigOut(BaseModel):
    provider: str
    model: str
    base_url: str
    enabled: bool
    key_configured: bool
    updated_at: str | None = None


class AgentStatusOut(BaseModel):
    connected: bool
    mode: str
    source: Literal["personal", "platform", "catalog"]


class ChatHistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    history: list[ChatHistoryMessage] = Field(default_factory=list, max_length=12)


class ToolSuggestion(BaseModel):
    id: str
    name: str
    description: str | None = None
    icon: str | None = None
    reason: str


class KnowledgeSource(BaseModel):
    title: str
    source: str
    excerpt: str


class ChatResponse(BaseModel):
    reply: str
    mode: str
    suggestions: list[ToolSuggestion] = Field(default_factory=list)
    sources: list[KnowledgeSource] = Field(default_factory=list)
