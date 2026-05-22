# API spec (V1)

## Conventions
- JSON only
- Validate all inputs with Zod at the boundary
- Mutations must write ActivityLog
- Errors use a consistent envelope

### Error envelope
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }
```

## Auth
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password` — body `{ email }`; returns `404` when no user exists for that email; sends Resend email when user is active (`RESEND_API_KEY` + `AUTH_EMAIL_FROM` or `INVOICE_EMAIL_FROM`)
- `POST /api/auth/reset-password` — body `{ token, password }`; consumes one-time token from email link

## Clients
- `GET /api/clients`
- `POST /api/clients`
- `GET /api/clients/:id`
- `PATCH /api/clients/:id`
- `DELETE /api/clients/:id`

## Services
- `GET /api/clients/:id/services`
- `POST /api/clients/:id/services`
- `PATCH /api/services/:id`
- `DELETE /api/services/:id`

## Projects & Tasks
- `GET /api/clients/:id/projects`
- `POST /api/clients/:id/projects`
- `GET /api/projects/:id/tasks`
- `POST /api/projects/:id/tasks`
- `PATCH /api/tasks/:id`
- `POST /api/tasks/:id/dependencies`

## Notes / Decisions / Handovers
- `POST /api/notes`
- `POST /api/decisions`
- `POST /api/handovers`
- `POST /api/handovers/:id/ack`

## Attachments
- `POST /api/attachments/presign`
- `POST /api/attachments/link`

## Notifications
- `GET /api/notifications`
- `POST /api/notifications/:id/snooze`
- `POST /api/notifications/:id/mark-handled`

## Vaultwarden
- `POST /api/vault/reveal` (body: vaultPointerId)
- `POST /api/vault/pointers`

## Invoicing (Phase 8)
- `GET /api/invoices` (filters: clientId, status, from, to, overdueOnly)
- `POST /api/invoices`
- `GET /api/invoices/:id`
- `PATCH /api/invoices/:id`
- `POST /api/invoices/:id/mark-sent`
- `POST /api/invoices/:id/mark-paid`
- `POST /api/invoices/:id/mark-void`
- `POST /api/invoices/:id/line-items`
- `PATCH /api/invoice-line-items/:id`
- `DELETE /api/invoice-line-items/:id`
- `GET /api/invoices/:id/pdf`
- `POST /api/invoices/:id/send-email`

### Invoicing notes
- Persisted invoice statuses are constrained to `draft`, `sent`, `paid`, `void`; `overdue` is computed at read time.
- All invoice endpoints must enforce strict workspace scoping.
- Mutations and send actions must write ActivityLog entries.
- Email delivery is done through Resend.
- `GET /api/invoices/:id/pdf` returns a generated PDF (server-side render, trusted DB data).
- `POST /api/invoices/:id/send-email` requires header `Idempotency-Key`, body `{ recipientEmail }`, attaches the same PDF, and uses `RESEND_API_KEY` + `INVOICE_EMAIL_FROM` from the environment. Cross-workspace access returns `NOT_FOUND`. Idempotent replays return the prior success payload without sending again.
- Current implementation status: invoice CRUD, line items, PDF download, and Resend email send are implemented.
- No payment provider integration in this phase.
- No accounting sync in this phase.
