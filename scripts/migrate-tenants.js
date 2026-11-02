/**
 * scripts/migrate-tenants.js
 *
 * One-shot migration script that reads existing per-tenant environment variables
 * and inserts corresponding records into the Master_DB `tenants` table.
 *
 * Usage:
 *   node scripts/migrate-tenants.js
 *
 * This script only inserts rows into Master_DB.
 * It NEVER modifies or deletes data in any Tenant_DB.
 *
 * ─── Per-tenant variable naming convention ───────────────────────────────────
 *
 * Variables are prefixed with the tenant slug in UPPER_SNAKE_CASE. Hyphens in
 * the slug are converted to underscores. For example, for slug "hierbamala"
 * the prefix is "HIERBAMALA_":
 *
 *   Required:
 *     HIERBAMALA_DATABASE_URL          — tenant DB connection string
 *     HIERBAMALA_APP_NAME              — display name of the business
 *
 *   Optional:
 *     HIERBAMALA_CLOUDINARY_CLOUD_NAME
 *     HIERBAMALA_CLOUDINARY_API_KEY
 *     HIERBAMALA_CLOUDINARY_API_SECRET
 *     HIERBAMALA_APP_SHORT_NAME
 *     HIERBAMALA_EMAIL
 *     HIERBAMALA_PHONE
 *     HIERBAMALA_WHITE_LOGO_URL
 *     HIERBAMALA_MANIFEST_ICON_192
 *     HIERBAMALA_MANIFEST_ICON_256
 *     HIERBAMALA_MANIFEST_ICON_512
 *
 * For slug "raicescampesinas" the prefix is "RAICESCAMPESINAS_":
 *   RAICESCAMPESINAS_DATABASE_URL, RAICESCAMPESINAS_APP_NAME, etc.
 *
 * ─── Master_DB variable ──────────────────────────────────────────────────────
 *
 *   MASTER_DATABASE_URL  — connection string for the central Master_DB
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Requirements covered: 8.1, 8.2, 8.3, 8.4, 8.5
 */

'use strict';

require('dotenv').config();

// Use the generated Prisma clients directly so this script runs as plain
// Node.js (CommonJS) without requiring a bundler or ESM loader.
const { PrismaClient: MasterPrismaClient } = require('../prisma/@prisma/master-client/index.js');
const { PrismaClient: TenantPrismaClient } = require('../prisma/@prisma/client/index.js');

// ─── Known tenants ────────────────────────────────────────────────────────────
// Add new entries here when onboarding additional pre-existing tenants.
const KNOWN_TENANTS = ['hierbamala', 'raicescampesinas'];

// ─── Master DB singleton (for this script only) ───────────────────────────────
const masterDb = new MasterPrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a tenant slug to the environment variable prefix used by this script.
 *   "hierbamala"       → "HIERBAMALA_"
 *   "raices-campesinas" → "RAICES_CAMPESINAS_"
 *
 * @param {string} slug
 * @returns {string}
 */
function slugToEnvPrefix(slug) {
  return slug.toUpperCase().replace(/-/g, '_') + '_';
}

/**
 * Reads environment variables for a single tenant and returns a data object
 * ready for `masterDb.tenant.create()`.
 *
 * Returns null if any *required* variable is missing; logs one error per missing
 * variable before returning (Requirement 8.2).
 *
 * @param {string} slug
 * @returns {object|null}
 */
function readTenantEnvVars(slug) {
  const prefix = slugToEnvPrefix(slug);

  // Required fields — script must skip the tenant if any are absent.
  const REQUIRED_KEYS = ['DATABASE_URL', 'APP_NAME'];
  const missingKeys = REQUIRED_KEYS.filter((key) => !process.env[prefix + key]);

  if (missingKeys.length > 0) {
    for (const key of missingKeys) {
      console.error(
        `[migrate-tenants] ERROR: tenant "${slug}" — missing required environment variable: ${prefix + key}`
      );
    }
    return null;  // caller skips this tenant
  }

  // Optional helper — returns the env var value or null when absent.
  const opt = (key) => process.env[prefix + key] ?? null;

  return {
    slug,
    // `name` is the canonical human-readable column; we map it from APP_NAME.
    name:                  process.env[prefix + 'APP_NAME'],
    database_url:          process.env[prefix + 'DATABASE_URL'],
    app_name:              process.env[prefix + 'APP_NAME'],
    cloudinary_cloud_name: opt('CLOUDINARY_CLOUD_NAME'),
    cloudinary_api_key:    opt('CLOUDINARY_API_KEY'),
    cloudinary_api_secret: opt('CLOUDINARY_API_SECRET'),
    app_short_name:        opt('APP_SHORT_NAME'),
    email:                 opt('EMAIL'),
    phone:                 opt('PHONE'),
    white_logo_url:        opt('WHITE_LOGO_URL'),
    manifest_icon_192:     opt('MANIFEST_ICON_192'),
    manifest_icon_256:     opt('MANIFEST_ICON_256'),
    manifest_icon_512:     opt('MANIFEST_ICON_512'),
  };
}

/**
 * Runs `SELECT 1` against a tenant's database to verify connectivity.
 * Logs "connection successful" or the error reason (Requirement 8.5).
 *
 * @param {string} slug
 * @param {string} databaseUrl
 */
async function verifyTenantDbConnectivity(slug, databaseUrl) {
  const db = new TenantPrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  try {
    await db.$queryRaw`SELECT 1`;
    console.log(`[migrate-tenants] tenant "${slug}" — connection successful`);
  } catch (err) {
    console.error(
      `[migrate-tenants] tenant "${slug}" — connection failed: ${err.message ?? String(err)}`
    );
  } finally {
    await db.$disconnect();
  }
}

/**
 * Migrates a single tenant:
 *   1. Read env vars (skip + log on missing required vars)          [Req 8.1, 8.2]
 *   2. Check for duplicate slug in Master_DB (skip + warn)         [Req 8.4]
 *   3. Insert into Master_DB only (no Tenant_DB writes)            [Req 8.1, 8.3]
 *   4. Verify Tenant_DB connectivity via SELECT 1                  [Req 8.5]
 *
 * @param {string} slug
 */
async function migrateTenant(slug) {
  // Step 1 — Read and validate environment variables
  const data = readTenantEnvVars(slug);
  if (data === null) {
    // Error already logged per-variable; continue to next tenant.
    return;
  }

  // Step 2 — Skip if slug already in Master_DB (Requirement 8.4)
  const existing = await masterDb.tenant.findUnique({ where: { slug } });
  if (existing) {
    console.warn(
      `[migrate-tenants] WARNING: tenant "${slug}" already exists in Master_DB — skipping`
    );
    return;
  }

  // Step 3 — Insert into Master_DB (Requirement 8.1 / 8.3)
  await masterDb.tenant.create({ data });
  console.log(`[migrate-tenants] tenant "${slug}" — inserted into Master_DB`);

  // Step 4 — Verify Tenant_DB connectivity (Requirement 8.5)
  await verifyTenantDbConnectivity(slug, data.database_url);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  console.log('[migrate-tenants] Starting migration…');
  for (const slug of KNOWN_TENANTS) {
    await migrateTenant(slug);
  }
  console.log('[migrate-tenants] Migration complete.');
}

main().finally(async () => {
  // Always disconnect masterDb before the process exits (Requirement 8.1).
  await masterDb.$disconnect();
});
