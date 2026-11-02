import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

const mockDb = vi.hoisted(() => ({
  provider: { findMany: vi.fn() },
  $disconnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/libs/tenantConfig', () => ({
  resolveTenantConfig: vi.fn().mockResolvedValue({ database_url: 'fake://db' }),
}));

vi.mock('@/libs/tenantDb', () => ({
  getTenantDb: vi.fn().mockReturnValue(mockDb),
}));

const PARAMS = { params: { slug: 'test-tenant' } };

describe('Bug 1 — Endpoint projection: GET /api/[slug]/providers?minimal=1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$disconnect.mockResolvedValue(undefined);
  });

  it('Test 1.1 — response includes description field (bug is fixed in slug route)', async () => {
    mockDb.provider.findMany.mockResolvedValue([
      { id: 1, name: 'Distribuidora XYZ', description: 'Carnes y embutidos' },
      { id: 2, name: 'Lacteos del Valle', description: null },
    ]);

    const request = new Request('http://localhost/api/providers?minimal=1');
    const response = await GET(request, PARAMS);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toHaveProperty('description');
    expect(body[1]).toHaveProperty('description');
    expect(mockDb.provider.findMany).toHaveBeenCalledWith({
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
  });
});