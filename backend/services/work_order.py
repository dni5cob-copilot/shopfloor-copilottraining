import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.work_order import WorkOrder
from schemas.work_order import WorkOrderCreate, WorkOrderUpdate


async def get_work_order(db: AsyncSession, work_order_id: uuid.UUID) -> WorkOrder:
    wo = await db.get(WorkOrder, work_order_id)
    if wo is None or wo.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
    return wo


async def list_work_orders(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    status_filter: str | None = None,
) -> tuple[list[WorkOrder], int]:
    query = select(WorkOrder).where(WorkOrder.deleted_at.is_(None))
    if status_filter:
        query = query.where(WorkOrder.status == status_filter)
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.scalars(query.offset((page - 1) * page_size).limit(page_size))
    return list(result.all()), total or 0


async def create_work_order(db: AsyncSession, payload: WorkOrderCreate) -> WorkOrder:
    wo = WorkOrder(**payload.model_dump())
    db.add(wo)
    await db.flush()
    await db.refresh(wo)
    return wo


async def update_work_order(
    db: AsyncSession, work_order_id: uuid.UUID, payload: WorkOrderUpdate
) -> WorkOrder:
    wo = await get_work_order(db, work_order_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(wo, field, value)
    wo.updated_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(wo)
    return wo


async def delete_work_order(db: AsyncSession, work_order_id: uuid.UUID) -> None:
    wo = await get_work_order(db, work_order_id)
    wo.deleted_at = datetime.now(UTC)
    await db.flush()
