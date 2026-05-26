---
name: shop-floor-resource-allocation
description: "Use when implementing, extending, or scaffolding any feature for the Shop Floor Resource Allocation system. Covers end-to-end workflow: Alembic migration → SQLAlchemy model → Pydantic schemas → FastAPI router → service layer → React component → Zustand store → Pytest + Playwright tests. Trigger phrases: new endpoint, new entity, add feature, scaffold module, allocation rule, idle alert, work order, operator, machine, material."
argument-hint: "Feature to implement, e.g. 'add machine allocation endpoint' or 'create material reservation UI'"
---

# Shop Floor Resource Allocation — Feature Implementation Skill

## When to Use

Invoke this skill whenever you need to:
- Add or extend a backend entity (model, migration, CRUD endpoint)
- Implement an allocation or reallocation business rule
- Build a new React component or Zustand store slice
- Add real-time idle-alert behaviour
- Write tests for any of the above

---

## Procedure

### Step 1 — Clarify Requirements

Before writing any code, confirm:
1. Which **entity or feature** is being added? (WorkOrder / Operator / Machine / Material / Allocation / Suggestion)
2. Is this **backend only**, **frontend only**, or **full-stack**?
3. Are there new **business rules** (e.g. conflict detection, stock reservation)?
4. Does this feature require **real-time** updates (WebSocket / Redis pub/sub)?

If unclear, ask the user before proceeding.

---

### Step 2 — Backend: Database Layer

1. **Create or update the SQLAlchemy model** in `backend/models/`.
   - Use `UUID` PK (`id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)`).
   - All timestamps as `DateTime(timezone=True)`.
   - Include `deleted_at: Mapped[datetime | None]` for soft-delete.
   - See [backend reference](./references/backend-feature.md) for model template.

2. **Generate an Alembic migration**:
   ```
   alembic revision --autogenerate -m "add_<feature_name>"
   ```
   - Review the generated migration — never edit the `downgrade()` to be a no-op.
   - Add any partial unique indexes (e.g. double-booking guard) manually inside the migration.

---

### Step 3 — Backend: API Layer

1. **Create Pydantic v2 schemas** in `backend/schemas/<entity>.py`:
   - `<Entity>Create` — fields required on creation.
   - `<Entity>Update` — all fields optional.
   - `<Entity>Read` — response model; include `id` and timestamps.

2. **Create a service module** in `backend/services/<entity>.py`:
   - All functions `async def`.
   - Accepts `AsyncSession` as first argument.
   - Enforce business rules here (double-booking check → raise `HTTPException(409)`, stock check → raise `HTTPException(409)`).
   - Record `allocated_by` for every Allocation write.

3. **Create a FastAPI router** in `backend/routers/<entity>.py`:
   - Mount under `/api/v1/<plural-entity>`.
   - Protect every route with `Depends(get_current_user)`.
   - Apply RBAC guard (`require_role("supervisor")` etc.) per endpoint.
   - Return paginated responses for list endpoints (`total`, `page`, `page_size`).

4. **Register the router** in `backend/main.py`.

---

### Step 4 — Real-Time (if applicable)

If the feature involves idle detection or live status changes:

1. Publish an event to the correct Redis channel:
   - Machines: `machine:idle` | Operators: `operator:idle`
   - Payload: `{"resource_id": "<uuid>", "resource_type": "...", "idle_since": "<iso8601>"}`

2. Confirm the WebSocket fanout handler in `backend/ws/` already subscribes to the channel; if not, add it.

3. The idle threshold must come from the DB (`machine.idle_threshold_minutes`), not a hardcoded constant.

---

### Step 5 — Frontend: State & API

1. **Add a typed API function** in `frontend/src/api/<entity>.ts` using the shared `apiClient` (Axios wrapper).
2. **Extend or create a Zustand store** in `frontend/src/stores/<entity>Store.ts`:
   - Actions: `fetch<Entities>`, `create<Entity>`, `update<Entity>`, `deallocate`, etc.
   - Store subscribes to WebSocket messages for real-time slice updates if applicable.
3. Do **not** call `apiClient` directly from React components — always go through store actions.

---

### Step 6 — Frontend: UI Component

1. Create the component in `frontend/src/components/<Entity>/`.
2. Use the Gantt board store actions for drag-to-assign interactions.
3. Idle-alert banners must include a **"Suggest Reallocation"** button calling `GET /api/v1/suggestions?resource_id=<id>`.
4. All error states must show a user-friendly message — never expose raw API errors.

---

### Step 7 — Tests

#### Backend (Pytest)
- File: `tests/unit/test_<entity>.py` and `tests/integration/test_<entity>_api.py`.
- Use `pytest-asyncio` (`asyncio_mode = "auto"`).
- Each test uses a rolled-back transaction — never commit.
- **Required test cases for any allocation feature**:
  - Happy path: valid allocation succeeds.
  - Double-booking: overlapping time slot returns `409`.
  - Material reservation: insufficient stock returns `409`.
  - RBAC: `ReadOnly` user on mutating route returns `403`.

#### Frontend (React Testing Library)
- Test store actions in isolation (mock `apiClient`).
- Test that WebSocket messages update store state correctly.

#### E2E (Playwright)
- Cover the primary user journey end-to-end (e.g. assign machine → see it on Gantt → receive idle alert → reallocate).

---

### Step 8 — Quality Checklist

Before marking the feature complete:

- [ ] Alembic migration has both `upgrade()` and a working `downgrade()`.
- [ ] No raw SQL strings — all queries via SQLAlchemy ORM.
- [ ] No secrets hardcoded — all via env vars.
- [ ] UUIDs validated at route entry (FastAPI handles via Pydantic `UUID` type).
- [ ] Stack traces never returned in API response bodies.
- [ ] Backend test coverage ≥ 80 % for the new module.
- [ ] Double-booking and stock-reservation edge cases tested.
- [ ] RBAC enforced in `Depends` guards, not in service layer conditionals.
- [ ] Out-of-scope items (ERP, ML, multi-site) not introduced.

---

## References

- [Backend feature guide](./references/backend-feature.md) — model template, service patterns, router boilerplate
- [Frontend feature guide](./references/frontend-feature.md) — Zustand store template, apiClient usage, WebSocket hook
- [Project instructions](../../instructions/instructions.md) — full tech stack rules and business rule constraints
- [Project plan](../../../plan.md) — milestones, architecture diagram, data model
