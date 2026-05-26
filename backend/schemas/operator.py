import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from models.operator import Shift


class OperatorCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    skill_set: list[str] = Field(default_factory=list)
    shift: Shift


class OperatorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    skill_set: list[str] | None = None
    shift: Shift | None = None


class OperatorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    skill_set: list[str]
    shift: str
    created_at: datetime
    updated_at: datetime


class PaginatedOperators(BaseModel):
    items: list[OperatorRead]
    total: int
    page: int
    page_size: int
