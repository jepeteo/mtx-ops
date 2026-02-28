# Error handling (V1)

## Principles
- Fail safely and clearly
- No leaking internal details to the UI
- Provide actionable messages

## Categories
- VALIDATION_ERROR (400)
- UNAUTHORIZED (401)
- FORBIDDEN (403)
- NOT_FOUND (404)
- CONFLICT (409)
- RATE_LIMITED (429)
- INTERNAL (500)
- UPSTREAM_UNAVAILABLE (502/503) — e.g., Vaultwarden unreachable

## UI patterns
- Inline form errors for validation
- Toast + retry for network/upstream errors
- Dedicated empty/error states for lists

## Vaultwarden
- If unreachable: show “Vault currently unavailable” + retry + link to pointer metadata
- Always write ActivityLog only for successful reveal (and optionally for attempts)
