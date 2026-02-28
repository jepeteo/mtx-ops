# Skill: Testing (Minimum Bar)

## Purpose
Establish confidence without overbuilding.

## Scope
- Unit tests for validation + repo functions
- Integration tests for key routes
- Smoke test for auth + client CRUD

## Steps
1. Configure test runner (Vitest recommended).
2. Use a dedicated test DB schema.
3. Add fixtures for workspace/user/client.
4. Add CI command: `pnpm test`.

## Acceptance Criteria
- Tests run in CI locally.
- Core flows covered.
