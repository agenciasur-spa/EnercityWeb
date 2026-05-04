/**
 * Generic TTL cache utility for CMS content.
 * Follows the same 5-min TTL pattern as settings.ts,
 * but uses a Map with keyed access for multiple content types.
 */

const cache = new Map<string, { data: unknown; timestamp: number }>();
const TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached data or fetch and cache it.
 * Falls back to hardcoded defaults on fetch error.
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  fallback: T
): Promise<T> {
  const cached = cache.get(key);
  if (cached && (Date.now() - cached.timestamp) < TTL) {
    return cached.data as T;
  }

  try {
    const data = await fetcher();
    cache.set(key, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error(`[content-cache] Error fetching "${key}":`, error);
    return fallback;
  }
}

/**
 * Clear the entire content cache or a specific key.
 * Called by admin mutation handlers after save operations.
 */
export function clearContentCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}
