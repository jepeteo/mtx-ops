# Skill: Standard Error Envelope + UX Patterns

## Purpose
Ensure every API/server action returns predictable errors; UI shows them cleanly.

## Error Envelope
```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": {"field":"…"} } }
```

## Steps
1. Implement `src/server/http.ts` helpers:
   - `ok(data)`
   - `fail(code, message, details?)`
2. In API routes:
   - validate with Zod
   - map Prisma errors (unique constraint) to friendly codes
3. In UI:
   - toast for global errors
   - inline field errors for validation

## Acceptance Criteria
- No unhandled error pages for common failures.
- Same shape across endpoints.
