import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '../../../../../prisma/@prisma/client-test';
import { POST, GET, DELETE } from './route';

vi.mock('@/libs/tenantConfig', () => ({
  resolveTenantConfig: vi.fn().mockResolvedValue({ database_url: 'sqlite://test' }),
}));

let testClient;
vi.mock('@/libs/tenantDb', () => ({
  getTenantDb: vi.fn(() => testClient),
}));

const prisma = new PrismaClient();
const PARAMS = { params: { slug: 'test-tenant' } };

async function makeRequest(method, url, body) {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null,
  });
}

describe('sale route integration tests', () => {
  let product;
  let ingredient;
  let provider;

  beforeAll(async () => {
    await prisma.$connect();
    testClient = prisma;
    testClient.$disconnect = vi.fn().mockResolvedValue(undefined);

    await prisma.saleProductAddition.deleteMany().catch(() => {});
    await prisma.saleProduct.deleteMany().catch(() => {});
    await prisma.sale.deleteMany().catch(() => {});
    await prisma.productIngredient.deleteMany().catch(() => {});
    await prisma.ingredient.deleteMany().catch(() => {});
    await prisma.product.deleteMany().catch(() => {});
    await prisma.provider.deleteMany().catch(() => {});

    provider = await prisma.provider.create({
      data: {
        name: 'Proveedor Test Int',
        accountNumber: '9999',
        phone: '000-0000',
      },
    });

    ingredient = await prisma.ingredient.create({
      data: {
        name: 'Ingrediente Test Int',
        price: 100,
        quantity: 50,
        typeUnity: 'kg',
        providerId: provider.id,
      },
    });

    product = await prisma.product.create({
      data: {
        name: 'Producto Test Int',
        price: 10,
        quantity: 10,
      },
    });

    await prisma.productIngredient.create({
      data: {
        productId: product.id,
        ingredientId: ingredient.id,
        quantity: 2,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  let createdSaleId;

  it('POST creates a sale and decrements ingredient quantity', async () => {
    const request = await makeRequest('POST', 'http://localhost/api/sale', {
      tableNumber: 1,
      saleStatus: 'en proceso',
      totalAmount: 20,
      products: [
        {
          id: product.id,
          quantity: 2,
          additions: [],
        },
      ],
    });

    const response = await POST(request, PARAMS);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('products');

    createdSaleId = body.id;

    const updatedIngredient = await prisma.ingredient.findUnique({
      where: { id: ingredient.id },
    });

    expect(updatedIngredient.quantity).toBe(46);
  });

  it('GET returns sales for last 30 days', async () => {
    const request = await makeRequest('GET', 'http://localhost/api/sale');
    const response = await GET(request, PARAMS);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it('DELETE removes a sale and restores ingredient quantity', async () => {
    expect(createdSaleId).toBeDefined();

    const request = new Request(`http://localhost/api/sale?id=${createdSaleId}`);
    const response = await DELETE(request, PARAMS);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toContain(`Venta con ID ${createdSaleId} eliminada exitosamente`);

    const restoredIngredient = await prisma.ingredient.findUnique({
      where: { id: ingredient.id },
    });

    expect(restoredIngredient.quantity).toBe(50);
  });
});