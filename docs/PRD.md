# PRD — MTX Ops (V1)

## 1. Product summary
**MTX Ops** is the internal operating system for MTX Studio (Teo + partner). It replaces scattered tools (notes, spreadsheets, chats, bookmarks) with a single **source of truth** for:
- Client intelligence (where things live, what renews, who pays)
- Projects + tasks (Kanban + list)
- Continuity (notes, decisions, handovers)
- Centralized notifications (renewals, due dates, inactivity)
- Attachments (contracts, screenshots, PDFs)
- Secure secret retrieval via **Vaultwarden pointers** (no plaintext secrets stored in the app DB)

**Hosting:** Vercel (app subdomain: `ops.mtxstudio.com`)  
**DB:** Neon Postgres  
**Secrets vault:** Vaultwarden at `vault.jepeteonet.eu`

## 2. Users & roles
### Roles (V1)
- **Owner:** full access, manage users/workspace, security settings
- **Admin:** full access except workspace ownership transfer
- **Member:** can view/edit depending on future per-client visibility rules

### V1 assumptions
- Workspace starts as a single workspace: **MTX Studio**
- Users are created **manually** by Owner/Admin
- Per-client visibility restrictions are **designed for**, but may start as “everyone sees everything”

## 3. Core jobs-to-be-done
1) *“I need everything about Client X in 20 seconds.”*  
2) *“A renewal is coming—don’t let it slip.”*  
3) *“A request came in—capture it fast and convert it into a trackable plan.”*  
4) *“My partner said something—make it impossible to lose.”*  
5) *“I need an API key now—retrieve it safely.”*

## 4. Scope
### In-scope for V1
- Workspace + auth + roles
- Client Card (overview, assets, services, agency services, credentials pointers)
- Services & renewals + notifications
- Projects, milestones, tasks (Kanban + list)
- Notes, Decisions (ADR-lite), Handovers (with acknowledgement)
- Attachments (S3-compatible storage)
- Notification Center + dashboard widgets
- Global search + command palette (initial)
- Activity/Audit log for mutations + sensitive actions

### Explicitly out-of-scope for V1
- Email ingestion/forwarding
- Automatic sync integrations (GitHub/Stripe/Cloudflare) — links/manual records only
- Step-up auth for secret reveal (V1 = normal login)
- Offline mode/mobile native app (responsive UI only)

## 5. Information architecture
### Primary entities
- Workspace, User, Client, Contact
- Service (external subscription) + AgencyService (what client pays MTX)
- AssetLink (dashboards/admin URLs) + Provider
- VaultPointer (Vaultwarden item reference)
- Project, Milestone, Task, Dependencies
- Note, Decision, Handover
- Attachment + AttachmentLink
- Notification
- ActivityLog

## 6. UX principles
- **Retrieval-first:** everything is searchable; Client Card is the command center.
- **Low friction capture:** add request → convert to task/project quickly.
- **Continuity by design:** handovers require acknowledgement.
- **Serious UI:** minimal, dark, high signal; one accent color (#1C2C4C) used sparingly.

## 7. Success metrics
- Time-to-find critical client info: **< 20s**
- Missed renewals: **0**
- Unacknowledged handovers older than 24h: **near 0**
- Weekly summary automatically generated from ActivityLog/TimeEntries (V2)

## 8. Milestones
See `docs/ROADMAP.md` and `docs/BACKLOG.md`.
