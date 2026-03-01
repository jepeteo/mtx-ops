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
- Inactivity reminders now use broader client activity signals (projects/tasks/services/notes/decisions/handovers/attachments/vault/assets + client activity logs) and weekly buckets after threshold to reduce noise.
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
- Milestones baseline is implemented with `GET/POST /api/projects/:id/milestones`, `PATCH/DELETE /api/milestones/:id`, and `/app/projects` milestone controls.
- Pending in Phase 3: no major gaps; continue iteration on UX and robustness.

## Phase 4 — Knowledge & Continuity
- Notes
- Decisions (ADR-lite)
- Handovers (acknowledge flow)
- Client Timeline

### Current status (2026-03-01)
- Notes baseline is implemented with `POST /api/notes` and scoped entity validation (`Client`, `Project`, `Task`).
- Client Card now includes note capture and timeline-style note listing for continuity.
- Decisions baseline is implemented with `POST /api/decisions` and Client Card decision capture/list.
- Handovers baseline is implemented with `POST /api/handovers` and `POST /api/handovers/:id/ack` plus Client Card handover capture/ack/list.
- Unified Client timeline baseline is now available by merging notes, decisions, and handovers chronologically on Client Card.
- Pending in Phase 4: additional timeline UX polish.

## Phase 5 — Attachments
- Upload + storage integration
- Attach to entities
- Permissions

### Current status (2026-03-01)
- Attachments baseline is implemented with `POST /api/attachments/presign` and `POST /api/attachments/link` using S3-compatible presigned upload URLs.
- Client Card now supports upload and listing of client-linked attachments.
- Attachment write permissions are now hardened: `presign` and `link` APIs require `ADMIN`/`OWNER`, and Member UI is read-only for uploads.
- Project and Task pages now include entity-level attachment upload/list sections using the same role-aware permissions as Client Card.
- Attachment unlink controls are now available on Client/Project/Task surfaces via `DELETE /api/attachments/links/:linkId`; operations are role-guarded and audited.
- Orphan attachment cleanup now attempts storage object deletion during unlink (`DeleteObject`) with resilient error handling and structured logging.
- A retry cron is implemented at `GET /api/cron/attachments-cleanup` (scheduled in `vercel.json`) to sweep historical orphan attachments and retry storage deletion.
- Pending in Phase 5: no major gaps; continue UX refinement as needed.

## Phase 6 — Vaultwarden
- Vault pointers CRUD
- Reveal flow (fails if vault unreachable)
- Audit entry for reveal

### Current status (2026-03-01)
- Vault pointer CRUD baseline is implemented with `POST /api/vault/pointers` and `PATCH/DELETE /api/vault/pointers/:id`.
- Client Card now includes create/update/delete pointer controls and reveal actions wired to `POST /api/vault/reveal`.
- Reveal and pointer mutations write ActivityLog entries; reveal metadata excludes secret value.
- Reveal UX hardening is implemented: explicit vault-unavailable error messaging plus masked reveal and copy affordances on Client Card.

## Phase 7 — Search & Polish
- Global search is implemented (`/app/search`, `GET /api/search`) for clients/projects/tasks/notes/providers/domains-links.
- App shell navigation and command palette now include Search entry points.
- Command palette now includes richer action shortcuts for dashboard/projects/clients/tasks/search/notifications/export.
- Inactivity reminders are refined with broader client activity sources and weekly post-threshold dedupe buckets.
- Workspace export baseline is implemented via admin-only `GET /api/export/workspace` returning downloadable JSON and logging export activity.
- Admin operations monitoring page is implemented at `/app/admin/operations` to track attachment cleanup events and storage-delete failures from ActivityLog.
- Admin operations page now includes lightweight range/view filters (`24h/7d/30d/all`, `all/cleanup/failures`) for faster incident triage.
- Failure rows in admin operations now include direct entity links (client/project/task context) when metadata is available.
- Admin operations now surfaces top-level counters (cleanup events, failures, failure rate) for at-a-glance health in the selected range.
- Admin operations now also shows a latest cleanup run summary timestamp sourced from the most recent `attachment.cleanup` event.
