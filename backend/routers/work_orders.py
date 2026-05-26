import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth import Role, get_current_user, require_role
from database import get_db
from schemas.work_order import PaginatedWorkOrders, WorkOrderCreate, WorkOrderRead, WorkOrderUpdate
from services import work_order as svc

router = APIRouter(prefix="/api/v1/work-orders", tags=["work-orders"])


@router.get("/", response_model=PaginatedWorkOrders)
async def list_work_orders(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    status: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    items, total = await svc.list_work_orders(db, page, page_size, status)
    return PaginatedWorkOrders(items=items, total=total, page=page, page_size=page_size)


@router.post("/", response_model=WorkOrderRead, status_code=status.HTTP_201_CREATED)
async def create_work_order(
    payload: WorkOrderCreate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_role(Role.supervisor, Role.manager)),
):
    async with db.begin():
        return await svc.create_work_order(db, payload)


@router.get("/{work_order_id}", response_model=WorkOrderRead)
async def get_work_order(
    work_order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    return await svc.get_work_order(db, work_order_id)


@router.patch("/{work_order_id}", response_model=WorkOrderRead)
async def update_work_order(
    work_order_id: uuid.UUID,
    payload: WorkOrderUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_role(Role.supervisor, Role.manager)),
):
    async with db.begin():
        return await svc.update_work_order(db, work_order_id, payload)


@router.delete("/{work_order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_work_order(
    work_order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_role(Role.manager)),
):
    async with db.begin():
        await svc.delete_work_order(db, work_order_id)
