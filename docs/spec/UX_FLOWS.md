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

## Flow 6 — Create invoice draft
1. Open Client Card → Invoices
2. Click “New Invoice”
3. Add issue/due dates, currency, and line items
4. Save draft (`draft`) with computed totals
5. ActivityLog records `invoice.create` and subsequent `invoice.update` events

## Flow 7 — Transition invoice to sent
1. Open invoice detail
2. Review line items and totals
3. Confirm “Mark sent”
4. App transitions status from `draft` to `sent`
5. ActivityLog records `invoice.status.sent`

## Flow 8 — Follow invoice lifecycle
1. Dashboard widgets show overdue count, unpaid amount, and recent sends
2. Invoices list supports status filters (`draft`, `sent`, `paid`, `overdue`, `void`)
3. Mark invoice as paid or void when appropriate
4. Overdue invoices are highlighted when due date passes and status is unpaid

## Flow 9 — PDF download and email send
1. Open invoice detail → **Download PDF** → server returns `GET /api/invoices/:id/pdf` (trusted DB + line items; ActivityLog `invoice.pdf.download`).
2. **Send invoice email** → confirm dialog, enter `recipientEmail` (defaults from billing email when set) → `POST /api/invoices/:id/send-email` with `Idempotency-Key` header; PDF attached, subject `Invoice {number} from MTX Studio`, Resend env required.
3. `draft` → on successful first send, status becomes `sent` and `sentAt` is set; `void` cannot be emailed; `sent`/`paid` can be resent.
4. ActivityLog: `invoice.email.send` on success, `invoice.email.send_failed` on configuration/upstream errors (metadata excludes secrets and raw PDF).
