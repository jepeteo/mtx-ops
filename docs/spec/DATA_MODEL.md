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

## Field guidance
Use the Prisma schema as the source of truth. When adding fields:
- prefer enums for finite sets (service type, task status)
- store money as integer minor units (cents) + currency code
- store dates as UTC timestamps

## Permission notes
V1 may allow all users to see all clients, but design entities with:
- `workspaceId`
- (future) optional `clientVisibility` rules
