# MTX Studio OS (V1)

A cloud-first internal agency OS for **MTX Studio** (Teo + partner):
- Client intelligence (assets, services, renewals, credentials pointers)
- Projects + tasks (Kanban + list)
- Notes/decisions/handovers (continuity)
- In-app notifications (renewals + due dates + inactivity)
- Attachments (S3-compatible storage)
- Vaultwarden integration via **pointers** (no secrets stored in DB)

## Stack
- Next.js (App Router)
- Postgres (Neon) + Prisma
- Custom auth (email+password + JWT cookie sessions)
- Vercel Cron for notifications

## Quick start
1) Install deps
```bash
npm i
```

2) Copy env
```bash
cp .env.example .env
# fill DATABASE_URL + AUTH_JWT_SECRET at minimum
```

3) Init DB
```bash
npm run prisma:migrate
npm run db:seed
```

4) Run
```bash
npm run dev
```

Open: http://localhost:3000

### Default seeded users
- owner@example.com / ChangeMe123!
- admin@example.com / ChangeMe123!

## Project structure
- `src/app` - routes, layouts, pages, API routes
- `src/lib` - auth, db, validation, services
- `src/components` - UI components (minimal in V1 scaffold)
- `prisma` - schema + seed

## Security notes
- Passwords are hashed with bcrypt.
- Sessions are stored as signed JWT in an HttpOnly cookie.
- Vault secrets are **not stored** in the app DB. Only pointers are stored.
- V1 has **no Vaultwarden failsafe**: if Vaultwarden is unreachable, secret reveal will fail.

## Docs
See `docs/` for architecture, task plan, and AI-agent prompts.



## UI Theme

This scaffold ships with a minimal, dark, serious UI baseline (Tailwind + shadcn-style components), including:
- Sidebar app shell
- Dashboard card layout
- Command palette (Ctrl/Cmd+K)
- Notification Center UI shell


## AI Agent Skills
Reusable playbooks live in `./skills/`.
- Start with `skills/00-skill-format.md`
- Use the others as step-by-step recipes for building features safely.
