# Skill: Add a New Entity (DB + API + UI CRUD)

## Purpose
Add a new core entity end-to-end (example: `Provider`, `ServiceType`, `Contact`).

## Inputs
- Entity name + fields
- Relationships (workspace/client/project)
- UI placement (Client Card tab? Settings?)

## Steps
1. **Schema**: add model to `prisma/schema.prisma`.
2. **Migration**: `pnpm prisma:migrate`.
3. **Repo layer**: create `src/server/repos/<entity>.ts` with typed CRUD functions.
4. **API routes**: add `src/app/api/<entity>/route.ts` (GET/POST) and `.../[id]/route.ts` (GET/PATCH/DELETE).
5. **Validation**: add Zod schemas in `src/server/validation/<entity>.ts`.
6. **UI**:
   - list page or embedded panel
   - create/edit forms
   - optimistic UX where safe
7. **Audit log**: write ActivityLog record on create/update/delete.
8. **Permissions**: enforce workspace membership and role checks.

## Acceptance Criteria
- CRUD works (create, list, edit, delete).
- Validation errors return standard error envelope.
- ActivityLog entries are created.

## Common Pitfalls
- Missing `workspaceId`/`clientId` constraints.
- Not handling unique indexes.

## Files Touched
- `prisma/schema.prisma`
- `src/app/api/**`
- `src/server/repos/**`
- `src/server/validation/**`
- `src/app/app/**`

## Commands
```bash
pnpm prisma:migrate
pnpm test
```
