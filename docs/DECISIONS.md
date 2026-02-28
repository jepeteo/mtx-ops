# Decisions (ADR-lite index)

## ADR-0001 — Cloud-first deployment
**Decision:** Host app on Vercel; DB on Neon.
**Why:** Fast deploys, predictable ops, fits team size.

## ADR-0002 — Secrets
**Decision:** Secrets live in Vaultwarden; app stores pointers only.
**Why:** Avoid building a password manager; reduce liability.

## ADR-0003 — Vaultwarden failsafe
**Decision:** V1 has no offline cache; reveal fails if vault unreachable.
**Why:** Security and simplicity for V1.

## ADR-0004 — Auth
**Decision:** Custom email+password auth for V1.
**Why:** Predictable permissions model; OAuth can be added later.

## ADR-0005 — ORM
**Decision:** Prisma + Postgres.
**Why:** Relational-heavy model + fast iteration with AI agent.

## ADR-0006 — Password hashing algorithm (V1)
**Decision:** Use bcrypt (`bcryptjs`) for V1 auth password hashing.
**Why:** Stable cross-platform local setup and no native build friction; can migrate to Argon2 in a later hardening phase.
