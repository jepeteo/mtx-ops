type LoginRateEntry = {
  count: number;
  firstAttemptAt: number;
  blockedUntil?: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 15 * 60 * 1000;

const failedLogins = new Map<string, LoginRateEntry>();

function nowMs() {
  return Date.now();
}

export function getRateLimitKey(email: string, ip: string) {
  return `${email.toLowerCase()}|${ip}`;
}

export function isLoginRateLimited(key: string): boolean {
  const entry = failedLogins.get(key);
  if (!entry) return false;

  const now = nowMs();
  if (entry.blockedUntil && entry.blockedUntil > now) return true;

  if (now - entry.firstAttemptAt > WINDOW_MS) {
    failedLogins.delete(key);
    return false;
  }

  return false;
}

export function recordFailedLogin(key: string) {
  const now = nowMs();
  const existing = failedLogins.get(key);

  if (!existing || now - existing.firstAttemptAt > WINDOW_MS) {
    failedLogins.set(key, { count: 1, firstAttemptAt: now });
    return;
  }

  const nextCount = existing.count + 1;
  failedLogins.set(key, {
    count: nextCount,
    firstAttemptAt: existing.firstAttemptAt,
    blockedUntil: nextCount >= MAX_ATTEMPTS ? now + BLOCK_MS : undefined,
  });
}

export function resetFailedLogins(key: string) {
  failedLogins.delete(key);
}
