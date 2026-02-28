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

## Phase 2 — Services & Renewals
- Services CRUD
- Renewal rules + reminder schedule
- Notification generator (cron)
- Dashboard widgets + Notification Center UI

## Phase 3 — Projects & Tasks
- Projects CRUD (+ project keyPrefix)
- Milestones
- Tasks CRUD
- Kanban + List
- Dependencies + Blocked status

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
