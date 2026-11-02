import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '../../../../../prisma/@prisma/client-test';
import { GET, POST, PUT, DELETE } from './route';

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

describe('providers route integration tests', () => {
  let providerId;

  beforeAll(async () => {
    await prisma.$connect();
    testClient = prisma;
    testClient.$disconnect = vi.fn().mockResolvedValue(undefined);
    await prisma.ingredient.deleteMany().catch(() => {});
    await prisma.provider.deleteMany().catch(() => {});
  });

  afterAll(async () => {
    await prisma.provider.deleteMany().catch(() => {});
    await prisma.$disconnect();
  });

  it('POST creates a provider', async () => {
    const request = await makeRequest('POST', 'http://localhost/api/providers', {
      name: 'Proveedor Int',
      description: 'Descripción Int',
      accountNumber: '12345',
      phone: '555-1234',
    });

    const response = await POST(request, PARAMS);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ name: 'Proveedor Int', accountNumber: '12345' });
    expect(body).toHaveProperty('id');

    providerId = body.id;
  });

  it('GET minimal returns providers list with description', async () => {
    const request = new Request('http://localhost/api/providers?minimal=1');
    const response = await GET(request, PARAMS);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((item) => item.id === providerId && item.name === 'Proveedor Int')).toBe(true);
    expect(body[0]).not.toHaveProperty('accountNumber');
    // Bug fix: description is now included
    expect(body[0]).toHaveProperty('description');
  });

  it('PUT updates a provider', async () => {
    const request = await makeRequest('PUT', 'http://localhost/api/providers', {
      id: providerId,
      name: 'Proveedor Int Actualizado',
      description: 'Actualizado',
      accountNumber: '12345',
      phone: '555-1234',
    });

    const response = await PUT(request, PARAMS);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.name).toBe('Proveedor Int Actualizado');
  });

  it('DELETE removes a provider', async () => {
    const request = await makeRequest('DELETE', 'http://localhost/api/providers', {
      id: providerId,
    });

    const response = await DELETE(request, PARAMS);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ message: 'Proveedor eliminado' });
  });
});