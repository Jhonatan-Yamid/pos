import { NextResponse } from 'next/server';
import { resolveTenantConfig } from '@/libs/tenantConfig';
import { getTenantDb } from '@/libs/tenantDb';

export async function POST(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return new Response(JSON.stringify({ message: 'Tenant no encontrado.' }), { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const { endpoint, keys } = await request.json();

    const subscription = await db.subscription.create({
      data: {
        endpoint,
        keys,
      },
    });

    return new Response(JSON.stringify(subscription), { status: 201 });
  } catch (error) {
    console.error('Error al guardar la suscripción:', error);
    return new Response('Error al guardar la suscripción', { status: 500 });
  } finally {
    await db.$disconnect();
  }
}
