// src/middleware.js
//
// Slug-aware multi-tenant middleware.
//
// Execution order:
//   1. Static assets  → pass through immediately.
//   2. Root /         → pass through to landing page.
//   3. Admin routes   → verify ROLE_SUPER_ADMIN JWT claim; 403 otherwise.
//   4. All other paths:
//      a. Extract first segment, normalize, validate format → 400 if invalid.
//      b. Tenant existence is deferred to layout (Prisma cannot run in Edge Runtime).
//      c. Public slug paths (e.g. /[slug]/auth/login) → allow unauthenticated.
//      d. Protected slug paths → verify JWT; redirect to login if missing/expired;
//         401 if token.slug ≠ URL slug.
//
// Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 3.4, 5.4, 6.3, 6.4, 6.5, 6.6,
//               7.1, 7.2, 10.4
//
// NOTE: resolveTenantConfig (Prisma) cannot run in Edge Runtime. Tenant
// existence / is_active checks are performed in src/app/[slug]/layout.jsx.

import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { normalizeSlug, validateSlugFormat } from '@/services/slugValidation';

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Integer value stored in the JWT for Super Admin users.
 * Mirrors the value returned by src/libs/roles.js → getRole() when image === 2.
 * Will also match token.role once task 7.2 sets it explicitly in the jwt callback.
 */
const SUPER_ADMIN_ROLE_VALUE = 2;

/**
 * URL segments that are never treated as tenant slugs.
 * Extend this list as new top-level reserved routes are added.
 */
const RESERVED_SEGMENTS = new Set([
  'admin',
  'api',
  'auth',
  'not-found-tenant',
  '_next',
  'icons',
  'favicon.ico',
  'manifest.webmanifest',
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true if the decoded NextAuth JWT belongs to a Super Admin.
 */
function isSuperAdminToken(token) {
  if (!token) return false;
  return token.role === SUPER_ADMIN_ROLE_VALUE ||
         token.picture === SUPER_ADMIN_ROLE_VALUE;
}

/**
 * Returns true if the JWT token is missing, expired, or otherwise invalid.
 */
function isTokenMissingOrExpired(token) {
  return token === null || token === undefined;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * @param {import('next/server').NextRequest} req
 */
export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // ── 1. Root path: pass through to landing page (Req 1.6) ──────────────────
  if (pathname === '/') {
    return NextResponse.next();
  }

  // ── 2. Admin routes: require Super Admin JWT claim (Req 7.1, 7.2) ─────────
  if (pathname.startsWith('/admin')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!isSuperAdminToken(token)) {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden: Super Admin access required.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return NextResponse.next();
  }

  // ── 3. Extract and validate slug from the first path segment ───────────────

  // pathname always starts with '/', so split('/')[1] is the first segment.
  const segments = pathname.split('/');
  const rawSegment = segments[1] ?? '';

  // If the first segment is a reserved top-level path (api, auth, etc.),
  // pass through — it is handled by its own route (Req 1.6).
  if (RESERVED_SEGMENTS.has(rawSegment)) {
    return NextResponse.next();
  }

  // Normalize to lowercase before validation (Req 1.4).
  const slug = normalizeSlug(rawSegment);

  // Validate slug format: lowercase letters, numbers, hyphens, 2–63 chars (Req 1.5).
  if (!validateSlugFormat(slug)) {
    return new NextResponse(
      JSON.stringify({ error: `Invalid tenant slug: "${slug}".` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── 4. Tenant existence check (deferred) ───────────────────────────────────
  //
  // resolveTenantConfig uses Prisma which cannot run in Next.js Edge Runtime.
  // Tenant resolution (including is_active check) is handled in:
  //   src/app/[slug]/layout.jsx  →  calls resolveTenantConfig(slug)
  //                                 and redirects to /not-found-tenant if null.
  //
  // Failed resolutions are logged there as well (Req 10.4).

  // ── 5. Public slug paths: allow unauthenticated ────────────────────────────
  //
  // /[slug]/auth/login  — login page
  // /[slug]/manifest.json — PWA manifest (needed before authentication)
  const isPublicSlugPath =
    pathname === `/${slug}/auth/login` ||
    pathname.startsWith(`/${slug}/auth/login/`) ||
    pathname === `/${slug}/manifest.json`;

  if (isPublicSlugPath) {
    return NextResponse.next();
  }

  // ── 6. Protected slug paths: verify JWT (Req 6.3, 6.4, 6.5, 5.4) ──────────
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Missing or expired token → redirect to tenant's login page (Req 6.5).
  if (isTokenMissingOrExpired(token)) {
    const loginUrl = new URL(`/${slug}/auth/login`, req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token slug claim must match the URL slug (Req 5.4, 6.4, 6.6).
  // If the token belongs to a different tenant, redirect to that tenant's
  // login page instead of showing a raw JSON error.
  if (token.slug !== slug) {
    // DEBUG: remove after confirming slug matching works in production
    console.error(`[middleware] slug mismatch: token.slug="${token.slug}" url slug="${slug}"`);
    const loginUrl = new URL(`/${slug}/auth/login`, req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // All checks passed — allow the request to proceed.
  return NextResponse.next();
}

// ─── Matcher ─────────────────────────────────────────────────────────────────

/**
 * Run middleware on every path except static assets.
 * Excludes: _next/static, _next/image, favicon.ico, icons/, manifest.webmanifest
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|icons/|manifest\\.webmanifest).*)'],
};
