from app.models.tool import Tool
from app.repositories.base import BaseRepository


class ToolRepository(BaseRepository[Tool]):
    def __init__(self, db):
        super().__init__(Tool, db)
