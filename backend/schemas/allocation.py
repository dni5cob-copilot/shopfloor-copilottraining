import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AllocationCreate(BaseModel):
    work_order_id: uuid.UUID
    operator_id: uuid.UUID | None = None
    machine_id: uuid.UUID | None = None
    material_id: uuid.UUID | None = None
    quantity_used: float | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def at_least_one_resource(self) -> "AllocationCreate":
        if not any([self.operator_id, self.machine_id, self.material_id]):
            raise ValueError("At least one of operator_id, machine_id, or material_id must be set.")
        if self.material_id and self.quantity_used is None:
            raise ValueError("quantity_used is required when allocating a material.")
        return self


class AllocationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    work_order_id: uuid.UUID
    operator_id: uuid.UUID | None
    machine_id: uuid.UUID | None
    material_id: uuid.UUID | None
    quantity_used: float | None
    allocated_at: datetime
    deallocated_at: datetime | None
    allocated_by: uuid.UUID
    created_at: datetime


class PaginatedAllocations(BaseModel):
    items: list[AllocationRead]
    total: int
    page: int
    page_size: int
