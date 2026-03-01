# Backlog (V1)

This backlog is written as **epics → user stories → acceptance criteria**.

## Epic A — Foundations
Status note (2026-02-28): baseline auth/session/RBAC guards/audit helper are implemented; manual user create/list and role/status/password reset controls are available for admin users.

### A1 — Login/Logout
- As a user, I can log in with email+password.
- As a user, I can log out and my session is invalidated.
**Acceptance**
- Session cookie is HttpOnly; Secure in prod; SameSite=Lax.
- Failed logins are rate limited.

### A2 — Workspace + Roles
- As Owner/Admin, I can create users manually.
- As Owner/Admin, I can assign roles (Owner/Admin/Member).
**Acceptance**
- Role checks enforced on server for sensitive routes.

### A3 — Audit trail
- As an owner, I can see who changed what.
**Acceptance**
- Every create/update/delete writes ActivityLog.

## Epic B — Clients & Intelligence
Status note (2026-02-28): client CRUD baseline is implemented (list/create/view/edit/delete) with workspace-scoped APIs and mutation audit logs.

### B1 — Client CRUD
### B2 — Client Card overview
### B3 — Assets & Links

## Epic C — Services & Renewals
Status note (2026-03-01): services CRUD baseline is implemented; renewal/task-due/inactivity cron + Notification Center baseline are now wired with snooze/mark-handled actions, and renewal reminder rules are editable from the Client Card.

### C1 — Service CRUD
### C2 — Renewal reminders
### C3 — Notification Center

## Epic D — Projects & Tasks
Status note (2026-03-01): projects baseline is implemented with keyPrefix uniqueness, client-scoped project create/list/status-update/delete, project-linked task APIs (`/api/projects/:id/tasks`), task dependency baseline (`POST /api/tasks/:id/dependencies`), milestone baseline (`GET/POST /api/projects/:id/milestones`, `PATCH/DELETE /api/milestones/:id`), list + baseline kanban task views, and inline project/task/milestone editing controls in `/app/projects` and `/app/tasks`.

### D1 — Projects + keyPrefix
### D2 — Milestones
### D3 — Tasks (Kanban + list)
### D4 — Dependencies/blocked

## Epic E — Knowledge & Continuity
Status note (2026-03-01): notes/decisions/handovers baseline is implemented via `POST /api/notes`, `POST /api/decisions`, `POST /api/handovers`, and `POST /api/handovers/:id/ack`, with Client Card capture/list UI, acknowledgement controls, and a unified chronological client timeline.

### E1 — Notes
### E2 — Decisions (ADR-lite)
### E3 — Handovers + acknowledgement
### E4 — Client timeline

## Epic F — Attachments
Status note (2026-03-01): attachments baseline is implemented with `POST /api/attachments/presign` and `POST /api/attachments/link`, plus Client Card upload/list UI.
Status note (2026-03-01): attachment permissions are hardened with Admin/Owner-only write access on presign/link endpoints and Member read-only upload UX.
Status note (2026-03-01): broader entity-level attachment UX is implemented with upload/list sections on Project and Task pages.
Status note (2026-03-01): unlink controls are implemented on Client/Project/Task attachment rows via `DELETE /api/attachments/links/:linkId`, with ActivityLog entries and orphan attachment cleanup.
Status note (2026-03-01): orphan unlink cleanup now attempts S3 object deletion with structured error logging while keeping unlink flow resilient.
Status note (2026-03-01): orphan cleanup retry cron is implemented via `GET /api/cron/attachments-cleanup` to sweep aged orphan attachments and retry storage deletion.

### F1 — Upload
### F2 — Link to entities

## Epic G — Vaultwarden
Status note (2026-03-01): vault pointer CRUD baseline is implemented (`POST /api/vault/pointers`, `PATCH/DELETE /api/vault/pointers/:id`) with Client Card create/update/delete/reveal controls and audit logging for reveal actions.
Status note (2026-03-01): reveal UX hardening is implemented with explicit upstream-unavailable messaging and masked/copy secret affordances in Client Card pointer actions.

### G1 — Vault pointer CRUD
### G2 — Reveal secret + audit

## Epic H — Search & Quality
Status note (2026-03-01): global search baseline is implemented with `/app/search` + `GET /api/search` scoped to workspace and grouped for clients/projects/tasks/notes. App shell nav and command palette include Search shortcuts.
Status note (2026-03-01): global search is expanded to provider/domain-link coverage (services and asset links), and command palette shortcuts now include dashboard/projects navigation.
Status note (2026-03-01): inactivity reminder refinement is implemented in cron with expanded client activity signals (entity updates + client-linked notes/decisions/handovers/attachments + client activity logs) and weekly dedupe buckets after threshold.
Status note (2026-03-01): workspace export baseline is implemented via admin-only `GET /api/export/workspace`, returning downloadable deterministic JSON and writing `workspace.export` activity logs.
Status note (2026-03-01): admin operations monitoring page is implemented at `/app/admin/operations` for attachment cleanup and storage-delete failure visibility.
Status note (2026-03-01): admin operations page now includes range/view filters to isolate recent cleanup activity and failures.
Status note (2026-03-01): failure rows in admin operations include direct entity links (when metadata exists) for faster navigation.
Status note (2026-03-01): admin operations page now includes summary counters for cleanup events, failures, and failure rate within the selected range.
Status note (2026-03-01): admin operations page now includes a latest cleanup run summary from the newest `attachment.cleanup` event.
Status note (2026-03-01): admin operations page now includes an admin-only manual trigger to run attachment cleanup on demand.
Status note (2026-03-01): manual cleanup outcome is persisted as a result banner on operations page after refresh/navigation.
Status note (2026-03-01): result banner now includes a clear action that preserves range/view filters.

### H1 — Global search
### H2 — Inactivity reminders
### H3 — Export
