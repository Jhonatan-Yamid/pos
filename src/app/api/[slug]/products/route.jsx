import { NextResponse } from 'next/server';
import { resolveTenantConfig } from '@/libs/tenantConfig';
import { getTenantDb } from '@/libs/tenantDb';
import { ok, fail } from '@/libs/apiResponse';

// Obtener todos los productos (para la lista) o uno con sus ingredientes (para editar)
export async function GET(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (id) {
      const product = await db.product.findUnique({
        where: { id: parseInt(id) },
        include: { ingredients: { include: { ingredient: true } } },
      });
      return ok(product);
    }

    const products = await db.product.findMany({
      orderBy: { name: 'asc' },
    });

    return ok(products);
  } catch (error) {
    console.error('Error al obtener productos', error);
    return fail('Error al obtener productos', 500, { error: error.message });
  } finally {
    await db.$disconnect();
  }
}

// Crear un nuevo producto con ingredientes
export async function POST(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const data = await request.json();
    const { name, description, price, category, ingredients, quantity, typeUnity, barcode } = data;

    const created = await db.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        quantity: quantity ? parseFloat(quantity) : null,
        typeUnity,
        barcode,
        category,
        ingredients: {
          create: (ingredients || []).map((item) => ({
            ingredient: { connect: { id: item.ingredientId } },
            quantity: item.quantity,
          })),
        },
      },
    });

    return ok(created, 201);
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

    // Actualización masiva de inventario (arreglo [{id, quantity}])
    if (Array.isArray(data)) {
      await Promise.all(
        data.map((item) =>
          db.product.update({
            where: { id: parseInt(item.id) },
            data: {
              quantity: item.quantity === 'Insuficiente' ? null : parseFloat(item.quantity),
            },
          })
        )
      );
      return ok({ message: 'Inventario actualizado' });
    }

    // Actualización de un solo producto
    const { id, name, description, price, category, ingredients, quantity, typeUnity, barcode } = data;

    const updated = await db.product.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        price: parseFloat(price),
        quantity: quantity ? parseFloat(quantity) : null,
        typeUnity,
        barcode,
        category,
        ingredients: ingredients
          ? {
              deleteMany: {},
              create: ingredients.map((item) => ({
                ingredient: { connect: { id: item.ingredientId } },
                quantity: item.quantity,
              })),
            }
          : undefined,
      },
    });

    return ok(updated);
  } catch (error) {
    console.error('Error al actualizar producto', error);
    return fail('Error al actualizar producto', 500, { error: error.message });
  } finally {
    await db.$disconnect();
  }
}

// Eliminar producto
export async function DELETE(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const { id } = await request.json();

    await db.product.update({
      where: { id: parseInt(id) },
      data: { ingredients: { deleteMany: {} } },
    });

    await db.product.delete({ where: { id: parseInt(id) } });
    return ok({ message: 'Producto eliminado.' });
  } catch (error) {
    console.error('Error al eliminar producto', error);
    return fail('Error al eliminar producto', 500, { error: error.message });
  } finally {
    await db.$disconnect();
  }
}
