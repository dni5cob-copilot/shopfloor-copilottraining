import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth import Role, get_current_user, require_role
from database import get_db
from schemas.material import MaterialCreate, MaterialRead, MaterialUpdate, PaginatedMaterials
from services import material as svc

router = APIRouter(prefix="/api/v1/materials", tags=["materials"])


@router.get("/", response_model=PaginatedMaterials)
async def list_materials(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    items, total = await svc.list_materials(db, page, page_size)
    return PaginatedMaterials(items=items, total=total, page=page, page_size=page_size)


@router.post("/", response_model=MaterialRead, status_code=status.HTTP_201_CREATED)
async def create_material(
    payload: MaterialCreate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_role(Role.supervisor, Role.manager)),
):
    async with db.begin():
        return await svc.create_material(db, payload)


@router.get("/{material_id}", response_model=MaterialRead)
async def get_material(
    material_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    return await svc.get_material(db, material_id)


@router.patch("/{material_id}", response_model=MaterialRead)
async def update_material(
    material_id: uuid.UUID,
    payload: MaterialUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_role(Role.supervisor, Role.manager)),
):
    async with db.begin():
        return await svc.update_material(db, material_id, payload)


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(
    material_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_role(Role.manager)),
):
    async with db.begin():
        await svc.delete_material(db, material_id)
