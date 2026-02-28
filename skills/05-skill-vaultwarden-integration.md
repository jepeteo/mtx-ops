# Skill: Vaultwarden Pointer + Reveal

## Purpose
Store Vault item pointers and reveal secrets securely (no secrets stored in DB).

## Inputs
- Vault base URL (e.g. `https://vault.jepeteonet.eu`)
- Vault API method (token/session)
- Item ID + field mapping convention

## Steps
1. Create `VaultPointer` model (clientId, vaultItemId, fieldName, label, usernameHint).
2. CRUD UI under Client Card → Credentials.
3. Implement server-side reveal endpoint:
   - Authenticate user
   - Check client access
   - Call Vaultwarden API server-to-server
   - Return secret value in response (never log)
4. Add UI:
   - Reveal (shows for 15–30s)
   - Copy-to-clipboard
5. Audit log:
   - log action “vault.reveal” without secret.
6. Failure mode:
   - if vault unreachable: show “Vault unavailable” and stop.

## Acceptance Criteria
- Secret can be revealed when vault reachable.
- Secret never persisted in DB.
- Audit entry is created.

## Common Pitfalls
- Logging responses accidentally.
- Caching secrets in client state longer than needed.
