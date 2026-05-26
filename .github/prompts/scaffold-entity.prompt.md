---
description: "Scaffold a complete backend entity for the Shop Floor Resource Allocation system: SQLAlchemy model, Pydantic v2 schemas, async service layer, FastAPI router, and Alembic migration command. Use when adding a new entity or extending an existing one."
name: "Scaffold Shop Floor Entity"
argument-hint: "Entity name and optional fields, e.g. 'Operator with name, skill_set, shift'"
agent: "agent"
tools: ["codebase", "changes"]
---

You are scaffolding a new backend entity for the **Shop Floor Resource Allocation** system.

Follow ALL conventions in [instructions.md](../.github/instructions/instructions.md) and the patterns in [backend-feature.md](../.github/skills/shop-floor-resource-allocation/references/backend-feature.md).

## Entity to scaffold

**$ARGUMENTS**

---

## What to generate

Produce the following files. Create them if they do not exist; extend them if they do.

### 1. `backend/models/<entity_snake>.py`
- Class inherits from `Base`.
- `id: Mapped[uuid.UUID]` — `default=uuid.uuid4`, `primary_key=True`.
- All timestamp columns use `DateTime(timezone=True)`.
- Include `deleted_at: Mapped[datetime | None]` for soft-delete.
- Add `__repr__` returning `f"<EntityName id={self.id}>"`.

### 2. `backend/schemas/<entity_snake>.py`
Generate three Pydantic v2 models:
- `<Entity>Create` — fields required at creation (no `id`, no timestamps).
- `<Entity>Update` — same fields but all `Optional[...]` with `None` defaults.
- `<Entity>Read` — full response model including `id`, `created_at`, `updated_at`; configure with `model_config = ConfigDict(from_attributes=True)`.

### 3. `backend/services/<entity_snake>.py`
Async CRUD functions, each accepting `AsyncSession` as first arg:
- `get_<entity>(db, id)` → returns entity or raises `HTTPException(404)`.
- `list_<entities>(db, page, page_size)` → returns `(items, total)` tuple.
- `create_<entity>(db, payload, created_by)` → persists and returns new entity.
- `update_<entity>(db, id, payload)` → partial update, returns updated entity.
- `delete_<entity>(db, id)` → sets `deleted_at = now()` (soft-delete), never hard-deletes.

### 4. `backend/routers/<entity_snake>.py`
FastAPI router:
- Prefix: `/api/v1/<plural_entity_kebab>`.
- All routes protected with `Depends(get_current_user)`.
- `POST /` — requires `supervisor` role.
- `GET /` — paginated list; returns `{"items": [...], "total": n, "page": n, "page_size": n}`.
- `GET /{id}` — single entity or 404.
- `PATCH /{id}` — partial update; requires `supervisor` role.
- `DELETE /{id}` — soft-delete; requires `manager` role.

### 5. Migration command (print, do not run)
Print the exact Alembic command to run after the files are created:
```
alembic revision --autogenerate -m "add_<entity_snake_plural>"
```
And remind the developer to **review the generated migration** for correctness before applying it.

---

## Constraints

- No serial integer PKs — UUID only.
- No raw SQL strings in service or router files.
- No secrets or connection strings hardcoded anywhere.
- Do not implement ERP sync, ML features, or multi-site logic.
- If the entity is `Allocation`, also add the double-booking partial unique index stub in the migration (see backend-feature.md).

## Output format

Create each file with proper Python imports. After all files are created, print a summary table:

| File | Action (created / updated) |
|---|---|
| `backend/models/...` | |
| `backend/schemas/...` | |
| `backend/services/...` | |
| `backend/routers/...` | |

Then print the migration command and any manual follow-up steps.
