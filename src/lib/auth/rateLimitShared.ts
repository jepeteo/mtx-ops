import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

type MemoryEntry = { count: number; resetAt: number };

const memoryBuckets = new Map<string, MemoryEntry>();

function hasUpstash() {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

let redisClient: Redis | null = null;

function getRedis() {
  if (!hasUpstash()) return null;
  if (!redisClient) {
    redisClient = new Redis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisClient;
}

const limiterCache = new Map<string, Ratelimit>();

function getLimiter(maxRequests: number, windowSec: number) {
  const redis = getRedis();
  if (!redis) return null;

  const key = `${maxRequests}:${windowSec}`;
  let limiter = limiterCache.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSec} s`),
      prefix: "mtxops",
    });
    limiterCache.set(key, limiter);
  }
  return limiter;
}

function checkMemory(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  const entry = memoryBuckets.get(key);

  if (!entry || now >= entry.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false };
  }

  if (entry.count >= maxRequests) {
    return { limited: true, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  memoryBuckets.set(key, entry);
  return { limited: false };
}

export async function checkRateLimit(input: {
  key: string;
  maxRequests: number;
  windowSec: number;
}): Promise<{ limited: boolean; retryAfterSec?: number }> {
  const limiter = getLimiter(input.maxRequests, input.windowSec);
  if (limiter) {
    const result = await limiter.limit(input.key);
    if (!result.success) {
      return {
        limited: true,
        retryAfterSec: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
      };
    }
    return { limited: false };
  }

  const memory = checkMemory(input.key, input.maxRequests, input.windowSec * 1000);
  return memory;
}
