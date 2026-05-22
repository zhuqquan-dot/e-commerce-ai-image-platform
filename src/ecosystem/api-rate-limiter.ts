const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  apiKeyId: string,
  limit: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const minuteKey = `${apiKeyId}:${Math.floor(now / 60000)}`;
  const entry = rateLimitMap.get(minuteKey);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(minuteKey, { count: 1, resetAt: now + 60000 });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}
