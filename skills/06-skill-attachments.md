# Skill: Attachments (Upload + Link)

## Purpose
Upload files (PDFs/screenshots) and attach them to entities.

## Inputs
- Storage choice (S3-compatible recommended)
- Max file size and allowed mime types

## Steps
1. Create `Attachment` + `AttachmentLink` tables.
2. Implement signed upload (recommended) or server upload.
3. Validate file type/size.
4. UI component: uploader + list of attached files.
5. Permissions: attachments inherit permissions of the linked entity.

## Acceptance Criteria
- Upload works.
- Attachments visible on entity.
- Unauthorized users cannot fetch.
