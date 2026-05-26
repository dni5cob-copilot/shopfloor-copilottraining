import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth import Role, get_current_user, require_role
from database import get_db
from schemas.machine import MachineCreate, MachineRead, MachineUpdate, PaginatedMachines
from services import machine as svc

router = APIRouter(prefix="/api/v1/machines", tags=["machines"])


@router.get("/", response_model=PaginatedMachines)
async def list_machines(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    status: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    items, total = await svc.list_machines(db, page, page_size, status)
    return PaginatedMachines(items=items, total=total, page=page, page_size=page_size)


@router.get("/idle", response_model=list[MachineRead])
async def list_idle_machines(
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    return await svc.list_idle_machines(db)


@router.post("/", response_model=MachineRead, status_code=status.HTTP_201_CREATED)
async def create_machine(
    payload: MachineCreate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_role(Role.supervisor, Role.manager)),
):
    async with db.begin():
        return await svc.create_machine(db, payload)


@router.get("/{machine_id}", response_model=MachineRead)
async def get_machine(
    machine_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    return await svc.get_machine(db, machine_id)


@router.patch("/{machine_id}", response_model=MachineRead)
async def update_machine(
    machine_id: uuid.UUID,
    payload: MachineUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_role(Role.supervisor, Role.manager)),
):
    async with db.begin():
        return await svc.update_machine(db, machine_id, payload)


@router.delete("/{machine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_machine(
    machine_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_role(Role.manager)),
):
    async with db.begin():
        await svc.delete_machine(db, machine_id)
