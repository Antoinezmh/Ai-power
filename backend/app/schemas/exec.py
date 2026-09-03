from pydantic import BaseModel
from typing import Optional


class ExecStartResponse(BaseModel):
    status: str  # started / ready
    process_id: Optional[str] = None
    url: Optional[str] = None
    message: str


class ExecStatusResponse(BaseModel):
    process_id: str
    status: str  # running / finished / stopped / not_found
    pid: Optional[int] = None
    started_at: Optional[str] = None
    returncode: Optional[int] = None
    tool_id: Optional[str] = None
