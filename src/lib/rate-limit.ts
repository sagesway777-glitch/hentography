type RateLimitInfo = {
  count: number;
  resetTime: number;
};

// In-memory store (a real app in multi-instance production should use Redis)
const rateLimits = new Map<string, RateLimitInfo>();

export function rateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60 * 1000 // 1 minute
) {
  const now = Date.now();
  const info = rateLimits.get(identifier);

  if (!info) {
    rateLimits.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + windowMs,
    };
  }

  if (now > info.resetTime) {
    info.count = 1;
    info.resetTime = now + windowMs;
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: info.resetTime,
    };
  }

  info.count += 1;
  const remaining = Math.max(0, limit - info.count);

  return {
    success: info.count <= limit,
    limit,
    remaining,
    reset: info.resetTime,
  };
}

// Memory cleanup interval
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, info] of rateLimits.entries()) {
      if (now > info.resetTime) {
        rateLimits.delete(key);
      }
    }
  }, 5 * 60 * 1000); // Clean every 5 minutes
}
