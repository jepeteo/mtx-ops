# Copilot Instructions — MTX Studio OS

## Project intent
Internal agency OS for MTX Studio. Optimize for speed of retrieval and continuity.

## Coding rules
- TypeScript strict; prefer small pure functions.
- No business logic in React components.
- Always validate inputs with Zod.
- Use server-side functions for DB access (`src/lib/db/*`).
- For any create/update/delete: also write an ActivityLog entry.
- Keep migrations clean and deterministic.

## Security rules
- Passwords: bcrypt hash only.
- Sessions: JWT in HttpOnly cookie; no localStorage tokens.
- Never store secrets in DB. Only Vault pointers.
- For any "Reveal secret" action: log to ActivityLog; do not log secret value.

## UI rules
- Minimal UI scaffold (V1), readability > design.
- Always provide fast navigation to Client Card.
