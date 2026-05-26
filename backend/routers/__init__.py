from routers.allocations import router as allocations
from routers.auth import router as auth
from routers.machines import router as machines
from routers.materials import router as materials
from routers.operators import router as operators
from routers.work_orders import router as work_orders

__all__ = ["auth", "work_orders", "operators", "machines", "materials", "allocations"]
