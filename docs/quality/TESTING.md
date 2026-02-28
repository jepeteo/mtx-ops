# Testing strategy (V1)

## Targets
- Critical: auth, permissions, services/renewals, notifications, vault reveal

## Levels
- Unit tests: pure functions (renewal calculator, key generators)
- Integration tests: API routes + DB (using a test database)
- Smoke tests: basic page rendering + auth gate

## Suggested tooling
- Vitest for unit tests
- Playwright for smoke/e2e (login, create client, create service)

## Minimum tests before "real use"
- Login success/failure + rate limiting
- Role enforcement on user creation
- Renewal notification generation correctness
- Vault reveal handles unreachable vault
