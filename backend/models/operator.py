import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, String, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base


class Shift(str, Enum):
    morning = "morning"
    afternoon = "afternoon"
    night = "night"


class Operator(Base):
    __tablename__ = "operators"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    skill_set: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    shift: Mapped[str] = mapped_column(String(20), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", onupdate=datetime.utcnow
    )

    allocations: Mapped[list["Allocation"]] = relationship(back_populates="operator")

    def __repr__(self) -> str:
        return f"<Operator id={self.id} name={self.name!r}>"
