# Build plan (phased)

Status note (2026-03-01): Phase 0 baseline is delivered (auth/session, RBAC guards, audit log helper, seeded workspace owner, and admin user lifecycle controls). Phase 2 due-date notifications are generated from baseline workspace tasks. Phase 3 core baseline is now delivered with projects CRUD, milestones baseline, task dependencies, and list/kanban task views. Phase 4 baseline includes notes, decisions, and handovers with acknowledgement flow. Phase 5 baseline includes attachment presign/link APIs and Client Card upload/list UI. Phase 6 baseline includes vault pointer CRUD and reveal controls with audit logging.

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
- Upload to S3-compatible storage (Client/Project/Task surfaces)
- Attach to entities (Client/Project/Task)
- Permissions (implemented: Admin/Owner write, Member read-only upload UI)
- Unlink controls (implemented with audited Admin/Owner actions)
- Storage cleanup on orphan unlink (implemented via S3 delete attempt + server logging)
- Cleanup retry cron (implemented via `/api/cron/attachments-cleanup`)

## Phase 6 — Vaultwarden
- Vault pointers CRUD
- Reveal flow + audit log
- Clear UX for vault unreachable (implemented with explicit errors + masked reveal/copy actions)

## Phase 7 — Polish
- Global search + command palette (expanded coverage for clients/projects/tasks/notes/providers/domains-links and richer shortcuts)
- Inactivity notifications (refined: broader activity sources + weekly reminder buckets)
- Export (workspace JSON baseline implemented via admin-only API)
- Admin operations monitoring (implemented for attachment cleanup visibility)
- Admin operations filtering (implemented with range/view controls)
- Admin operations entity links (implemented for failure row navigation)
- Admin operations counters (implemented for cleanup/failure at-a-glance health)
- Admin operations latest cleanup summary (implemented)
- Admin operations manual cleanup trigger (implemented)
