import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base


class MachineStatus(str, Enum):
    idle = "idle"
    running = "running"
    maintenance = "maintenance"


class Machine(Base):
    __tablename__ = "machines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=MachineStatus.idle, nullable=False)
    idle_threshold_minutes: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    last_idle_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", onupdate=datetime.utcnow
    )

    allocations: Mapped[list["Allocation"]] = relationship(back_populates="machine")

    def __repr__(self) -> str:
        return f"<Machine id={self.id} name={self.name!r} status={self.status!r}>"
