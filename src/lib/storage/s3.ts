import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { env } from "@/lib/env";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function requireStorageConfig() {
  if (!env.STORAGE_ENDPOINT || !env.STORAGE_REGION || !env.STORAGE_ACCESS_KEY_ID || !env.STORAGE_SECRET_ACCESS_KEY || !env.STORAGE_BUCKET) {
    throw new Error("Storage configuration is incomplete");
  }

  return {
    endpoint: env.STORAGE_ENDPOINT,
    region: env.STORAGE_REGION,
    accessKeyId: env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    bucket: env.STORAGE_BUCKET,
  };
}

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

export function buildStorageKey(input: {
  workspaceId: string;
  entityType: "Client" | "Project" | "Task";
  entityId: string;
  fileName: string;
}) {
  const safeName = sanitizeFileName(input.fileName) || "upload.bin";
  return `${input.workspaceId}/${input.entityType}/${input.entityId}/${randomUUID()}-${safeName}`;
}

export async function createAttachmentPresign(input: {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}) {
  if (input.sizeBytes <= 0 || input.sizeBytes > MAX_UPLOAD_BYTES) {
    throw new Error(`Attachment size must be between 1 and ${MAX_UPLOAD_BYTES} bytes`);
  }

  const cfg = requireStorageConfig();

  const client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  const command = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: input.storageKey,
    ContentType: input.mimeType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 10 });

  return {
    uploadUrl,
    method: "PUT" as const,
    headers: {
      "content-type": input.mimeType,
    },
    maxUploadBytes: MAX_UPLOAD_BYTES,
  };
}

export async function deleteAttachmentObject(storageKey: string) {
  const cfg = requireStorageConfig();

  const client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  const command = new DeleteObjectCommand({
    Bucket: cfg.bucket,
    Key: storageKey,
  });

  await client.send(command);
}

export function getAttachmentPublicUrl(storageKey: string) {
  if (env.STORAGE_PUBLIC_BASE_URL) {
    return `${env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, "")}/${storageKey}`;
  }

  if (env.STORAGE_ENDPOINT && env.STORAGE_BUCKET) {
    return `${env.STORAGE_ENDPOINT.replace(/\/$/, "")}/${env.STORAGE_BUCKET}/${storageKey}`;
  }

  return null;
}
