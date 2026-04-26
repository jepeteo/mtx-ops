# Security posture (V1)

## Secrets
- Secrets live in Vaultwarden.
- App DB stores **Vault pointers only** (item id + field name + label).
- Reveal fetches secrets from Vaultwarden and displays transiently.
- V1 has **no offline cache**: if Vaultwarden is unreachable, reveal fails.

## Sessions
- JWT stored in HttpOnly cookie.
- SameSite=Lax; Secure in production.
- Session TTL configurable.

## Authorization
- Server-enforced role checks.
- Workspace-level permissions now; designed for per-client visibility later.

## Audit
- Every mutation writes ActivityLog.
- Sensitive action `vault.reveal` logs metadata only (never secret values).

## Attachments
- Store files in S3-compatible storage.
- Only store metadata + storage key in DB.

## Invoicing (Phase 8)
- Invoices are strictly workspace-scoped on all reads/writes and exports.
- Invoice status transitions for persisted values (`draft`, `sent`, `paid`, `void`) are server-validated; `overdue` is derived for display, not stored.
- Invoice PDFs must be generated from server-side trusted data, not client-submitted totals.
- Invoice email uses Resend; API keys and `INVOICE_EMAIL_FROM` are environment variables only, never in the database.
- `IdempotencyRecord` stores a small safe JSON `responseSnapshot` (ids, status, `resendMessageId`, etc.) and must not store email body, PDF bytes, or full provider payloads.
- ActivityLog must capture invoice lifecycle mutations, PDF download, and email send attempts; metadata must never include `RESEND_API_KEY`, raw API responses, or PDF payloads.

## Out of scope (Phase 8)
- No payment provider integration.
- No accounting platform sync.

## See also
- `docs/quality/QUALITY_BAR.md`
- `docs/runbooks/OPERATIONS.md`
