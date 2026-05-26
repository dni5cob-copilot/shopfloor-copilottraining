import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.machine import Machine
from schemas.machine import MachineCreate, MachineUpdate


async def get_machine(db: AsyncSession, machine_id: uuid.UUID) -> Machine:
    m = await db.get(Machine, machine_id)
    if m is None or m.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found")
    return m


async def list_machines(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    status_filter: str | None = None,
) -> tuple[list[Machine], int]:
    query = select(Machine).where(Machine.deleted_at.is_(None))
    if status_filter:
        query = query.where(Machine.status == status_filter)
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.scalars(query.offset((page - 1) * page_size).limit(page_size))
    return list(result.all()), total or 0


async def list_idle_machines(db: AsyncSession) -> list[Machine]:
    result = await db.scalars(
        select(Machine).where(Machine.status == "idle", Machine.deleted_at.is_(None))
    )
    return list(result.all())


async def create_machine(db: AsyncSession, payload: MachineCreate) -> Machine:
    m = Machine(**payload.model_dump())
    db.add(m)
    await db.flush()
    await db.refresh(m)
    return m


async def update_machine(
    db: AsyncSession, machine_id: uuid.UUID, payload: MachineUpdate
) -> Machine:
    m = await get_machine(db, machine_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(m, field, value)
    m.updated_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(m)
    return m


async def delete_machine(db: AsyncSession, machine_id: uuid.UUID) -> None:
    m = await get_machine(db, machine_id)
    m.deleted_at = datetime.now(UTC)
    await db.flush()
