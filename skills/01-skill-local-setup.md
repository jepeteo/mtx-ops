# Skill: Local Setup + First Run

## Purpose
Get MTX Ops running locally with Neon Postgres and seeded data.

## Inputs
- `.env` values (DATABASE_URL, AUTH_SECRET, etc.)

## Steps
1. Copy `.env.example` to `.env.local`.
2. Fill `DATABASE_URL` (Neon).
3. Install deps: `pnpm i`.
4. Run migrations: `pnpm prisma:migrate`.
5. Seed: `pnpm db:seed`.
6. Start dev: `pnpm dev`.

## Acceptance Criteria
- App loads at `http://localhost:3000`.
- Login page renders.
- Seeded workspace + owner user exist.

## Common Pitfalls
- Wrong Neon connection string (pooled vs direct).
- Forgetting to run migrations.

## Files Touched
- `.env.local`
- `prisma/schema.prisma`
- `prisma/seed.ts`

## Commands
```bash
pnpm i
pnpm prisma:migrate
pnpm db:seed
pnpm dev
```
