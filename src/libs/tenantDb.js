import { PrismaClient } from '@prisma/client';

/**
 * Creates a new PrismaClient connected to the tenant's database URL.
 * Caller is responsible for calling $disconnect() after the request.
 *
 * @param {Object} tenantConfig - The tenant configuration object
 * @param {string} tenantConfig.database_url - The tenant's database URL
 * @returns {PrismaClient}
 */
export function getTenantDb(tenantConfig) {
  return new PrismaClient({
    datasources: { db: { url: tenantConfig.database_url } },
  });
}
