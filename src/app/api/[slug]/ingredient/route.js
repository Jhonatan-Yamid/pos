import { NextResponse } from 'next/server';
import { resolveTenantConfig } from '@/libs/tenantConfig';
import { getTenantDb } from '@/libs/tenantDb';
import { ok, fail } from '@/libs/apiResponse';
import {
  buildIngredientCreateInput,
  buildIngredientUpdateInput,
  normalizeIngredientPayload,
  parseIngredientQuantity,
  validateIngredientPayload,
  validateIngredientBulkUpdate,
} from '@/services/ingredientService';

export async function GET(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const ingredients = await db.ingredient.findMany();
    return ok(ingredients);
  } catch (error) {
    console.error('Error al obtener ingredientes', error);
    return fail('Error al obtener ingredientes', 500, { error: error.message });
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
    const payload = normalizeIngredientPayload(data);
    const validationError = validateIngredientPayload(payload);

    if (validationError) {
      return fail(validationError, 400);
    }

    const createdIngredient = await db.ingredient.create({
      data: buildIngredientCreateInput(payload),
    });

    return ok(createdIngredient, 201);
  } catch (error) {
    console.error('Error al crear ingrediente', error);
    return fail('Error al crear ingrediente', 500, { error: error.message });
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

    // Edición individual de un ingrediente (viene desde el formulario CRUD)
    if (data.actualizar === true) {
      const payload = normalizeIngredientPayload(data);

      if (!data.id || typeof data.id !== 'number') {
        return fail('ID inválido para actualización.', 400);
      }

      const validationError = validateIngredientPayload(payload);
      if (validationError) {
        return fail(validationError, 400);
      }

      const updatedIngredient = await db.ingredient.update({
        where: { id: data.id },
        data: buildIngredientUpdateInput(payload),
      });

      return ok(updatedIngredient);
    }

    const bulkValidationError = validateIngredientBulkUpdate(data);
    if (bulkValidationError) {
      return fail(bulkValidationError, 400);
    }

    for (const { id, quantity } of data) {
      if (
        typeof id !== 'number' ||
        (typeof quantity !== 'string' && typeof quantity !== 'number' && quantity !== null)
      ) {
        return fail("Todos los elementos deben tener un 'id' y 'quantity' válidos.", 400);
      }
    }

    await Promise.all(
      data.map(({ id, quantity }) =>
        db.ingredient.update({
          where: { id },
          data: { quantity: parseIngredientQuantity(quantity), updatedAt: new Date() },
        })
      )
    );

    return ok({ message: 'Ingredientes actualizados correctamente.' });
  } catch (error) {
    console.error('Error actualizando ingredientes', error);
    return fail('Error actualizando ingredientes', 500, { error: error.message });
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
    const { id } = await request.json();

    if (!id) {
      return fail('ID del ingrediente es requerido.', 400);
    }

    await db.ingredient.delete({ where: { id: parseInt(id) } });
    return ok({ message: 'Ingrediente eliminado.' });
  } catch (error) {
    console.error('Error al eliminar ingrediente', error);
    return fail('Error al eliminar ingrediente', 500, { error: error.message });
  } finally {
    await db.$disconnect();
  }
}
