from sqlalchemy import Column, String, DateTime
from app.core.database import Base
import datetime

class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    status = Column(String, default="active")
    owner = Column(String)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)