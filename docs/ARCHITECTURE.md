# Architecture (V1)

## North star
MTX Ops is a cloud-first internal agency OS optimized for **retrieval, continuity, and operational safety**.

## Stack
- Next.js (App Router) on Vercel
- Neon Postgres + Prisma
- Custom auth (email+password)
- S3-compatible storage for attachments
- Vaultwarden integration via pointers (no secrets stored)

## Reference docs
- PRD: `docs/PRD.md`
- Data model: `docs/spec/DATA_MODEL.md`
- API spec: `docs/spec/API_SPEC.md`
- UX flows: `docs/spec/UX_FLOWS.md`
- Quality bar: `docs/quality/QUALITY_BAR.md`
- Error handling: `docs/quality/ERROR_HANDLING.md`
- Testing: `docs/quality/TESTING.md`
- Operations: `docs/runbooks/OPERATIONS.md`

## Key decisions (summary)
See `docs/DECISIONS.md`.
