from pydantic import BaseModel
from typing import TypeVar, Generic, List, Optional

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int

class MessageResponse(BaseModel):
    message: str