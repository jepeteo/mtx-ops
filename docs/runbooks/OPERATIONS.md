# Operations (V1)

## Environments
- Local
- Preview (Vercel)
- Production (`ops.mtxstudio.com`)

## Deployment
- Vercel build from main branch
- Environment variables set in Vercel

## Backups
- Neon backups (provider)
- App-level export (workspace JSON) — Phase 7

## Cron jobs
- Vercel Cron calls `/api/cron/notifications` (Phase 2)

## Incident checklist
- DB down: check Neon status, rotate connection string if needed
- Vault down: secrets reveal disabled; app remains usable
- Bad deploy: rollback Vercel deployment
