import { describe, expect, it } from "vitest";
import { getRateLimitKey, isLoginRateLimited, recordFailedLogin, resetFailedLogins } from "./rateLimit";

describe("login rate limiter", () => {
  it("starts as not limited and can be reset", () => {
    const key = getRateLimitKey("member+reset@mtxstudio.com", "127.0.0.10");
    resetFailedLogins(key);
    expect(isLoginRateLimited(key)).toBe(false);
  });

  it("limits after repeated failed attempts", () => {
    const key = getRateLimitKey("member+limit@mtxstudio.com", "127.0.0.11");
    resetFailedLogins(key);

    for (let count = 0; count < 5; count += 1) {
      recordFailedLogin(key);
    }

    expect(isLoginRateLimited(key)).toBe(true);
  });

  it("removes block after reset", () => {
    const key = getRateLimitKey("member+clear@mtxstudio.com", "127.0.0.12");

    for (let count = 0; count < 5; count += 1) {
      recordFailedLogin(key);
    }

    resetFailedLogins(key);
    expect(isLoginRateLimited(key)).toBe(false);
  });
});
