# Data model (V1)

## Overview
MTX Ops is relational. The data model optimizes for:
- fast retrieval (Client Card)
- traceability (ActivityLog)
- future growth (multi-workspace, per-client visibility)

## Entity list (high level)
- Workspace, User
- Client, ClientContact
- Provider, Service, AgencyService
- AssetLink
- Invoice, InvoiceLineItem, IdempotencyRecord (invoice email send idempotency)
- VaultPointer
- Project, Milestone, Task, TaskDependency
- Note, Decision, Handover
- Attachment, AttachmentLink
- Notification
- ActivityLog

## Key constraints
- Every entity belongs to a Workspace (directly or via Client/Project)
- **No plaintext secrets** stored in DB
- Project has a `keyPrefix` (e.g., `MTXCF`) used to generate task keys (`MTXCF-001`)
- Invoice persisted status is enum-constrained to `draft`, `sent`, `paid`, `void`; `overdue` is computed, not stored

## Field guidance
Use the Prisma schema as the source of truth. When adding fields:
- prefer enums for finite sets (service type, task status)
- store money as integer minor units (cents) + currency code
- store dates as UTC timestamps
- model invoice totals as derived values validated server-side from line items

## Invoicing additions (Phase 8)
- `Invoice`
  - `id`, `workspaceId`, `clientId`
  - `invoiceNumber` (workspace-scoped unique)
  - `status` (`draft`, `sent`, `paid`, `void`) with `overdue` computed in API/UI
  - `currency`
  - `issueDate`, `dueDate`, `sentAt`, `paidAt`, `voidedAt`
  - monetary fields in minor units (`subtotalMinor`, `taxMinor`, `totalMinor`, `amountPaidMinor`)
  - optional `notes`, `paymentTerms`
- `InvoiceLineItem`
  - `id`, `invoiceId`, `position`
  - `description`
  - `quantity` (decimal-safe representation)
  - `unitPriceMinor`, `taxRateBps`, `lineSubtotalMinor`, `lineTaxMinor`, `lineTotalMinor`
- `IdempotencyRecord` (request idempotency for `POST /api/invoices/:id/send-email`)
  - `workspaceId`, `routeKey` (e.g. `invoice:send-email`), `idempotencyKey` (client `Idempotency-Key` header)
  - `requestFingerprint` (hash of invoice + normalized recipient, for conflict detection)
  - `responseSnapshot` (safe JSON metadata only: invoice ids, status, provider message id, etc. — not email body, not PDF bytes, not full provider payload)
  - `createdAt`, optional `expiresAt`
  - unique `(workspaceId, routeKey, idempotencyKey)`
- recommended indexes
  - `Invoice(workspaceId, status, dueDate)`
  - `Invoice(clientId, issueDate desc)`
  - `InvoiceLineItem(invoiceId, position)`

## Out of scope (Phase 8)
- No payment-provider transaction entities.
- No accounting-sync mapping entities.

## Permission notes
V1 may allow all users to see all clients, but design entities with:
- `workspaceId`
- (future) optional `clientVisibility` rules
