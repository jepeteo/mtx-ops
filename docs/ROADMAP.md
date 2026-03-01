# Roadmap — MTX Ops (V1)

## Phase 0 — Foundations
- Auth (email+password)
- Workspace + roles
- ActivityLog (audit trail)
- Basic AppShell + dashboard skeleton

### Current status (2026-02-28)
- Completed in foundation slice: env/db setup scripts, seed workspace + owner, login/logout/session cookie auth, `/app` protection, role guards, shared error envelope, auth activity logging, minimal protected dashboard, and admin user lifecycle controls (create/list/role/status/password reset) with active-account enforcement.
- Pending in Phase 0: broader role-enforced admin workflows beyond user management.

## Phase 1 — Clients & Intelligence
- Clients CRUD
- Client Card (Overview + Assets/Links)
- Providers catalog

### Current status (2026-02-28)
- Baseline client CRUD is available (list/create/view/edit/delete) with workspace scoping and audit logging on create/update/delete.
- API baseline aligned for clients: `GET /api/clients`, `POST /api/clients`, `GET/PATCH/DELETE /api/clients/:id` with standard envelopes for JSON callers.
- Pending in Phase 1: provider catalog and richer Client Card intelligence sections.

## Phase 2 — Services & Renewals

### Current status (2026-03-01)
- Services CRUD baseline is now available (list/create/delete via UI, plus `GET/POST` and `PATCH/DELETE` APIs).
- Renewal, due-date (tasks), and inactivity cron generators now produce deduped notifications; Notification Center lists notifications with snooze/mark-handled actions.
- All service and notification mutations write ActivityLog and enforce workspace scoping.
- Baseline task capture/list is now available via `/app/tasks` and `/api/tasks` so due-date notifications are sourced from real workspace tasks.
- Notification tabs/filtering and renewal reminder rule editing are now available in the app UI.
- Pending in Phase 2: no major gaps; continue iteration via bug fixes and UX cleanup as needed.

## Phase 3 — Projects & Tasks
- Projects CRUD (+ project keyPrefix)
- Milestones
- Tasks CRUD
- Kanban + List
- Dependencies + Blocked status

### Current status (2026-03-01)
- Baseline project model is in place with workspace-scoped unique `keyPrefix` and client ownership.
- API baseline now includes `GET/POST /api/clients/:id/projects` and `GET/POST /api/projects/:id/tasks`.
- `/app/projects` now supports project create/list/status update/delete; `/app/tasks` supports optional project linkage.
- Task dependency baseline is implemented via `POST /api/tasks/:id/dependencies` and visible dependency counts in `/app/tasks`.
- `/app/tasks` now supports list and baseline kanban views (`?view=kanban`) with status buckets.
- Inline edit workflows are now available for project name/prefix/status and task title/project/due-date/status.
- Pending in Phase 3: milestones.

## Phase 4 — Knowledge & Continuity
- Notes
- Decisions (ADR-lite)
- Handovers (acknowledge flow)
- Client Timeline

## Phase 5 — Attachments
- Upload + storage integration
- Attach to entities
- Permissions

## Phase 6 — Vaultwarden
- Vault pointers CRUD
- Reveal flow (fails if vault unreachable)
- Audit entry for reveal

## Phase 7 — Search & Polish
- Global search (clients/domains/providers/tasks/notes)
- Command palette actions
- Inactivity notifications
- Export workspace JSON
