# Quality bar (V1)

## Code strictness
- TypeScript strict enabled
- No `any`
- Zod validation at all boundaries
- No business logic in React components
- DB access only through `src/lib/db/*`

## Security
- HttpOnly session cookie
- Secure in production
- Rate limit login
- Never log secrets
- ActivityLog for all mutations

## Performance
- Prefer server components for data fetch
- Avoid N+1 queries (Prisma includes)

## Review checklist (PR)
- Inputs validated?
- Authorization enforced?
- ActivityLog written?
- Error envelope consistent?
- Tests updated?
