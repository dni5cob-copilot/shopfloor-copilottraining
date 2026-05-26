import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth import Role, get_current_user, require_role
from database import get_db
from schemas.operator import OperatorCreate, OperatorRead, OperatorUpdate, PaginatedOperators
from services import operator as svc

router = APIRouter(prefix="/api/v1/operators", tags=["operators"])


@router.get("/", response_model=PaginatedOperators)
async def list_operators(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    items, total = await svc.list_operators(db, page, page_size)
    return PaginatedOperators(items=items, total=total, page=page, page_size=page_size)


@router.post("/", response_model=OperatorRead, status_code=status.HTTP_201_CREATED)
async def create_operator(
    payload: OperatorCreate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_role(Role.supervisor, Role.manager)),
):
    async with db.begin():
        return await svc.create_operator(db, payload)


@router.get("/{operator_id}", response_model=OperatorRead)
async def get_operator(
    operator_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    return await svc.get_operator(db, operator_id)


@router.patch("/{operator_id}", response_model=OperatorRead)
async def update_operator(
    operator_id: uuid.UUID,
    payload: OperatorUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_role(Role.supervisor, Role.manager)),
):
    async with db.begin():
        return await svc.update_operator(db, operator_id, payload)


@router.delete("/{operator_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_operator(
    operator_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_role(Role.manager)),
):
    async with db.begin():
        await svc.delete_operator(db, operator_id)
