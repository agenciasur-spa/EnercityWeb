// Simple in-memory rate limiter
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const requestCounts = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const MAX_REQUESTS_PER_MINUTE = 5;

export function checkRateLimit(ip: string): { allowed: boolean; resetAt?: number } {
  const now = Date.now();
  const entry = requestCounts.get(ip);
  
  // Clean up expired entries
  if (entry && now > entry.resetTime) {
    requestCounts.delete(ip);
    return { allowed: true };
  }
  
  // Create new entry if none exists
  if (!entry) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  
  // Check if limit exceeded
  if (entry.count >= MAX_REQUESTS_PER_MINUTE) {
    return { 
      allowed: false, 
      resetAt: entry.resetTime 
    };
  }
  
  // Increment count
  entry.count++;
  return { allowed: true };
}

export function getClientIP(request: Request): string {
  // Try to get IP from various headers (reverse proxy, Cloudflare, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const connectingIP = request.headers.get('cf-connecting-ip');
  
  // Prefer x-forwarded-for (can contain multiple IPs, take the first)
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  // Fallback to other headers
  if (connectingIP) return connectingIP;
  if (realIP) return realIP;
  
  // Last resort - use a dummy IP for local development
  return 'localhost';
}

// Helper function to create rate limit response
export function createRateLimitResponse(resetAt?: number): Response {
  const retryAfter = resetAt ? Math.ceil((resetAt - Date.now()) / 1000) : 60;
  
  return new Response(JSON.stringify({
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': MAX_REQUESTS_PER_MINUTE.toString(),
      'X-RateLimit-Remaining': '0',
      'Retry-After': retryAfter.toString(),
    }
  });
}