from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base

if TYPE_CHECKING:
    from models.machine import Machine
    from models.material import Material
    from models.operator import Operator
    from models.work_order import WorkOrder


class Allocation(Base):
    __tablename__ = "allocations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("work_orders.id"), nullable=False
    )
    operator_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("operators.id"), nullable=True
    )
    machine_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("machines.id"), nullable=True
    )
    material_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("materials.id"), nullable=True
    )
    quantity_used: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    allocated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False
    )
    deallocated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    allocated_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")

    work_order: Mapped[WorkOrder] = relationship(back_populates="allocations")
    operator: Mapped[Operator | None] = relationship(back_populates="allocations")
    machine: Mapped[Machine | None] = relationship(back_populates="allocations")
    material: Mapped[Material | None] = relationship(back_populates="allocations")

    def __repr__(self) -> str:
        return f"<Allocation id={self.id} work_order_id={self.work_order_id}>"
