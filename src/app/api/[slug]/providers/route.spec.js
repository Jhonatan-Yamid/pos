import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST, PUT, DELETE } from './route';

const mockDb = vi.hoisted(() => ({
  provider: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  $disconnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/libs/tenantConfig', () => ({
  resolveTenantConfig: vi.fn().mockResolvedValue({ database_url: 'fake://db' }),
}));

vi.mock('@/libs/tenantDb', () => ({
  getTenantDb: vi.fn().mockReturnValue(mockDb),
}));

const PARAMS = { params: { slug: 'test-tenant' } };

describe('src/app/api/[slug]/providers/route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$disconnect.mockResolvedValue(undefined);
  });

  it('GET returns minimal providers when minimal=1', async () => {
    mockDb.provider.findMany.mockResolvedValue([{ id: 1, name: 'Proveedor A', description: 'Desc' }]);
    const request = new Request('http://localhost/api/providers?minimal=1');

    const response = await GET(request, PARAMS);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 1, name: 'Proveedor A', description: 'Desc' }]);
    expect(mockDb.provider.findMany).toHaveBeenCalledWith({
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
    expect(mockDb.$disconnect).toHaveBeenCalled();
  });

  it('GET returns full providers list when minimal is absent', async () => {
    mockDb.provider.findMany.mockResolvedValue([{ id: 2, name: 'Proveedor B', ingredients: [] }]);
    const request = new Request('http://localhost/api/providers');

    const response = await GET(request, PARAMS);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 2, name: 'Proveedor B', ingredients: [] }]);
    expect(mockDb.provider.findMany).toHaveBeenCalledWith({ include: { ingredients: true } });
  });

  it('POST returns 400 when the payload is invalid', async () => {
    const request = new Request('http://localhost/api/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', accountNumber: '' }),
    });

    const response = await POST(request, PARAMS);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: 'El nombre del proveedor es requerido.' });
  });

  it('POST creates a provider when the payload is valid', async () => {
    const created = { id: 3, name: 'Proveedor C', description: 'Desc', accountNumber: '1234', phone: '555' };
    mockDb.provider.create.mockResolvedValue(created);

    const request = new Request('http://localhost/api/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Proveedor C', description: 'Desc', accountNumber: '1234', phone: '555' }),
    });

    const response = await POST(request, PARAMS);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(created);
    expect(mockDb.provider.create).toHaveBeenCalledWith({
      data: { name: 'Proveedor C', description: 'Desc', accountNumber: '1234', phone: '555' },
    });
  });

  it('PUT returns 400 when id is invalid', async () => {
    const request = new Request('http://localhost/api/providers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'abc', name: 'Proveedor D', accountNumber: '5678' }),
    });

    const response = await PUT(request, PARAMS);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: 'El ID es requerido para actualizar un proveedor' });
  });

  it('DELETE removes a provider when id is provided', async () => {
    mockDb.provider.delete.mockResolvedValue({});
    const request = new Request('http://localhost/api/providers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 4 }),
    });

    const response = await DELETE(request, PARAMS);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: 'Proveedor eliminado' });
    expect(mockDb.provider.delete).toHaveBeenCalledWith({ where: { id: 4 } });
    expect(mockDb.$disconnect).toHaveBeenCalled();
  });
});