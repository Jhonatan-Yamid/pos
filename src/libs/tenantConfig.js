/**
 * Tenant config resolver.
 *
 * Resolves a Tenant_Config for the given slug by checking the in-process
 * LRU cache first, falling back to a Master_DB query on a cache miss.
 *
 * Requirements: 1.1, 1.2, 3.3, 3.4, 4.1, 4.2, 4.6
 */

import { masterDb } from './db.js';
import {
  getCachedTenant,
  setCachedTenant,
} from './tenantCache.js';

/**
 * Resolve the Tenant_Config for a given slug.
 *
 * Resolution order:
 * 1. Check the in-process LRU cache (Req 4.2).
 * 2. On a cache miss, query Master_DB for the tenant record.
 * 3. If the record is not found, return `null` without caching (Req 4.6).
 * 4. If the record has `is_active === false`, return `null` without caching
 *    (Req 3.4 — inactive tenants are treated as non-existent).
 * 5. On a valid hit, store the config in cache and return it (Req 4.1, 4.2).
 *
 * @param {string} slug - The tenant slug extracted from the request URL.
 * @returns {Promise<object|null>} The Tenant_Config object, or `null` if the
 *   slug is unknown or the tenant is inactive.
 */
export async function resolveTenantConfig(slug) {
  // 1. Cache hit — return immediately without touching Master_DB (Req 4.2)
  const cached = getCachedTenant(slug);
  if (cached !== undefined) {
    return cached;
  }

  // 2. Cache miss — query Master_DB (Req 1.1, 3.3)
  const tenant = await masterDb.tenant.findUnique({ where: { slug } });

  // 3. Slug not found — do NOT cache, return null (Req 4.6, 1.2)
  if (!tenant) {
    return null;
  }

  // 4. Tenant exists but is inactive — do NOT cache, return null (Req 3.4)
  if (tenant.is_active === false) {
    return null;
  }

  // 5. Valid active tenant — populate cache and return config (Req 4.1, 4.2)
  setCachedTenant(slug, tenant);
  return tenant;
}
