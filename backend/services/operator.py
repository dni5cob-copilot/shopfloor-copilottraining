import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.operator import Operator
from schemas.operator import OperatorCreate, OperatorUpdate


async def get_operator(db: AsyncSession, operator_id: uuid.UUID) -> Operator:
    op = await db.get(Operator, operator_id)
    if op is None or op.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operator not found")
    return op


async def list_operators(
    db: AsyncSession, page: int = 1, page_size: int = 50
) -> tuple[list[Operator], int]:
    query = select(Operator).where(Operator.deleted_at.is_(None))
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.scalars(query.offset((page - 1) * page_size).limit(page_size))
    return list(result.all()), total or 0


async def create_operator(db: AsyncSession, payload: OperatorCreate) -> Operator:
    op = Operator(**payload.model_dump())
    db.add(op)
    await db.flush()
    await db.refresh(op)
    return op


async def update_operator(
    db: AsyncSession, operator_id: uuid.UUID, payload: OperatorUpdate
) -> Operator:
    op = await get_operator(db, operator_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(op, field, value)
    op.updated_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(op)
    return op


async def delete_operator(db: AsyncSession, operator_id: uuid.UUID) -> None:
    op = await get_operator(db, operator_id)
    op.deleted_at = datetime.now(UTC)
    await db.flush()
