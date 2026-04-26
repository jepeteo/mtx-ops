# Testing strategy (V1)

## Targets
- Critical: auth, permissions, services/renewals, notifications, vault reveal
- Phase 8 additions: invoices, line items, PDF generation, email sending, dashboard invoice widgets

## Levels
- Unit tests: pure functions (renewal calculator, key generators)
- Integration tests: API routes + DB (using a test database)
- Smoke tests: basic page rendering + auth gate

## Suggested tooling
- Vitest for unit tests
- Playwright for smoke/e2e (login, create client, create service)

## Current implementation
- Unit tests run with `npm test` (Vitest).
- E2E smoke test is implemented in `e2e/smoke.spec.ts` and run with `npm run test:e2e`.
- CI runs unit tests, app build, and Playwright smoke in `.github/workflows/ci.yml`.

## Phase 8 closeout (2026-04-25)
- Controller tests cover invoice PDF + send-email: auth, workspace `NOT_FOUND`, void email block, Resend `CONFIG_ERROR`, invalid recipient, idempotency replay/mismatch, draft→`sent` on send, paid resend, upstream failure + ActivityLog; fingerprint unit tests for email idempotency.

## Minimum tests before "real use"
- Login success/failure + rate limiting
- Role enforcement on user creation
- Renewal notification generation correctness
- Vault reveal handles unreachable vault
- Invoice create/update/list enforces strict workspace scoping
- Invoice status transitions validate allowed state changes
- Invoice totals are recalculated/validated from line items server-side
- Invoice PDF endpoint returns expected document metadata and rejects cross-workspace access
- Invoice email send via Resend handles success/failure and idempotency keys
- ActivityLog coverage exists for invoice create/update/status/pdf/email events
- Dashboard invoice widgets return accurate overdue/unpaid/recent counts by workspace

## Out of scope test coverage (Phase 8)
- Payment provider webhooks and settlement reconciliation
- Accounting sync contracts
