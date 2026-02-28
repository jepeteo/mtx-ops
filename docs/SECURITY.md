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

## See also
- `docs/quality/QUALITY_BAR.md`
- `docs/runbooks/OPERATIONS.md`
