# Shop Floor Resource Allocation System — Project Plan

## Overview

A web-based system for manufacturing supervisors to assign operators, machines, and materials
to work orders, with real-time reallocation capabilities to minimize idle time.

---

## Goals

- Provide supervisors a unified dashboard to manage all shop floor resources.
- Enable real-time, drag-and-drop allocation of operators, machines, and materials to work orders.
- Surface idle-time alerts and suggest reallocation actions automatically.
- Maintain a full audit trail of all allocation changes.

---

## Functional Requirements

### Work Orders
- Create, view, update, and close work orders.
- Each work order has: ID, product, quantity, priority, start/end time, status (Pending / In Progress / Complete / On Hold).
- Work orders can be filtered by status, date, and machine.

### Resources
| Resource Type | Attributes |
|---|---|
| Operator | ID, name, skill set, shift, current assignment |
| Machine | ID, name, type, capacity, current status (idle/running/maintenance) |
| Material | ID, name, unit, quantity on hand, reserved quantity |

### Allocation
- Assign one or more operators, machines, and materials to a work order.
- Prevent double-booking of operators or machines on overlapping time slots.
- Allow partial re-allocation without stopping the work order.
- Drag-and-drop Gantt-style board for visual scheduling.

### Idle-Time Minimization
- Real-time idle status feed for all machines and operators.
- Automatic suggestion: when a machine or operator becomes idle, surface eligible pending work orders.
- Configurable idle threshold (default: 5 minutes) before an alert fires.

### Notifications & Alerts
- Alert supervisor when a machine has been idle beyond the threshold.
- Alert when material stock drops below reserved quantity.
- Alert when a work order is at risk of missing its deadline.

### Audit Trail
- Log every allocation and reallocation with timestamp and supervisor ID.
- Exportable as CSV / PDF.

---

## Non-Functional Requirements

- Response time < 2 s for all dashboard updates.
- Support at least 50 concurrent supervisors.
- Role-based access control (Supervisor / Manager / Read-Only).
- Data encrypted at rest and in transit (TLS 1.2+).
- Available 99.5% uptime during production hours.

---

## Proposed Architecture

```
┌─────────────────────────────────────┐
│           Browser / UI              │
│  React + Gantt component (DHTMLX    │
│  or custom canvas-based)            │
└───────────────┬─────────────────────┘
                │ REST / WebSocket
┌───────────────▼─────────────────────┐
│           API Layer                 │
│  FastAPI (Python 3.12)              │
│  JWT auth · OpenAPI docs            │
└────┬──────────────┬─────────────────┘
     │              │
┌────▼─────┐  ┌─────▼──────────────────┐
│ PostgreSQL│  │ Redis (pub/sub for     │
│ (primary  │  │ idle-time events &     │
│  data)    │  │ real-time updates)     │
└──────────┘  └────────────────────────┘
```

---

## Data Model (Key Entities)

```
WorkOrder        Operator         Machine                    Material
---------        --------         -------                    --------
id (UUID PK)     id (UUID PK)     id (UUID PK)               id (UUID PK)
product          name             name                       name
quantity         skill_set[]      type                       unit
priority         shift            capacity                   qty_on_hand
status           deleted_at       status (idle/running/maint)qty_reserved
start_at         created_at       idle_threshold_minutes     deleted_at
end_at           updated_at       last_idle_at               created_at
deleted_at                        deleted_at                 updated_at
created_at                        created_at
updated_at                        updated_at

NOTE: Operator has NO current_wo_id — Allocation is the single source of truth
      for all active assignments.

Allocation (junction — append-only, never mutate active rows)
---------------------
id (UUID PK)
work_order_id (FK → WorkOrder)
operator_id   (FK → Operator,  nullable)
machine_id    (FK → Machine,   nullable)
material_id   (FK → Material,  nullable)
quantity_used (for materials)
allocated_at  (TIMESTAMPTZ, NOT NULL)
deallocated_at(TIMESTAMPTZ, NULL = currently active)
allocated_by  (FK → User/supervisor UUID, NOT NULL)
created_at

DB constraint: partial unique index on (machine_id) and (operator_id)
              WHERE deallocated_at IS NULL  →  enforces no double-booking
```

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React 18 + TypeScript | Component model suits real-time dashboard |
| Gantt / Schedule | Custom canvas or DHTMLX Gantt | Drag-and-drop allocation board |
| State management | Zustand | Lightweight, suits real-time updates |
| Real-time | WebSocket via FastAPI + Redis pub/sub | Low-latency idle alerts |
| Backend | FastAPI (Python 3.12) | Async, auto OpenAPI, fast |
| ORM | SQLAlchemy 2 + Alembic | Migrations, async queries |
| Database | PostgreSQL 16 | Relational integrity for allocations |
| Cache / events | Redis 7 | Idle-time event bus |
| Auth | JWT + OAuth2 password flow | Standard, stateless |
| Testing | Pytest + React Testing Library | Unit + integration + E2E (Playwright) |
| CI/CD | GitHub Actions | Lint → test → build → deploy |
| Containers | Docker + Docker Compose | Consistent local & prod environments |

---

## Milestones

### Phase 1 — Foundation (Weeks 1–2)
- [ ] Project scaffold: monorepo (`/frontend`, `/backend`), Docker Compose, CI pipeline.
- [ ] Database schema + Alembic migrations for WorkOrder, Operator, Machine, Material, Allocation (with `deleted_at`, `idle_threshold_minutes`, correct UUID PKs).
- [ ] CRUD REST endpoints for WorkOrder, Operator, Machine, Material (basic Allocation create/read — **no conflict detection yet**, added in Phase 2).
- [ ] JWT auth skeleton + RBAC `Depends` guards wired up for all routes (role enforcement completed in Phase 4, but guards must exist from day one).
- [ ] Pytest infrastructure: `pytest-asyncio` config, per-test rolled-back DB transaction fixture.
- [ ] Basic React app shell with authentication (login / logout).

### Phase 2 — Core Allocation (Weeks 3–4)
- [ ] Allocation endpoints with conflict detection (double-booking guard).
- [ ] Gantt-style allocation board (read + drag-to-assign).
- [ ] Material reservation logic with stock validation.
- [ ] Unit + integration tests for allocation business rules.

### Phase 3 — Real-Time & Idle Alerts (Weeks 5–6)
- [ ] Redis pub/sub: publish to `machine:idle` / `operator:idle` channels on deallocation.
- [ ] WebSocket endpoint (`/api/v1/ws`); frontend subscribes via shared Zustand WS store.
- [ ] Idle-alert banner with one-click **"Suggest Reallocation"** button.
- [ ] `GET /api/v1/suggestions?resource_id=<uuid>` endpoint returning ranked pending work orders.
- [ ] WebSocket fallback: poll `GET /api/v1/resources/idle` every 10 s when WS is disconnected.
- [ ] Configurable idle threshold per machine type (stored in `machine.idle_threshold_minutes`, default 5).

### Phase 4 — Reporting & Polish (Weeks 7–8)
- [ ] Audit trail log view + CSV/PDF export.
- [ ] Dashboard KPIs: utilisation %, on-time delivery rate, idle time per shift.
- [ ] Complete RBAC enforcement: Supervisor (allocate/reallocate), Manager (+ close work orders), Read-Only (GET only).
- [ ] Structured error response bodies — never expose stack traces in API responses.
- [ ] End-to-end tests (Playwright): drag-to-assign, idle-alert dismiss, CSV export, RBAC boundary flows.
- [ ] Performance testing (≥50 concurrent users, response < 2 s).
- [ ] Verify TLS 1.2+ and encryption-at-rest configuration.
- [ ] Production deployment runbook.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Double-booking race condition under concurrent edits | Medium | High | Optimistic locking + DB-level partial unique index on `(machine_id) WHERE deallocated_at IS NULL` |
| RBAC bypass during Phase 1–3 (guards wired but not fully enforced) | Medium | High | Wire `Depends` guards in Phase 1; complete role enforcement in Phase 4; add RBAC integration tests in Phase 2 |
| WebSocket connection drops causing missed idle alerts | Medium | Medium | Fallback: poll `GET /api/v1/resources/idle` every 10 s; reconnect with exponential back-off |
| JWT token expiry during long supervisor sessions | Low | Medium | Short-lived access token (15 min) + refresh token rotation; frontend handles 401 with silent refresh |
| Real-time latency spikes | Low | Medium | Redis pub/sub with 10 s polling fallback |
| Material stock inaccuracy (ERP sync lag) | Medium | Medium | Post-MVP ERP webhook; show last-sync timestamp in UI |
| Scope creep on Gantt features | High | Medium | Lock Gantt scope to assign/move; advanced features as post-MVP backlog |

---

## Out of Scope (MVP)

- ERP / MES integration (planned post-MVP).
- Mobile native app (responsive web is sufficient for MVP).
- Predictive scheduling via ML.
- Multi-plant / multi-site support.

---

## Definition of Done

- All acceptance criteria for the milestone are met.
- Test coverage ≥ 80% (backend), key flows covered (frontend).
- No critical or high-severity open bugs.
- Peer-reviewed and merged to `main`.
- Deployed to staging and signed off by product owner.
