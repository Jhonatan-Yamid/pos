import { NextResponse } from 'next/server';
import { resolveTenantConfig } from '@/libs/tenantConfig';
import { getTenantDb } from '@/libs/tenantDb';
import { ok, fail } from '@/libs/apiResponse';
import {
  buildProviderCreateInput,
  buildProviderUpdateInput,
  normalizeProviderPayload,
  validateProviderPayload,
} from '@/services/providerService';

export async function GET(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get('minimal') === '1') {
      const providers = await db.provider.findMany({
        select: { id: true, name: true, description: true },
        orderBy: { name: 'asc' },
      });
      return ok(providers);
    }

    const providers = await db.provider.findMany({
      include: { ingredients: true },
    });
    return ok(providers);
  } catch (error) {
    console.error('Error al obtener proveedores', error);
    return fail('Error al obtener proveedores', 500, { error: error.message });
  } finally {
    await db.$disconnect();
  }
}

export async function POST(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const data = await request.json();
    const payload = normalizeProviderPayload(data);
    const validationError = validateProviderPayload(payload);

    if (validationError) {
      return fail(validationError, 400);
    }

    const newProvider = await db.provider.create({
      data: buildProviderCreateInput(payload),
    });
    return ok(newProvider, 201);
  } catch (error) {
    console.error('Error al crear proveedor', error);
    return fail('Error al crear proveedor', 500, { error: error.message });
  } finally {
    await db.$disconnect();
  }
}

export async function PUT(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const body = await request.json();
    const id = parseInt(body.id);

    if (!id || isNaN(id)) {
      return fail('El ID es requerido para actualizar un proveedor', 400);
    }

    const payload = normalizeProviderPayload(body);
    const validationError = validateProviderPayload(payload);

    if (validationError) {
      return fail(validationError, 400);
    }

    const updatedProvider = await db.provider.update({
      where: { id },
      data: buildProviderUpdateInput(payload),
    });

    return ok(updatedProvider);
  } catch (error) {
    console.error('Error al actualizar proveedor', error);
    return fail('Error al actualizar proveedor', 500, { error: error.message });
  } finally {
    await db.$disconnect();
  }
}

export async function DELETE(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const body = await request.json();

    if (!body?.id) {
      return fail('El ID es requerido para eliminar un proveedor', 400);
    }

    await db.provider.delete({ where: { id: body.id } });
    return ok({ message: 'Proveedor eliminado' });
  } catch (error) {
    console.error('Error al eliminar proveedor', error);
    return fail('Error al eliminar proveedor', 500, { error: error.message });
  } finally {
    await db.$disconnect();
  }
}
