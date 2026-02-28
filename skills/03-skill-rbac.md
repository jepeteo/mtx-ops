# Skill: RBAC + Client Visibility Restrictions

## Purpose
Implement permissions for Owner/Admin/Member and optional client-level visibility.

## Inputs
- Roles allowed per action
- Whether restriction is *allow list* (explicit) or *deny list*

## Steps
1. Add `ClientAccess` join table (userId, clientId, accessLevel) if not present.
2. Centralize checks in `src/server/authz.ts`:
   - `requireUser()`
   - `requireWorkspaceRole(role)`
   - `canAccessClient(user, clientId)`
3. Apply checks in:
   - server actions
   - API routes
4. Ensure list queries are scoped:
   - if restrictions enabled: filter clients by access
5. Add admin UI for managing access (later if not V1).

## Acceptance Criteria
- Member cannot access restricted client.
- Admin can grant/revoke access.
- All list endpoints respect scoping.

## Common Pitfalls
- Forgetting to scope background jobs (notifications).
