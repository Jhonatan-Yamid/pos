/**
 * Task 5.2 — Unit + Property tests for middleware
 * Tests: Properties 2, 3, 9
 * Requirements: 1.1, 1.5, 5.4, 6.3, 6.4
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

// ─── Mock next-auth/jwt before importing middleware ───────────────────────
const mockGetToken = vi.hoisted(() => vi.fn());
vi.mock('next-auth/jwt', () => ({ getToken: mockGetToken }));

// Mock slugValidation (used in middleware)
vi.mock('@/services/slugValidation', () => ({
  normalizeSlug: (s) => s.toLowerCase(),
  validateSlugFormat: (s) => /^[a-z0-9-]{2,63}$/.test(s),
}));

import { middleware } from './middleware';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(pathname, headers = {}) {
  return {
    nextUrl: { pathname },
    url: `http://localhost${pathname}`,
    headers: new Headers(headers),
  };
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('middleware — unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid slug format', async () => {
    const req = makeRequest('/INVALID_SLUG/dashboard');
    const res = await middleware(req);
    expect(res.status).toBe(400);
  });

  it('passes through root path /', async () => {
    const req = makeRequest('/');
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('passes through /[slug]/auth/login without a token', async () => {
    mockGetToken.mockResolvedValue(null);
    const req = makeRequest('/mi-negocio/auth/login');
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('redirects to login when token is missing on protected path', async () => {
    mockGetToken.mockResolvedValue(null);
    const req = makeRequest('/mi-negocio/dashboard');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/mi-negocio/auth/login');
  });

  it('returns 401 when token.slug does not match URL slug', async () => {
    mockGetToken.mockResolvedValue({ slug: 'otro-tenant' });
    const req = makeRequest('/mi-negocio/dashboard');
    const res = await middleware(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 for /admin when not super admin', async () => {
    mockGetToken.mockResolvedValue({ role: 1 }); // not super admin
    const req = makeRequest('/admin/tenants');
    const res = await middleware(req);
    expect(res.status).toBe(403);
  });

  it('passes through /admin for super admin token', async () => {
    mockGetToken.mockResolvedValue({ role: 2 }); // ROLE_SUPER_ADMIN
    const req = makeRequest('/admin/tenants');
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('passes through /api paths', async () => {
    const req = makeRequest('/api/some/route');
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });
});

// ─── Property tests ───────────────────────────────────────────────────────────

describe('middleware — Property 2: invalid slugs always produce 400', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Property 2 — Feature: multi-tenant-architecture, Property 2: Invalid slug format is always rejected', async () => {
    // Generate strings that are STILL invalid AFTER normalization (toLowerCase).
    // Strings that are invalid: contain non-[a-z0-9-] chars, or too short/long.
    const invalidAfterNormalizeArb = fc.oneof(
      // Too short (0-1 chars) — stays too short after lowercase
      fc.string({ minLength: 0, maxLength: 1 }).map(s => s.toLowerCase()),
      // Contains special characters that survive lowercase
      fc.constant('has space'),
      fc.constant('has@special'),
      fc.constant('has.dot'),
      fc.constant('has_underscore'),
      // Too long (>63 chars of valid chars)
      fc.constant('a'.repeat(64)),
    );

    const reservedSegments = ['admin', 'api', 'auth', 'not-found-tenant', '_next', 'icons'];

    await fc.assert(
      fc.asyncProperty(invalidAfterNormalizeArb, async (rawSlug) => {
        if (reservedSegments.includes(rawSlug)) return; // skip reserved
        const req = makeRequest(`/${rawSlug}/dashboard`);
        const res = await middleware(req);
        expect(res.status).toBe(400);
      }),
      { numRuns: 50 }
    );
  });
});

describe('middleware — Property 9: session slug must match URL slug', () => {
  it('Property 9 — Feature: multi-tenant-architecture, Property 9: Session slug claim must match URL slug', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(fc.stringMatching(/^[a-z0-9-]{2,63}$/), { minLength: 2, maxLength: 2 }),
        async ([slugA, slugB]) => {
          // Token claims slug A but URL is slug B (different)
          mockGetToken.mockResolvedValue({ slug: slugA });
          const req = makeRequest(`/${slugB}/dashboard`);
          const res = await middleware(req);
          // Must return 401 (slug mismatch) since slugA !== slugB
          expect(res.status).toBe(401);
        }
      ),
      { numRuns: 30 }
    );
  });
});