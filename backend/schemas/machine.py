import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from models.machine import MachineStatus


class MachineCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: str = Field(..., min_length=1, max_length=100)
    capacity: int = Field(..., gt=0)
    idle_threshold_minutes: int = Field(default=5, gt=0)


class MachineUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    type: str | None = Field(default=None, min_length=1, max_length=100)
    capacity: int | None = Field(default=None, gt=0)
    status: MachineStatus | None = None
    idle_threshold_minutes: int | None = Field(default=None, gt=0)


class MachineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: str
    capacity: int
    status: str
    idle_threshold_minutes: int
    last_idle_at: datetime | None
    created_at: datetime
    updated_at: datetime


class PaginatedMachines(BaseModel):
    items: list[MachineRead]
    total: int
    page: int
    page_size: int
