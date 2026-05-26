import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from models.work_order import WorkOrderStatus


class WorkOrderCreate(BaseModel):
    product: str = Field(..., min_length=1, max_length=255)
    quantity: int = Field(..., gt=0)
    priority: int = Field(default=5, ge=1, le=10)
    status: WorkOrderStatus = WorkOrderStatus.pending
    start_at: datetime | None = None
    end_at: datetime | None = None


class WorkOrderUpdate(BaseModel):
    product: str | None = Field(default=None, min_length=1, max_length=255)
    quantity: int | None = Field(default=None, gt=0)
    priority: int | None = Field(default=None, ge=1, le=10)
    status: WorkOrderStatus | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None


class WorkOrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product: str
    quantity: int
    priority: int
    status: str
    start_at: datetime | None
    end_at: datetime | None
    created_at: datetime
    updated_at: datetime


class PaginatedWorkOrders(BaseModel):
    items: list[WorkOrderRead]
    total: int
    page: int
    page_size: int
