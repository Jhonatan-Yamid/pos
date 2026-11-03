import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import { GET } from './route';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockDb = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  $disconnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/libs/tenantConfig', () => ({
  resolveTenantConfig: vi.fn().mockResolvedValue({ database_url: 'fake://db' }),
}));

vi.mock('@/libs/tenantDb', () => ({
  getTenantDb: vi.fn().mockReturnValue(mockDb),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a minimal Next.js-style request object for the GET handler.
 */
function makeRequest(date = '2024-05-20') {
  return new Request(`http://localhost/api/test-tenant/sale/daily/${encodeURIComponent(date)}`);
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('GET /api/[slug]/sale/daily/[date]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$disconnect.mockResolvedValue(undefined);
  });

  // ── Test case 1: valid date with sales ──────────────────────────────────────
  it('returns 200 with aggregated transferCount, transferTotal, cashTotal when sales exist', async () => {
    // Three rows: "transferencia" (50000), "mixto" (30000 total / 10000 cash), "efectivo" (20000)
    mockDb.$queryRaw.mockResolvedValue([
      { paymentType: 'transferencia', totalAmount: 50000, cashAmount: 0 },
      { paymentType: 'mixto',         totalAmount: 30000, cashAmount: 10000 },
      { paymentType: 'efectivo',      totalAmount: 20000, cashAmount: 0 },
    ]);

    const response = await GET(makeRequest(), { params: { slug: 'test-tenant', date: '2024-05-20' } });

    expect(response.status).toBe(200);
    const body = await response.json();

    // transferencia: transfer=50000, cash=0, counts
    // mixto:         transfer=20000, cash=10000, counts
    // efectivo:      transfer=0,     cash=20000, does NOT count
    expect(body).toEqual({
      transferCount: 2,
      transferTotal: 70000,
      cashTotal: 30000,
    });
    expect(mockDb.$disconnect).toHaveBeenCalled();
  });

  // ── Test case 2: valid date with no sales ───────────────────────────────────
  it('returns 200 with all-zero values when no sales exist for the date', async () => {
    mockDb.$queryRaw.mockResolvedValue([]);

    const response = await GET(makeRequest(), { params: { slug: 'test-tenant', date: '2024-05-20' } });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      transferCount: 0,
      transferTotal: 0,
      cashTotal: 0,
    });
    expect(mockDb.$disconnect).toHaveBeenCalled();
  });

  // ── Test case 3: invalid date format → 400 ─────────────────────────────────
  it('returns 400 when date does not match YYYY-MM-DD format', async () => {
    // Should return 400 without ever touching the DB
    const response = await GET(makeRequest('20-05-2024'), { params: { slug: 'test-tenant', date: '20-05-2024' } });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('message');
    expect(mockDb.$queryRaw).not.toHaveBeenCalled();
  });

  // ── Test case 4: tenant not found → 404 ────────────────────────────────────
  it('returns 404 when resolveTenantConfig returns null', async () => {
    const { resolveTenantConfig } = await import('@/libs/tenantConfig');
    resolveTenantConfig.mockResolvedValueOnce(null);

    const response = await GET(makeRequest(), { params: { slug: 'unknown-tenant', date: '2024-05-20' } });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('message');
    expect(mockDb.$queryRaw).not.toHaveBeenCalled();
  });

  // ── Test case 5: DB error → 500 ────────────────────────────────────────────
  it('returns 500 when $queryRaw throws an error', async () => {
    mockDb.$queryRaw.mockRejectedValue(new Error('Connection lost'));

    const response = await GET(makeRequest(), { params: { slug: 'test-tenant', date: '2024-05-20' } });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toHaveProperty('message');
    // $disconnect must still be called in the finally block
    expect(mockDb.$disconnect).toHaveBeenCalled();
  });

  // ── Extra: null / unrecognized paymentType contributes nothing ───────────────
  it('excludes null and unrecognized paymentType rows from all totals', async () => {
    mockDb.$queryRaw.mockResolvedValue([
      { paymentType: null,   totalAmount: 15000, cashAmount: 0 },
      { paymentType: 'otro', totalAmount: 8000,  cashAmount: 0 },
    ]);

    const response = await GET(makeRequest(), { params: { slug: 'test-tenant', date: '2024-05-20' } });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      transferCount: 0,
      transferTotal: 0,
      cashTotal: 0,
    });
  });
});

// ─── Property-Based Tests ─────────────────────────────────────────────────────

describe('route GET — property tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$disconnect.mockResolvedValue(undefined);
  });

  // Feature: report-payment-method-summary, Property 5: Invalid date → 400
  // Validates: Requirements 1.8
  it('Property 5: Cualquier string que no sea YYYY-MM-DD recibe respuesta 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter((s) => !/^\d{4}-\d{2}-\d{2}$/.test(s)),
        async (invalidDate) => {
          const res = await GET(makeRequest(invalidDate), {
            params: { slug: 'test-tenant', date: invalidDate },
          });
          return res.status === 400;
        }
      ),
      { numRuns: 100 }
    );
  });
});
