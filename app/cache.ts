import { Redis } from "@upstash/redis";
import type { TeeTime } from "./types";

const redis = Redis.fromEnv();

const DEFAULT_TTL = 600;

export async function cacheGet<T>(key: string): Promise<T | null> {
	return redis.get<T>(key);
}

export async function cacheSet<T>(key: string, value: T, ttl = DEFAULT_TTL): Promise<void> {
	await redis.set(key, value, { ex: ttl });
}


export function reviveTeeTimes(teeTimes: TeeTime[]): TeeTime[] {
  return teeTimes.map((tt) => ({
    ...tt,
    date: new Date(tt.date),
  }));
}
