# AI Agent Prompts (copy/paste)

These prompts are designed for incremental, safe implementation.

## Global rules (do not violate)
- TypeScript strict; no `any`.
- No business logic in React components.
- Validate all inputs with Zod at the boundary.
- DB access via `src/lib/db/*` only.
- Every mutation writes `ActivityLog`.
- Never store plaintext secrets; only Vault pointers.
- Errors must use the standard envelope (see `docs/spec/API_SPEC.md`).

---

## Prompt — Phase 0 (Auth + Workspace)
Implement Phase 0 using the existing folder structure.

### Requirements
- Endpoints:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- Session:
  - JWT in HttpOnly cookie
  - SameSite=Lax, Secure in production
  - TTL configurable
- Middleware:
  - protect `/app/*`
- UI:
  - `/login`
  - `/app` (dashboard skeleton)
- Add rate limiting to login.

### Deliverable
Return code changes only. Do not change unrelated files.

---

## Prompt — Phase 2 (Services & Renewals)
Add Services CRUD + renewal reminders.

### Requirements
- Services belong to a Client.
- Fields: type, provider, renewalDate, cycle, cost, payer, autoRenew, status.
- Cron endpoint generates notifications at 60/30/14/7 days.
- Dashboard widgets show expiring 7/30, overdue, unknown.

### Deliverable
Return code changes only. Include Zod schemas.
