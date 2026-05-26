import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MaterialCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    unit: str = Field(..., min_length=1, max_length=50)
    qty_on_hand: float = Field(default=0.0, ge=0)


class MaterialUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    unit: str | None = Field(default=None, min_length=1, max_length=50)
    qty_on_hand: float | None = Field(default=None, ge=0)


class MaterialRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    unit: str
    qty_on_hand: float
    qty_reserved: float
    created_at: datetime
    updated_at: datetime


class PaginatedMaterials(BaseModel):
    items: list[MaterialRead]
    total: int
    page: int
    page_size: int
