import type Redis from 'ioredis';

export async function withLock<T>(
  redis: Redis,
  key: string,
  ttlSec: number,
  fn: () => Promise<T>,
): Promise<T | null> {
  const token = Math.random().toString(36).slice(2);
  const ok = await redis.set(key, token, 'EX', ttlSec, 'NX');
  if (!ok) return null;
  try {
    return await fn();
  } finally {
    if ((await redis.get(key)) === token) await redis.del(key);
  }
}
