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
Status note (2026-03-01): notes baseline is implemented via `POST /api/notes` with scoped entity validation and Client Card note capture/list UI.

### E1 — Notes
### E2 — Decisions (ADR-lite)
### E3 — Handovers + acknowledgement
### E4 — Client timeline

## Epic F — Attachments
### F1 — Upload
### F2 — Link to entities

## Epic G — Vaultwarden
### G1 — Vault pointer CRUD
### G2 — Reveal secret + audit

## Epic H — Search & Quality
### H1 — Global search
### H2 — Inactivity reminders
### H3 — Export
