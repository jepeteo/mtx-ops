import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("hashes and verifies a valid password", async () => {
    const password = "StrongPass123!";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("CorrectPassword!");
    await expect(verifyPassword("WrongPassword!", hash)).resolves.toBe(false);
  });
});
