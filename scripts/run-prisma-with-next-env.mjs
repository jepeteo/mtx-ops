/**
 * Load the same env files as Next.js (.env, .env.local, .env.development.local, …)
 * then run the Prisma CLI. Use this so `DATABASE_URL` in `.env.local` is visible to Prisma.
 *
 * Usage: node scripts/run-prisma-with-next-env.mjs migrate deploy
 */
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(__dirname, "..");

const isDev = process.env.NODE_ENV !== "production";
loadEnvConfig(projectDir, isDev);

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(
    "Usage: node scripts/run-prisma-with-next-env.mjs <prisma-args...>\n" +
      "Example: npm run db:migrate:deploy",
  );
  process.exit(1);
}

const cmd = ["npx", "prisma", ...args].join(" ");
execSync(cmd, { stdio: "inherit", cwd: projectDir, env: process.env, shell: true });
