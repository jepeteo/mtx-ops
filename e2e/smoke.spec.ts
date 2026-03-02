import { expect, test } from "@playwright/test";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const email = process.env.E2E_EMAIL ?? process.env.SEED_OWNER_EMAIL;
const password = process.env.E2E_PASSWORD ?? process.env.SEED_OWNER_PASSWORD;

test("authenticated smoke flow", async ({ page }) => {
  if (!email || !password) {
    throw new Error("Missing E2E credentials: set E2E_EMAIL/E2E_PASSWORD or SEED_OWNER_EMAIL/SEED_OWNER_PASSWORD");
  }

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /mtx ops/i })).toBeVisible();

  await page.getByPlaceholder("you@mtxstudio.com").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL("**/app");
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();

  const checks: Array<{ path: string; heading: RegExp }> = [
    { path: "/app/clients", heading: /clients/i },
    { path: "/app/providers", heading: /providers/i },
    { path: "/app/projects", heading: /projects/i },
    { path: "/app/tasks", heading: /tasks/i },
    { path: "/app/search", heading: /search/i },
    { path: "/app/notifications", heading: /notifications/i },
    { path: "/app/admin/users", heading: /users/i },
    { path: "/app/admin/operations", heading: /operations/i },
    { path: "/app/admin/activity", heading: /activity/i },
  ];

  for (const check of checks) {
    await page.goto(check.path);
    await expect(page.getByRole("heading", { name: check.heading }).first()).toBeVisible();
  }
});
