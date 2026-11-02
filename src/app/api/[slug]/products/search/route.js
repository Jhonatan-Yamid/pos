// /api/[slug]/products/search/route.js
import { NextResponse } from 'next/server';
import { resolveTenantConfig } from '@/libs/tenantConfig';
import { getTenantDb } from '@/libs/tenantDb';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const products = await db.product.findMany({
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    const productsWithStock = products
      .filter((p) => p.ingredients.length === 1) // 👈 REGLA CLAVE
      .map((product) => {
        const ingredientQty = product.ingredients[0].ingredient.quantity;

        return {
          id: product.id,
          stock: ingredientQty ?? 0,
          barcode: product.barcode,
        };
      });

    return NextResponse.json(productsWithStock);
  } catch (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  } finally {
    await db.$disconnect();
  }
}
