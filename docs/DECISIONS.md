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

## ADR-0007 — Invoicing core model
**Decision:** Add invoicing as Phase 8 / V1+ with client-linked invoices, line items, manual tax mode, PDF generation, and outbound email via Resend.
**Details:**
- Invoice number format: `MTX-{YEAR}-{SEQUENCE}`, e.g. `MTX-2026-0001`.
- Sequence resets yearly per workspace.
- Company jurisdiction: UK company, clients may be international.
- Payment method: Revolut in V1; Stripe can be added later.
- Tax handling is manually selected per invoice/line: `uk_vat`, `reverse_charge`, or `none`.
- `overdue` should be computed from `status = sent` plus `dueDate < now`, not stored as a separate persistent status.
- PDF generation is on-demand in V1.
- Invoice email is sent through Resend.
- Default email behavior: send PDF attachment.
- Billing recipient is freeform on the invoice in V1, not strictly tied to client contacts.
**Implementation status (2026-04-25) — closeout:** core invoicing APIs, UI, PDF download (`@react-pdf/renderer`), and outbound email via Resend (`POST /api/invoices/:id/send-email` with `Idempotency-Key` and `IdempotencyRecord`) are implemented; no payment or accounting sync.
**Why:** Invoicing is a natural extension of MTX Ops, but it needs stricter rules than normal CRUD because invoice numbers, tax treatment, status transitions, and email delivery affect business records.