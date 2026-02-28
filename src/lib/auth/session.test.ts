import { describe, expect, it } from "vitest";

describe("session token", () => {
  it("creates and verifies session token", async () => {
    const { createSessionToken, verifySessionToken } = await import("./session");

    const token = await createSessionToken({
      userId: "user-1",
      userEmail: "owner@mtxstudio.com",
      role: "OWNER",
      workspaceId: "workspace-1",
    });

    const session = await verifySessionToken(token);

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-1");
    expect(session?.role).toBe("OWNER");
    expect(session?.workspaceId).toBe("workspace-1");
  });

  it("returns null for invalid token", async () => {
    const { verifySessionToken } = await import("./session");
    const session = await verifySessionToken("invalid-token");

    expect(session).toBeNull();
  });
});
