import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Redis only if URLs are present (prevents crashing if env vars are missing locally)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

// Fallback in-memory store if Redis is not configured
const fallbackStore = new Map<string, number>()

/**
 * Rate limit requests (10 requests per 10 seconds per IP by default)
 */
export async function checkRateLimit(
  identifier: string,
  limit = 10,
  window = '10 s'
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  
  if (redis) {
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, window as any),
      analytics: true,
    })
    
    const result = await ratelimit.limit(identifier)
    return result
  }

  // Fallback in-memory logic
  const now = Date.now()
  const windowMs = parseInt(window.split(' ')[0]) * 1000 * (window.includes('m') ? 60 : 1)
  
  // Basic token bucket simulation
  const lastRequest = fallbackStore.get(identifier) || 0
  if (now - lastRequest < windowMs / limit) {
    return { success: false, limit, remaining: 0, reset: now + windowMs }
  }
  
  fallbackStore.set(identifier, now)
  return { success: true, limit, remaining: limit - 1, reset: now + windowMs }
}
