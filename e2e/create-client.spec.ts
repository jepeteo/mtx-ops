import { expect, test } from "@playwright/test";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const email = process.env.E2E_EMAIL ?? process.env.SEED_OWNER_EMAIL;
const password = process.env.E2E_PASSWORD ?? process.env.SEED_OWNER_PASSWORD;
const hasE2eCredentials = Boolean(email && password);

test("create client flow", async ({ page }) => {
  test.skip(!hasE2eCredentials, "Set E2E_EMAIL/E2E_PASSWORD or SEED_OWNER_EMAIL/SEED_OWNER_PASSWORD in CI secrets");

  const clientName = `E2E Client ${Date.now()}`;

  await page.goto("/login");
  await page.getByPlaceholder("you@mtxstudio.com").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL("**/app");

  const createResponse = await page.request.post("/api/clients", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    data: {
      name: clientName,
      status: "ACTIVE",
    },
  });

  expect(createResponse.ok()).toBeTruthy();
  const createBody = (await createResponse.json()) as { data?: { client?: { id?: string } } };
  const createdClientId = createBody.data?.client?.id;
  expect(createdClientId).toBeTruthy();

  await page.goto(`/app/clients/${createdClientId}`);
  await expect(page.getByRole("heading", { name: clientName })).toBeVisible();

  await page.goto("/app/clients");
  await expect(page.getByRole("link", { name: clientName }).first()).toBeVisible();
});
