---
description: "Use when writing, reviewing, or generating code for the Shop Floor Resource Allocation system. Covers project architecture, tech stack conventions, allocation business rules, real-time event patterns, API design, data model, and testing standards."
applyTo: ["backend/**", "frontend/**", "tests/**", "alembic/**", "docker-compose*.yml"]
---

# Shop Floor Resource Allocation — Coding Instructions

## Project Context

A web-based manufacturing tool for supervisors to assign **operators**, **machines**, and **materials**
to **work orders** and reallocate them in real time to minimise idle time.

Monorepo layout:
```
/backend    FastAPI (Python 3.12), SQLAlchemy 2, Alembic, Redis
/frontend   React 18 + TypeScript, Zustand, WebSocket client
/tests      Pytest (backend), Playwright (E2E)
```

---

## Tech Stack Rules

### Backend (Python / FastAPI)
- Python **3.12**. Use `async def` for all route handlers and DB calls.
- Use **SQLAlchemy 2** async session (`AsyncSession`) — never use the sync API.
- All schema migrations via **Alembic** with `--autogenerate`. Never ALTER tables manually.
- Use **Pydantic v2** models for request/response validation. Do not use `dict` for API I/O.
- Auth: **JWT** (OAuth2 password flow). Protect every route with `Depends(get_current_user)`.
- Return HTTP **409 Conflict** when a double-booking constraint is violated.
- Return HTTP **422** (FastAPI default) for validation errors — do not override with 400.

### Frontend (React / TypeScript)
- **React 18** with functional components and hooks only — no class components.
- Global state via **Zustand** stores. Do not use Redux or Context for cross-component state.
- Real-time updates via a single shared **WebSocket** connection managed in a Zustand store.
- All API calls via a typed `apiClient` wrapper (Axios-based) — never call `fetch` directly.
- Gantt / schedule board interactions must be handled through allocation store actions, not direct API calls from components.

---

## Data Model Conventions

- Primary keys: `id UUID DEFAULT gen_random_uuid()` — never use serial integers.
- All timestamps: `TIMESTAMPTZ` (UTC). Expose as ISO-8601 strings in the API.
- Soft-delete resources with `deleted_at TIMESTAMPTZ NULL` — never hard-delete operators, machines, or materials.
- The `Allocation` table is the single source of truth for who/what is assigned where and when.
- `deallocated_at NULL` means the allocation is currently active.

### Key entities

| Entity | Notes |
|---|---|
| `WorkOrder` | Has `status`: `pending \| in_progress \| complete \| on_hold` |
| `Operator` | Has `skill_set TEXT[]` and `shift` enum |
| `Machine` | Has `status`: `idle \| running \| maintenance`; track `last_idle_at` |
| `Material` | Track `qty_on_hand` and `qty_reserved` separately |
| `Allocation` | Junction: links work_order ↔ operator/machine/material with time range |

---

## Allocation Business Rules

1. **No double-booking**: An operator or machine may not have two active allocations with overlapping time ranges. Enforce with a DB partial unique index AND a 409 response in the API.
2. **Material reservation**: When allocating material, decrement `qty_reserved` atomically. Reject if `qty_on_hand - qty_reserved < requested_qty`.
3. **Partial reallocation**: De-allocating a resource sets `deallocated_at = now()` on the existing row and inserts a new `Allocation` row — never mutate an active allocation's resource FKs.
4. **Audit trail**: Every INSERT/UPDATE on `Allocation` must record `allocated_by` (supervisor UUID). Do not allow anonymous allocation changes.

---

## Real-Time / Idle-Alert Patterns

- Idle events are published to Redis channel `machine:idle` and `operator:idle` as JSON:
  `{"resource_id": "<uuid>", "resource_type": "machine|operator", "idle_since": "<iso8601>"}`.
- The FastAPI WebSocket endpoint subscribes to Redis and fans out to connected clients.
- Idle threshold is configurable per machine type (default **5 minutes**). Store in DB, not in code.
- Frontend idle-alert banner must include a **one-click "suggest reallocation"** action that queries `/api/v1/suggestions?resource_id=<id>`.
- Fallback: if WebSocket is disconnected, poll `/api/v1/resources/idle` every **10 seconds**.

---

## API Design

- All routes versioned under `/api/v1/`.
- Use plural nouns: `/work-orders`, `/operators`, `/machines`, `/materials`, `/allocations`.
- Pagination: `?page=1&page_size=50` (max 200). Always return `total`, `page`, `page_size` in list responses.
- Filter params use snake_case: `?status=pending`, `?machine_id=<uuid>`.
- Suggestions endpoint: `GET /api/v1/suggestions?resource_id=<uuid>` returns ranked pending work orders.

---

## Testing Standards

### Backend (Pytest)
- Use `pytest-asyncio` with `asyncio_mode = "auto"`.
- Each test gets a fresh DB transaction rolled back after the test — never commit in tests.
- **Always** test the double-booking constraint and the material-reservation edge cases.
- Target ≥ **80 % line coverage** on `backend/`.

### Frontend (React Testing Library + Playwright)
- Unit-test allocation store actions and WebSocket reconnect logic.
- E2E (Playwright): cover drag-to-assign on Gantt, idle-alert dismiss, and CSV export flows.

---

## Security Requirements

- Validate all UUIDs at route entry; reject malformed IDs with 422.
- Never expose internal stack traces in API responses (use structured error bodies).
- RBAC: `Supervisor` can allocate/reallocate. `Manager` can also close work orders. `ReadOnly` is GET-only. Enforce in `Depends` guards, not in business logic.
- All secrets (DB URL, JWT secret, Redis URL) via environment variables — never hardcoded.

---

## Out of Scope (do not implement)

- ERP / MES integration.
- Mobile native app.
- ML-based predictive scheduling.
- Multi-plant / multi-site support.