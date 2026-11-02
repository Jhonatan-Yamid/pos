/**
 * In-process LRU cache for tenant configuration.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 *
 * - max: 500 entries (Req 4.5 — max capacity, LRU eviction)
 * - ttl: 5 minutes in ms (Req 4.1, 4.3 — TTL-based expiry)
 * - No external caching service required (Req 4.5)
 */

import { LRUCache } from "lru-cache";

const cache = new LRUCache({
  max: 500,
  ttl: 5 * 60 * 1000, // 5 minutes in milliseconds
});

/**
 * Retrieve a tenant config from the cache.
 * Returns `undefined` if the entry is absent or its TTL has expired.
 *
 * @param {string} slug - The tenant slug (cache key).
 * @returns {object|undefined} The cached Tenant_Config, or undefined on a miss.
 */
function getCachedTenant(slug) {
  return cache.get(slug);
}

/**
 * Store a tenant config in the cache, keyed by slug.
 * The entry expires automatically after the configured TTL (5 minutes).
 *
 * @param {string} slug   - The tenant slug (cache key).
 * @param {object} config - The Tenant_Config object to cache.
 */
function setCachedTenant(slug, config) {
  cache.set(slug, config);
}

/**
 * Remove a tenant's cache entry immediately.
 * Call this whenever a Super_Admin updates or deactivates a tenant so the
 * next request for that slug always reads a fresh record from Master_DB.
 *
 * @param {string} slug - The tenant slug whose cache entry should be deleted.
 */
function invalidateCachedTenant(slug) {
  cache.delete(slug);
}

export { getCachedTenant, setCachedTenant, invalidateCachedTenant };
