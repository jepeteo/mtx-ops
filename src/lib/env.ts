import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().default("http://localhost:3000"),
  AUTH_COOKIE_NAME: z.string().default("mtxos_session"),
  AUTH_JWT_SECRET: z.string().min(20),
  AUTH_SESSION_DAYS: z.coerce.number().int().positive().default(14),
  DATABASE_URL: z.string().min(1),
  SEED_OWNER_EMAIL: z.string().email().optional(),
  SEED_OWNER_PASSWORD: z.string().min(8).optional(),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_REGION: z.string().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_PUBLIC_BASE_URL: z.string().optional(),
  VAULTWARDEN_URL: z.string().optional(),
});

export const env = EnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: process.env.APP_URL,
  AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME,
  AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET,
  AUTH_SESSION_DAYS: process.env.AUTH_SESSION_DAYS,
  DATABASE_URL: process.env.DATABASE_URL,
  SEED_OWNER_EMAIL: process.env.SEED_OWNER_EMAIL,
  SEED_OWNER_PASSWORD: process.env.SEED_OWNER_PASSWORD,
  STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT,
  STORAGE_REGION: process.env.STORAGE_REGION,
  STORAGE_ACCESS_KEY_ID: process.env.STORAGE_ACCESS_KEY_ID,
  STORAGE_SECRET_ACCESS_KEY: process.env.STORAGE_SECRET_ACCESS_KEY,
  STORAGE_BUCKET: process.env.STORAGE_BUCKET,
  STORAGE_PUBLIC_BASE_URL: process.env.STORAGE_PUBLIC_BASE_URL,
  VAULTWARDEN_URL: process.env.VAULTWARDEN_URL,
});
