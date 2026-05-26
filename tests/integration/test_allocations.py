"""Allocation business-rule tests — double-booking and stock reservation."""
import uuid

import pytest
from httpx import AsyncClient

from models.machine import Machine
from models.material import Material
from models.operator import Operator
from models.work_order import WorkOrder
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
async def work_order(db: AsyncSession) -> WorkOrder:
    wo = WorkOrder(product="Widget A", quantity=100)
    db.add(wo)
    await db.flush()
    return wo


@pytest.fixture
async def machine(db: AsyncSession) -> Machine:
    m = Machine(name="CNC-01", type="CNC", capacity=1)
    db.add(m)
    await db.flush()
    return m


@pytest.fixture
async def operator(db: AsyncSession) -> Operator:
    op = Operator(name="Alice", skill_set=["welding"], shift="morning")
    db.add(op)
    await db.flush()
    return op


@pytest.fixture
async def material(db: AsyncSession) -> Material:
    mat = Material(name="Steel Rod", unit="kg", qty_on_hand=100.0, qty_reserved=0.0)
    db.add(mat)
    await db.flush()
    return mat


async def test_allocate_machine_happy_path(
    supervisor_client: AsyncClient, work_order: WorkOrder, machine: Machine
):
    resp = await supervisor_client.post(
        "/api/v1/allocations",
        json={"work_order_id": str(work_order.id), "machine_id": str(machine.id)},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["machine_id"] == str(machine.id)
    assert data["deallocated_at"] is None


async def test_machine_double_booking_returns_409(
    supervisor_client: AsyncClient, work_order: WorkOrder, machine: Machine
):
    # First allocation
    await supervisor_client.post(
        "/api/v1/allocations",
        json={"work_order_id": str(work_order.id), "machine_id": str(machine.id)},
    )
    # Duplicate allocation — same machine, still active
    wo2 = WorkOrder(product="Widget B", quantity=10)
    # We use the same machine — must 409
    resp = await supervisor_client.post(
        "/api/v1/allocations",
        json={"work_order_id": str(work_order.id), "machine_id": str(machine.id)},
    )
    assert resp.status_code == 409


async def test_operator_double_booking_returns_409(
    supervisor_client: AsyncClient, work_order: WorkOrder, operator: Operator
):
    await supervisor_client.post(
        "/api/v1/allocations",
        json={"work_order_id": str(work_order.id), "operator_id": str(operator.id)},
    )
    resp = await supervisor_client.post(
        "/api/v1/allocations",
        json={"work_order_id": str(work_order.id), "operator_id": str(operator.id)},
    )
    assert resp.status_code == 409


async def test_material_reservation_insufficient_stock_returns_409(
    supervisor_client: AsyncClient, work_order: WorkOrder, material: Material
):
    resp = await supervisor_client.post(
        "/api/v1/allocations",
        json={
            "work_order_id": str(work_order.id),
            "material_id": str(material.id),
            "quantity_used": 9999.0,  # way more than qty_on_hand=100
        },
    )
    assert resp.status_code == 409


async def test_material_reservation_happy_path(
    supervisor_client: AsyncClient,
    work_order: WorkOrder,
    material: Material,
    db: AsyncSession,
):
    resp = await supervisor_client.post(
        "/api/v1/allocations",
        json={
            "work_order_id": str(work_order.id),
            "material_id": str(material.id),
            "quantity_used": 10.0,
        },
    )
    assert resp.status_code == 201
    await db.refresh(material)
    assert float(material.qty_reserved) == 10.0


async def test_readonly_user_cannot_allocate(client: AsyncClient, work_order: WorkOrder, machine: Machine):
    # Unauthenticated request should be 401
    resp = await client.post(
        "/api/v1/allocations",
        json={"work_order_id": str(work_order.id), "machine_id": str(machine.id)},
    )
    assert resp.status_code == 401
