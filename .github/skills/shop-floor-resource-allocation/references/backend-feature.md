# Backend Feature Reference

## SQLAlchemy Model Template

```python
# backend/models/<entity>.py
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base

class Entity(Base):
    __tablename__ = "entities"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # ... domain fields ...
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=datetime.utcnow)
```

## Allocation Double-Booking Partial Index (Alembic)

Add inside the generated migration's `upgrade()`:

```python
op.execute("""
    CREATE UNIQUE INDEX uq_machine_active_allocation
    ON allocations (machine_id, tstzrange(allocated_at, deallocated_at))
    WHERE deallocated_at IS NULL
""")
```

And the corresponding `downgrade()`:

```python
op.execute("DROP INDEX IF EXISTS uq_machine_active_allocation")
```

## Service Layer Pattern

```python
# backend/services/allocation.py
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from backend.models import Allocation

async def create_allocation(
    db: AsyncSession,
    work_order_id: UUID,
    machine_id: UUID,
    allocated_by: UUID,
) -> Allocation:
    # 1. Check for active overlapping allocation
    conflict = await db.scalar(
        select(Allocation).where(
            Allocation.machine_id == machine_id,
            Allocation.deallocated_at.is_(None),
        )
    )
    if conflict:
        raise HTTPException(status_code=409, detail="Machine already allocated to another work order")

    allocation = Allocation(
        work_order_id=work_order_id,
        machine_id=machine_id,
        allocated_by=allocated_by,
    )
    db.add(allocation)
    await db.flush()
    return allocation
```

## FastAPI Router Pattern

```python
# backend/routers/allocations.py
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.auth import get_current_user, require_role
from backend.schemas.allocation import AllocationCreate, AllocationRead
from backend.services import allocation as svc

router = APIRouter(prefix="/api/v1/allocations", tags=["allocations"])

@router.post("/", response_model=AllocationRead, status_code=status.HTTP_201_CREATED)
async def allocate(
    payload: AllocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("supervisor")),
):
    return await svc.create_allocation(db, **payload.model_dump(), allocated_by=current_user.id)
```

## Redis Idle Event Publisher

```python
# backend/events/idle.py
import json
from datetime import datetime, timezone
from uuid import UUID
import redis.asyncio as aioredis

async def publish_idle(redis: aioredis.Redis, resource_type: str, resource_id: UUID) -> None:
    payload = json.dumps({
        "resource_id": str(resource_id),
        "resource_type": resource_type,
        "idle_since": datetime.now(timezone.utc).isoformat(),
    })
    await redis.publish(f"{resource_type}:idle", payload)
```
