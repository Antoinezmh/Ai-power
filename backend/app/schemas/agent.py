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


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)


class ToolSuggestion(BaseModel):
    id: str
    name: str
    description: str | None = None
    icon: str | None = None
    reason: str


class ChatResponse(BaseModel):
    reply: str
    mode: str
    suggestions: list[ToolSuggestion] = []
