//🚨🚨🚨ESTE ES SOLO USADO POR EL HOOK DE USESALEFORMLOGIC PARA LOOS AVAILE PRODUCTOS AND ADDITIONS

import { NextResponse } from 'next/server';
import { resolveTenantConfig } from '@/libs/tenantConfig';
import { getTenantDb } from '@/libs/tenantDb';
import { ok, fail } from '@/libs/apiResponse';
import {
  buildProductCreateInput,
  buildProductUpdateInput,
  normalizeProductPayload,
  validateProductPayload,
} from '@/services/productService';

export async function GET(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('search') || '';
    const categoryQuery = url.searchParams.get('category');

    const whereClause = {};

    if (searchQuery) {
      whereClause.name = {
        contains: searchQuery,
        mode: 'insensitive',
      };
    }

    if (categoryQuery) {
      whereClause.category = categoryQuery;
    } else {
      whereClause.category = { not: 'Adiciones' };
    }

    const products = await db.product.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        price: true,
        category: true,
        quantity: true,
        barcode: true,
        typeUnity: true,
      },
    });

    return ok(products);
  } catch (error) {
    console.error('Error al obtener productos', error);
    return fail('Error al obtener productos', 500, { error: error.message });
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
    const payload = normalizeProductPayload(data);
    const validationError = validateProductPayload(payload);

    if (validationError) {
      return fail(validationError, 400);
    }

    const createdProduct = await db.product.create({
      data: buildProductCreateInput(payload),
    });

    return ok(createdProduct, 201);
  } catch (error) {
    console.error('Error al crear producto', error);
    return fail('Error al crear producto', 500, { error: error.message });
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
    const data = await request.json();
    const id = parseInt(data?.id, 10);

    if (!id || Number.isNaN(id)) {
      return fail('ID del producto es requerido', 400);
    }

    const payload = normalizeProductPayload(data);
    const validationError = validateProductPayload(payload);

    if (validationError) {
      return fail(validationError, 400);
    }

    const updatedProduct = await db.product.update({
      where: { id },
      data: buildProductUpdateInput(payload),
    });

    await db.productIngredient.deleteMany({ where: { productId: id } });

    await Promise.all(
      payload.selectedIngredients.map((ingredientId) =>
        db.productIngredient.create({
          data: {
            productId: id,
            ingredientId,
            quantity: 1,
          },
        })
      )
    );

    return ok(updatedProduct);
  } catch (error) {
    console.error('Error al actualizar producto', error);
    return fail('Error al actualizar producto', 500, { error: error.message });
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
    const data = await request.json();
    const id = parseInt(data?.id, 10);

    if (!id || Number.isNaN(id)) {
      return fail('ID del producto es requerido', 400);
    }

    await db.productIngredient.deleteMany({
      where: { productId: id },
    });

    await db.product.delete({
      where: { id },
    });

    return ok({ message: 'Producto eliminado' });
  } catch (error) {
    console.error('Error al eliminar producto', error);
    return fail('Error al eliminar producto', 500, { error: error.message });
  } finally {
    await db.$disconnect();
  }
}
