import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.material import Material
from schemas.material import MaterialCreate, MaterialUpdate


async def get_material(db: AsyncSession, material_id: uuid.UUID) -> Material:
    mat = await db.get(Material, material_id)
    if mat is None or mat.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    return mat


async def list_materials(
    db: AsyncSession, page: int = 1, page_size: int = 50
) -> tuple[list[Material], int]:
    query = select(Material).where(Material.deleted_at.is_(None))
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.scalars(query.offset((page - 1) * page_size).limit(page_size))
    return list(result.all()), total or 0


async def create_material(db: AsyncSession, payload: MaterialCreate) -> Material:
    mat = Material(**payload.model_dump())
    db.add(mat)
    await db.flush()
    await db.refresh(mat)
    return mat


async def update_material(
    db: AsyncSession, material_id: uuid.UUID, payload: MaterialUpdate
) -> Material:
    mat = await get_material(db, material_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(mat, field, value)
    mat.updated_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(mat)
    return mat


async def delete_material(db: AsyncSession, material_id: uuid.UUID) -> None:
    mat = await get_material(db, material_id)
    mat.deleted_at = datetime.now(UTC)
    await db.flush()
