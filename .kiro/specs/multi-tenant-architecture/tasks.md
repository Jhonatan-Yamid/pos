# Implementation Plan: Multi-Tenant Architecture

## Overview

Transform the single-tenant POS application into a multi-tenant SaaS where one Vercel deployment serves multiple clients. Each tenant is identified by a URL slug, has its own isolated MySQL database, and is configured via a central Master_DB. Implementation proceeds in layers: data models → core libs → middleware → route restructuring → auth → UI → admin → migration → tests.

All implementation targets JavaScript (the project uses `.js`/`.jsx` files with `jsconfig.json`; no TypeScript compiler is configured).

## Tasks

- [x] 1. Set up Master DB Prisma schema and generate client
  - Create `prisma/schema.master.prisma` with the `Tenant` model exactly as specified in the design (all fields: `id`, `slug`, `name`, `database_url`, `cloudinary_*`, `app_name`, `app_short_name`, `email`, `phone`, `manifest_icon_*`, `white_logo_url`, `is_active`, `created_at`, `updated_at`). Output path: `prisma/@prisma/master-client`.
  - Add `MASTER_DATABASE_URL` to `.env` and `.env.test` (placeholder values); document the variable in a comment.
  - Add a `prisma:generate:master` npm script: `prisma generate --schema=prisma/schema.master.prisma`.
  - Run `npm run prisma:generate:master` to verify the client generates without errors.
  - _Requirements: 3.1, 3.2, 3.5_

- [x] 2. Implement core tenant library modules
  - [x] 2.1 Add `ROLE_SUPER_ADMIN` constant to `src/libs/roles.js`
    - Export `ROLE_SUPER_ADMIN = 2` (integer, matching the existing pattern where `role = 1` is admin).
    - _Requirements: 7.1, 7.2_

  - [x] 2.2 Repurpose `src/libs/db.js` as the Master DB singleton
    - Replace current content with a singleton `masterDb` PrismaClient that reads from `MASTER_DATABASE_URL`, using the generated `prisma/@prisma/master-client` package.
    - Guard with `if (process.env.NODE_ENV !== 'production') globalThis.masterDb = masterDb` to prevent hot-reload duplication.
    - Fail fast: if `MASTER_DATABASE_URL` is absent, throw an error at module load time with a message identifying the missing variable.
    - Export as both named (`export const masterDb`) and default export.
    - _Requirements: 3.2, 3.5_

  - [x] 2.3 Create `src/libs/tenantCache.js` — in-process LRU cache
    - Install `lru-cache` package (already a common dependency; confirm it is present or add it).
    - Implement `getCachedTenant(slug)`, `setCachedTenant(slug, config)`, and `invalidateCachedTenant(slug)`.
    - Cache configured with `max: 500`, `ttl: 5 * 60 * 1000` (5 minutes in ms).
    - Export all three functions as named exports.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x]* 2.4 Write property tests for `tenantCache.js` (Properties 6, 7, 8)
    - Create `src/libs/tenantCache.spec.js`.
    - Install `fast-check` as a dev dependency if not present.
    - **Property 6: Cache round-trip within TTL** — `fc.record` for slug and TenantConfig; assert `getCachedTenant` returns deep-equal config after `setCachedTenant`. Tag: `Feature: multi-tenant-architecture, Property 6: Cache round-trip within TTL`. **Validates: Requirements 4.2**
    - **Property 7: Cache TTL eviction** — use `vi.useFakeTimers()`; advance clock ≥ 300 000 ms; assert `getCachedTenant` returns `undefined`. Tag: `Feature: multi-tenant-architecture, Property 7: Cache TTL eviction`. **Validates: Requirements 4.1, 4.3**
    - **Property 8: Cache invalidation leaves no stale entry** — after any number of sets, `invalidateCachedTenant` makes `getCachedTenant` return `undefined`. Tag: `Feature: multi-tenant-architecture, Property 8: Cache invalidation leaves no stale entry`. **Validates: Requirements 4.4, 7.6, 7.7**
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 2.5 Create `src/libs/tenantConfig.js` — tenant config resolver
    - Implement `resolveTenantConfig(slug)`: check cache first; on miss query `masterDb.tenant.findUnique({ where: { slug } })`; return `null` if not found or `is_active === false`; cache result on hit.
    - On cache miss where slug is not found, do NOT store anything in cache (Requirement 4.6).
    - Export `resolveTenantConfig` as a named export.
    - _Requirements: 1.1, 1.2, 3.3, 3.4, 4.1, 4.2, 4.6_

  - [x] 2.6 Create `src/libs/tenantDb.js` — dynamic Prisma client factory
    - Implement `getTenantDb(tenantConfig)` that constructs a new `PrismaClient` with `datasources: { db: { url: tenantConfig.database_url } }` using the existing tenant-scoped `@prisma/client`.
    - Caller is responsible for calling `$disconnect()`.
    - Export `getTenantDb` as a named export.
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x]* 2.7 Write property tests for `tenantDb.js` (Properties 4, 5)
    - Create `src/libs/tenantDb.spec.js`.
    - **Property 4: Tenant isolation via per-config Prisma client** — `fc.record` with two distinct `database_url` strings; assert each returned client's datasource URL matches its config and they are not the same object. Tag: `Feature: multi-tenant-architecture, Property 4: Tenant isolation via per-config Prisma client`. **Validates: Requirements 2.1, 2.2, 2.3**
    - **Property 5: Tenant client always disconnected after a request** — mock `$disconnect` spy; `fc.boolean()` drives whether handler throws or resolves; assert spy called exactly once. Tag: `Feature: multi-tenant-architecture, Property 5: Tenant client is always disconnected after a request`. **Validates: Requirements 2.5**
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 2.8 Create `src/libs/publicConfig.js` — public config serializer
    - Implement `toPublicConfig(tenantConfig)` that returns a copy of `tenantConfig` with `database_url`, `cloudinary_api_key`, and `cloudinary_api_secret` removed.
    - Implement `maskSecretField(value)` that returns `'********' + value.slice(-4)` for any string.
    - Export both as named exports.
    - _Requirements: 9.2, 7.8_

  - [x]* 2.9 Write property tests for `publicConfig.js` (Properties 10, 12)
    - Create `src/services/publicConfig.spec.js`.
    - **Property 10: Public config never exposes secrets** — `fc.record` with all TenantConfig fields fully populated; assert result contains none of the three secret keys. Tag: `Feature: multi-tenant-architecture, Property 10: Public config never exposes secrets`. **Validates: Requirements 9.2**
    - **Property 12: Secret field masking preserves last-4 suffix** — `fc.string({ minLength: 4 })`; assert `maskSecretField(value) === '********' + value.slice(-4)`. Tag: `Feature: multi-tenant-architecture, Property 12: Secret field masking preserves last-4 suffix`. **Validates: Requirements 7.8**
    - _Requirements: 9.2, 7.8_

- [x] 3. Checkpoint — core libs
  - Ensure all tests pass. Run `npm test`. Ask the user if questions arise.

- [x] 4. Implement slug validation utilities
  - [x] 4.1 Create `src/services/slugValidation.js`
    - Implement `validateSlugFormat(slug)` that returns `true` for strings matching `/^[a-z0-9-]{2,63}$/` and `false` otherwise.
    - Implement `normalizeSlug(slug)` that lowercases the input.
    - Export both as named exports.
    - _Requirements: 1.4, 1.5_

  - [x]* 4.2 Write property tests for slug validation (Properties 1, 2, 3)
    - Create `src/services/slugValidation.spec.js`.
    - **Property 1: Slug normalization is idempotent** — `fc.string()`; assert `normalizeSlug(normalizeSlug(s)) === normalizeSlug(s)` and result equals `s.toLowerCase()`. Tag: `Feature: multi-tenant-architecture, Property 1: Slug normalization is idempotent`. **Validates: Requirements 1.4**
    - **Property 2: Invalid slug format is always rejected** — generate strings failing `/^[a-z0-9-]{2,63}$/`; assert `validateSlugFormat(s) === false`. Tag: `Feature: multi-tenant-architecture, Property 2: Invalid slug format is always rejected`. **Validates: Requirements 1.5**
    - **Property 3: Valid slug format is always accepted** — `fc.stringMatching(/^[a-z0-9-]{2,63}$/)`; assert `validateSlugFormat(s) === true`. Tag: `Feature: multi-tenant-architecture, Property 3: Valid slug format is always accepted`. **Validates: Requirements 1.1, 1.5**
    - _Requirements: 1.1, 1.4, 1.5_

- [x] 5. Rewrite middleware (`src/middleware.js`)
  - [x] 5.1 Implement the new slug-aware middleware
    - Pass through: `_next/static`, `_next/image`, `favicon.ico`, `icons/`.
    - Admin routes (`/admin/*`): verify `ROLE_SUPER_ADMIN` JWT claim; reject with 403 if absent or wrong role.
    - Root path `/`: pass through to landing page unchanged.
    - All other paths: extract first segment as candidate slug, call `normalizeSlug`, call `validateSlugFormat`; return 400 on invalid format.
    - Call `resolveTenantConfig(slug)`: if `null`, redirect 302 to `/not-found-tenant`.
    - Public paths within valid slug (`/[slug]/auth/login`): allow unauthenticated.
    - All other slug-scoped paths: verify NextAuth JWT via `getToken`; verify signature, expiry, and `token.slug === slug`; return 401 on slug mismatch, redirect to `/[slug]/auth/login` on missing/expired token.
    - Update `matcher` to `['/((?!_next/static|_next/image|favicon.ico|icons/).*)']`.
    - Log failed tenant resolutions (slug + UTC timestamp) using `console.warn`.
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 3.4, 5.4, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 10.4_

  - [x]* 5.2 Write unit + property tests for middleware (Properties 2, 3, 9)
    - Create `src/middleware.spec.js`.
    - Unit tests: 400 for bad slug format; 302 for unknown slug; 401 for mismatched slug claim; redirect to login for missing token; pass-through for `/`; pass-through for `/[slug]/auth/login`.
    - **Property 2** (re-use generator from 4.2): invalid slug strings always produce 400.
    - **Property 3** (valid slugs with mocked `resolveTenantConfig` returning null): valid-format unknown slugs redirect to `/not-found-tenant`.
    - **Property 9: Session slug claim must match URL slug** — `fc.uniqueArray(fc.stringMatching(/^[a-z0-9-]{2,63}$/), { minLength: 2, maxLength: 2 })`; assert `checkSlugClaim({ slug: A }, B) === false` for all `A ≠ B`. Tag: `Feature: multi-tenant-architecture, Property 9: Session slug claim must match URL slug`. **Validates: Requirements 5.4, 6.3, 6.4**
    - _Requirements: 1.1, 1.5, 5.4, 6.3, 6.4_

- [x] 6. Restructure page routes under `[slug]`
  - [x] 6.1 Create `src/app/[slug]/` directory structure and layout
    - Create `src/app/[slug]/layout.jsx`: server component that calls `resolveTenantConfig(params.slug)`, converts to `PublicTenantConfig` via `toPublicConfig`, passes it as `tenantConfig` prop to a `<TenantProvider>` context. If resolution fails, render fallback (safe empty values, no crash — Requirement 9.3).
    - Create `src/context/TenantContext.js`: simple React context with `useTenantConfig()` hook.
    - Update `src/app/layout.jsx` root layout: remove tenant-specific metadata; keep generic title/description.
    - _Requirements: 5.1, 9.1, 9.2, 9.3_

  - [x] 6.2 Move authentication page to `[slug]`
    - Move `src/app/auth/login/` → `src/app/[slug]/auth/login/page.jsx`.
    - Update all internal links within the login page to use `/[slug]/auth/login`.
    - _Requirements: 5.1, 6.1_

  - [x] 6.3 Move dashboard and all sub-pages to `[slug]`
    - Move `src/app/dashboard/` and all its sub-directories to `src/app/[slug]/dashboard/`.
    - Move `src/app/pago/` → `src/app/[slug]/pago/`.
    - For each page that uses `useSession`, update redirect targets to include the slug (e.g., `/[slug]/auth/login`).
    - For each page that makes API calls via `apiClient.js`, update the base path to include the slug prefix (`/api/[slug]/...`). Pass the slug from `params` or `useTenantConfig()`.
    - _Requirements: 5.1, 5.3_

  - [x] 6.4 Add per-tenant manifest route
    - Create `src/app/[slug]/manifest.json/route.js`: server route handler that calls `resolveTenantConfig(params.slug)`, then returns a `Response` with `Content-Type: application/json` containing a manifest object built from `config.app_name`, `config.app_short_name`, `config.manifest_icon_192`, `config.manifest_icon_256`, `config.manifest_icon_512`. Use fallback icon paths if fields are null.
    - Remove or repurpose `src/app/manifest.js` (the old static manifest).
    - _Requirements: 9.4_

  - [x]* 6.5 Write property test for manifest builder (Property 11)
    - Create `src/services/manifestBuilder.spec.js`. Extract manifest-building logic into `src/services/manifestBuilder.js` pure function for testability.
    - **Property 11: Per-tenant manifest reflects TenantConfig** — `fc.record` with non-null `app_name` and `manifest_icon_*`; assert manifest `name === config.app_name` and icon srcs match. Tag: `Feature: multi-tenant-architecture, Property 11: Per-tenant manifest reflects TenantConfig`. **Validates: Requirements 9.4**
    - _Requirements: 9.4_

- [x] 7. Restructure API routes under `api/[slug]/`
  - [x] 7.1 Move all tenant API routes under `api/[slug]/`
    - Move every directory under `src/app/api/` (except `auth`) to `src/app/api/[slug]/`:
      `alerts`, `business`, `game`, `ingredient`, `product`, `products`, `provider-movements`, `providers`, `sale`, `upload`, `subscribe`, `send-notifications`, `print`, `print-ip`, `print-ticket`, `scrape-transfers`, `update-printer-ip`, `mail-verify`, `apitest`.
    - In each moved route handler, replace the import of `db` (the old singleton) with a call pattern:
      ```js
      const tenantConfig = await resolveTenantConfig(params.slug);
      const db = getTenantDb(tenantConfig);
      try { /* existing query logic */ } finally { await db.$disconnect(); }
      ```
    - _Requirements: 5.2, 2.1, 2.4, 2.5_

  - [x] 7.2 Move NextAuth route to `api/[slug]/auth/`
    - Move `src/app/api/auth/[...nextauth]/route.js` → `src/app/api/[slug]/auth/[...nextauth]/route.js`.
    - Update `authOptions` inside: accept `slug` from the URL params, call `resolveTenantConfig(slug)` to get `tenantConfig`, call `getTenantDb(tenantConfig)` to get the tenant Prisma client, and query `db.user.findUnique(...)` against that tenant's DB.
    - Embed `slug` in the JWT/session: add `token.slug = slug` in the `jwt` callback and expose it in the `session` callback.
    - Change error messages: replace `'No user found'` and `'Wrong password'` with the single generic message `'Credenciales inválidas'` (Requirement 6.8).
    - Update `pages.signIn` to `/[slug]/auth/login`.
    - Call `db.$disconnect()` after the credential check in the `authorize` callback.
    - _Requirements: 6.1, 6.2, 6.3, 6.7, 6.8_

  - [x]* 7.3 Write property test for generic auth error message (Property 17)
    - Create `src/app/api/[slug]/auth/auth.spec.js`.
    - **Property 17: Invalid credentials produce a generic error message** — arbitrary (email, password) pairs where mock `db.user.findUnique` returns `null`; assert error thrown equals `'Credenciales inválidas'` regardless of input. Tag: `Feature: multi-tenant-architecture, Property 17: Invalid credentials produce a generic error message`. **Validates: Requirements 6.8**
    - _Requirements: 6.8_

- [x] 8. Checkpoint — routes and auth
  - Ensure all tests pass. Run `npm test`. Verify middleware, slug routing, and auth changes compile without error. Ask the user if questions arise.

- [x] 9. Implement Admin Panel
  - [x] 9.1 Add admin API routes
    - Create `src/app/api/admin/tenants/route.js`:
      - `GET`: returns list of all tenants from `masterDb` (omit `database_url`, `cloudinary_api_key`, `cloudinary_api_secret` from response).
      - `POST`: validates input (slug uniqueness, slug format, required fields `slug`, `app_name`, `email`, `database_url`); inserts into `masterDb.tenant`; returns 201 on success or 422 with per-field errors on validation failure.
    - Create `src/app/api/admin/tenants/[id]/route.js`:
      - `GET`: returns single tenant (masked secret fields).
      - `PUT`: validates updated fields; saves to `masterDb`; calls `invalidateCachedTenant(slug)`; returns updated record.
      - `DELETE`: sets `is_active = false` (soft delete); calls `invalidateCachedTenant(slug)`.
    - Protect all admin API routes: verify `token.role === ROLE_SUPER_ADMIN` in each handler; return 403 otherwise.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x]* 9.2 Write unit + property tests for tenant admin validation (Property 13)
    - Create `src/app/api/admin/tenants.spec.js`.
    - Extract form validation into `src/services/tenantValidation.js` with `validateTenantCreateInput(input, existingSlugs)`.
    - **Property 13: Tenant creation validation rejects any invalid input** — `fc.record` with slugs containing bad chars, wrong length, or duplicate slugs, or missing required fields; assert return is non-null error object. Tag: `Feature: multi-tenant-architecture, Property 13: Tenant creation validation rejects any invalid input`. **Validates: Requirements 7.4, 7.5**
    - _Requirements: 7.4, 7.5_

  - [x] 9.3 Implement Admin Panel UI pages
    - Create `src/app/admin/layout.jsx`: server component that verifies `ROLE_SUPER_ADMIN` from the NextAuth session; redirects to 403 page if not authorized.
    - Create `src/app/admin/tenants/page.jsx`: fetches tenant list from the admin API; renders a table with columns `slug`, `app_name`, `email`, `is_active`, `created_at`, and action links to edit/deactivate.
    - Create `src/app/admin/tenants/new/page.jsx`: form to create a tenant; all required fields plus optional fields; client-side calls `POST /api/admin/tenants`; displays per-field validation errors on 422.
    - Create `src/app/admin/tenants/[id]/page.jsx`: form to edit an existing tenant; masks secret fields in display per `maskSecretField`; calls `PUT /api/admin/tenants/[id]` on submit; shows success/error feedback.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [x] 10. Add Tenant-Not-Found page
  - Create `src/app/not-found-tenant/page.jsx`: renders a user-friendly "Tenant no encontrado" message; contains no stack traces, no DB URLs, no internal paths (Requirement 10.2); page title is generic.
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 10.1 Write property test for error page data safety (Property 16)
  - Create `src/app/not-found-tenant/errorPage.spec.js`.
  - **Property 16: Error page body contains no sensitive data** — render the component with arbitrary slug strings; assert HTML body does not match `/DATABASE_URL|\/src\/|\\src\\|at \w+\.(js|ts):\d+|P\d{4}/i`. Tag: `Feature: multi-tenant-architecture, Property 16: Error page body contains no sensitive data`. **Validates: Requirements 10.2**
  - _Requirements: 10.2_

- [x] 11. Create migration script
  - [x] 11.1 Write `scripts/migrate-tenants.js`
    - Script reads existing `.env` values for `hierbamala` and `raicescampesinas` (variables `DATABASE_URL`, `CLOUDINARY_CLOUD_NAME`, etc., prefixed per-tenant as documented in the script header comments).
    - For each tenant: check if slug already exists in `masterDb`; if yes, log a warning and skip; if no, insert the record.
    - After insert, run `SELECT 1` against the tenant's `database_url` to verify connectivity; log "connection successful" or the error reason.
    - If any required variable is missing, log an error identifying the tenant slug and variable name, then continue to the next tenant.
    - Do NOT modify or delete any data in any Tenant_DB (only inserts into Master_DB).
    - Call `masterDb.$disconnect()` in a `finally` block before script exit.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x]* 11.2 Write property tests for migration script (Properties 14, 15)
    - Create `scripts/migrate-tenants.spec.js`.
    - **Property 14: Migration script idempotency** — mock `masterDb` with an in-memory set of existing slugs; run migration twice; assert row count after second run equals row count after first; assert warning logged for each skipped slug. Tag: `Feature: multi-tenant-architecture, Property 14: Migration script idempotency`. **Validates: Requirements 8.4**
    - **Property 15: Migration script does not mutate Tenant_DBs** — mock all Tenant_DB write methods (`create`, `update`, `delete`, `upsert`); run migration for arbitrary tenant configs; assert no write mock was called. Tag: `Feature: multi-tenant-architecture, Property 15: Migration script does not mutate Tenant_DBs`. **Validates: Requirements 8.3**
    - _Requirements: 8.3, 8.4_

- [x] 12. Update environment variables and configuration
  - Update `.env` and `.env.test`: add `MASTER_DATABASE_URL`; remove all per-tenant `NEXT_PUBLIC_*` variables that are now sourced from Master_DB (`NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_SHORT_NAME`, `NEXT_PUBLIC_MANIFEST_ICON_*`). Keep `NEXTAUTH_SECRET`.
  - Update `next.config.mjs`: verify no `env` block references the removed variables.
  - Update `src/app/layout.jsx` root layout: replace `process.env.NEXT_PUBLIC_APP_NAME` in `metadata` with a generic fallback string since the per-tenant name is now served from `[slug]/layout.jsx`.
  - _Requirements: 3.3, 3.5, 9.1_

- [x] 13. Final checkpoint — full test suite
  - Run `npm test` and ensure all tests pass.
  - Run `npm run build` to confirm the Next.js build completes without errors.
  - Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- All code is JavaScript (`.js`/`.jsx`); no TypeScript compiler is configured in this project.
- `fast-check` must be installed as a dev dependency before running any property tests (`npm install --save-dev fast-check`).
- `lru-cache` must be available as a runtime dependency (`npm install lru-cache`).
- Each task references specific requirements for traceability.
- Checkpoints (tasks 3, 8, 13) ensure incremental validation.
- Property tests validate universal correctness properties; unit tests validate specific examples and edge cases.
- The `resolveTenantConfig` + `getTenantDb` pattern replaces every direct `import db from '@/libs/db'` in moved route handlers.
- Tenant DB schema (`prisma/schema.prisma`) is unchanged; only Master DB schema is new.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.6"] },
    { "id": 3, "tasks": ["2.4", "2.5", "2.7", "2.8", "4.1"] },
    { "id": 4, "tasks": ["2.9", "4.2", "5.1", "6.1"] },
    { "id": 5, "tasks": ["5.2", "6.2", "6.3", "6.4", "7.1"] },
    { "id": 6, "tasks": ["6.5", "7.2", "9.1"] },
    { "id": 7, "tasks": ["7.3", "9.2", "9.3", "10", "11.1"] },
    { "id": 8, "tasks": ["10.1", "11.2", "12"] }
  ]
}
```
