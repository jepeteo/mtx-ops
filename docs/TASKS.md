# Build plan (phased)

## Phase 0 — Foundations
- Workspace model (single workspace now)
- Users (manual creation)
- Roles (Owner/Admin/Member)
- Auth (login/logout, middleware)
- Activity log

## Phase 1 — Clients & Intelligence
- Clients CRUD
- Client Card
- Assets/links
- Provider list

## Phase 2 — Services & Renewals
- Services CRUD
- Renewal rules
- Dashboard: expiring soon / overdue / unknown
- Notification generation job + UI

## Phase 3 — Projects & Tasks
- Projects CRUD (keyPrefix per project)
- Tasks CRUD
- Kanban board + list
- Dependencies + blocked state

## Phase 4 — Knowledge & Continuity
- Notes
- Decisions (ADR-lite)
- Handovers with acknowledgement flow
- Client timeline

## Phase 5 — Attachments
- Upload to S3-compatible storage
- Attach to entities
- Permissions

## Phase 6 — Vaultwarden
- Vault pointers CRUD
- Reveal flow + audit log
- Clear UX for vault unreachable

## Phase 7 — Polish
- Global search + command palette
- Inactivity notifications
- Export (workspace JSON)
