# API spec (V1)

## Conventions
- JSON only
- Validate all inputs with Zod at the boundary
- Mutations must write ActivityLog
- Errors use a consistent envelope

### Error envelope
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }
```

## Auth
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Clients
- `GET /api/clients`
- `POST /api/clients`
- `GET /api/clients/:id`
- `PATCH /api/clients/:id`
- `DELETE /api/clients/:id`

## Services
- `GET /api/clients/:id/services`
- `POST /api/clients/:id/services`
- `PATCH /api/services/:id`
- `DELETE /api/services/:id`

## Projects & Tasks
- `GET /api/clients/:id/projects`
- `POST /api/clients/:id/projects`
- `GET /api/projects/:id/tasks`
- `POST /api/projects/:id/tasks`
- `PATCH /api/tasks/:id`
- `POST /api/tasks/:id/dependencies`

## Notes / Decisions / Handovers
- `POST /api/notes`
- `POST /api/decisions`
- `POST /api/handovers`
- `POST /api/handovers/:id/ack`

## Attachments
- `POST /api/attachments/presign`
- `POST /api/attachments/link`

## Notifications
- `GET /api/notifications`
- `POST /api/notifications/:id/snooze`
- `POST /api/notifications/:id/mark-handled`

## Vaultwarden
- `POST /api/vault/reveal` (body: vaultPointerId)
- `POST /api/vault/pointers`
