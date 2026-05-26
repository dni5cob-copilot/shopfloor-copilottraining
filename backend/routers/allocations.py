import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth import Role, get_current_user, require_role
from database import get_db
from schemas.allocation import AllocationCreate, AllocationRead, PaginatedAllocations
from services import allocation as svc

router = APIRouter(prefix="/api/v1/allocations", tags=["allocations"])


@router.get("/", response_model=PaginatedAllocations)
async def list_allocations(
    work_order_id: uuid.UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    items, total = await svc.list_allocations(db, work_order_id, page, page_size)
    return PaginatedAllocations(items=items, total=total, page=page, page_size=page_size)


@router.post("/", response_model=AllocationRead, status_code=status.HTTP_201_CREATED)
async def create_allocation(
    payload: AllocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(Role.supervisor, Role.manager)),
):
    async with db.begin():
        return await svc.create_allocation(db, payload, allocated_by=current_user["id"])


@router.get("/{allocation_id}", response_model=AllocationRead)
async def get_allocation(
    allocation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    return await svc.get_allocation(db, allocation_id)


@router.delete("/{allocation_id}/deallocate", response_model=AllocationRead)
async def deallocate(
    allocation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(Role.supervisor, Role.manager)),
):
    async with db.begin():
        return await svc.deallocate(db, allocation_id, allocated_by=current_user["id"])
