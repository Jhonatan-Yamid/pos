import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST, DELETE } from './route';

const mockDb = vi.hoisted(() => ({
  sale: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  saleProduct: { create: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
  saleProductAddition: { create: vi.fn(), deleteMany: vi.fn() },
  productIngredient: { findMany: vi.fn() },
  ingredient: { findUnique: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
  $disconnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/libs/tenantConfig', () => ({
  resolveTenantConfig: vi.fn().mockResolvedValue({ database_url: 'fake://db' }),
}));

vi.mock('@/libs/tenantDb', () => ({
  getTenantDb: vi.fn().mockReturnValue(mockDb),
}));

const PARAMS = { params: { slug: 'test-tenant' } };

describe('src/app/api/[slug]/sale/route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$disconnect.mockResolvedValue(undefined);
  });

  it('GET returns sales list', async () => {
    const sales = [{ id: 1, totalAmount: 100 }];
    mockDb.sale.findMany.mockResolvedValue(sales);

    const request = new Request('http://localhost/api/sale');
    const response = await GET(request, PARAMS);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(sales);
    expect(mockDb.sale.findMany).toHaveBeenCalled();
    expect(mockDb.$disconnect).toHaveBeenCalled();
  });

  it('POST returns 400 when products missing', async () => {
    const request = new Request('http://localhost/api/sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: [] }),
    });

    const response = await POST(request, PARAMS);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: 'Debe seleccionar al menos un producto' });
  });

  it('POST creates a sale when payload is valid', async () => {
    const newSale = { id: 10 };
    const finalSale = { id: 10, totalAmount: 200 };

    mockDb.sale.create.mockResolvedValue(newSale);
    mockDb.saleProduct.create.mockResolvedValue({ id: 'sp1' });
    mockDb.productIngredient.findMany.mockResolvedValue([]);
    mockDb.sale.findUnique.mockResolvedValue(finalSale);

    const request = new Request('http://localhost/api/sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableNumber: 1, saleStatus: 'en proceso', totalAmount: 200,
        products: [{ id: 1, quantity: 2, additions: [] }],
      }),
    });

    const response = await POST(request, PARAMS);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(finalSale);
    expect(mockDb.sale.create).toHaveBeenCalled();
    expect(mockDb.$disconnect).toHaveBeenCalled();
  });

  it('DELETE removes a sale when id is provided', async () => {
    const prismaMock = {
      saleProduct: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn().mockResolvedValue({}) },
      productIngredient: { findMany: vi.fn().mockResolvedValue([]) },
      ingredient: { findUnique: vi.fn(), update: vi.fn() },
      saleProductAddition: { deleteMany: vi.fn().mockResolvedValue({}) },
      sale: { delete: vi.fn().mockResolvedValue({}) },
    };

    mockDb.$transaction.mockImplementationOnce(async (fn) => fn(prismaMock));

    const request = new Request('http://localhost/api/sale?id=5');
    const response = await DELETE(request, PARAMS);

    expect(response.status).toBe(200);
    expect((await response.json()).message).toContain('Venta con ID');
    expect(mockDb.$disconnect).toHaveBeenCalled();
  });
});