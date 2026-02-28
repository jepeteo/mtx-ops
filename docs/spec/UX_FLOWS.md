# UX flows (V1)

## Flow 1 — Find client context fast
1. Open app → Dashboard
2. Ctrl/Cmd+K → type client name/domain/provider
3. Open Client Card
4. Overview shows pinned essentials + current work + expiring items

## Flow 2 — Capture a new request
1. Quick add → “New Note (Request)”
2. Tag client/project
3. Convert to Task (creates Task with acceptance criteria)
4. Assign to Teo/Partner

## Flow 3 — Track renewals
1. Add Service to Client (type/provider/renewal date/cost/payer)
2. Cron generates notifications at 60/30/14/7 days
3. Notification Center → snooze / mark handled

## Flow 4 — Partner handover
1. Create Handover to partner
2. Partner must acknowledge
3. Both see status and timestamp

## Flow 5 — Reveal secret
1. Open Client → Credentials
2. Click “Reveal”
3. App fetches from Vaultwarden via pointer
4. App displays transiently; ActivityLog records `vault.reveal`
5. If vault unreachable → clear error + retry
