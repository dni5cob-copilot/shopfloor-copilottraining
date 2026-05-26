import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.allocation import Allocation
from models.machine import Machine
from models.material import Material
from models.operator import Operator
from schemas.allocation import AllocationCreate


async def get_allocation(db: AsyncSession, allocation_id: uuid.UUID) -> Allocation:
    alloc = await db.get(Allocation, allocation_id)
    if alloc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation not found")
    return alloc


async def list_allocations(
    db: AsyncSession,
    work_order_id: uuid.UUID | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Allocation], int]:
    query = select(Allocation)
    if work_order_id:
        query = query.where(Allocation.work_order_id == work_order_id)
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.scalars(query.offset((page - 1) * page_size).limit(page_size))
    return list(result.all()), total or 0


async def create_allocation(
    db: AsyncSession,
    payload: AllocationCreate,
    allocated_by: uuid.UUID,
) -> Allocation:
    # Guard: machine double-booking
    if payload.machine_id:
        conflict = await db.scalar(
            select(Allocation).where(
                Allocation.machine_id == payload.machine_id,
                Allocation.deallocated_at.is_(None),
            )
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Machine is already allocated to an active work order.",
            )

    # Guard: operator double-booking
    if payload.operator_id:
        conflict = await db.scalar(
            select(Allocation).where(
                Allocation.operator_id == payload.operator_id,
                Allocation.deallocated_at.is_(None),
            )
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Operator is already allocated to an active work order.",
            )

    # Guard: material stock reservation
    if payload.material_id and payload.quantity_used:
        mat = await db.get(Material, payload.material_id)
        if mat is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
        available = float(mat.qty_on_hand) - float(mat.qty_reserved)
        if available < payload.quantity_used:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Insufficient material stock. Available: {available} {mat.unit}.",
            )
        mat.qty_reserved = float(mat.qty_reserved) + payload.quantity_used

    alloc = Allocation(
        **payload.model_dump(),
        allocated_by=allocated_by,
    )
    db.add(alloc)
    await db.flush()
    await db.refresh(alloc)
    return alloc


async def deallocate(
    db: AsyncSession, allocation_id: uuid.UUID, allocated_by: uuid.UUID
) -> Allocation:
    alloc = await get_allocation(db, allocation_id)
    if alloc.deallocated_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Allocation is already deallocated.",
        )

    # Release material reservation
    if alloc.material_id and alloc.quantity_used:
        mat = await db.get(Material, alloc.material_id)
        if mat:
            mat.qty_reserved = max(0.0, float(mat.qty_reserved) - float(alloc.quantity_used))

    alloc.deallocated_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(alloc)
    return alloc
