import { NextResponse } from 'next/server';
import { resolveTenantConfig } from '@/libs/tenantConfig';
import { getTenantDb } from '@/libs/tenantDb';

export async function POST(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const body = await request.json();

    const { action, productIds } = body;

    if (action === 'getCategories') {
      if (!productIds || !Array.isArray(productIds)) {
        return NextResponse.json(
          { message: 'IDs de productos requeridos' },
          { status: 400 }
        );
      }

      const products = await db.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, category: true },
      });

      return NextResponse.json(products, { status: 200 });
    }

    return NextResponse.json({ message: 'Acción no reconocida' }, { status: 400 });
  } catch (error) {
    console.error('Error en /api/[slug]/print:', error);
    return NextResponse.json({ message: 'Error de servidor' }, { status: 500 });
  } finally {
    await db.$disconnect();
  }
}
