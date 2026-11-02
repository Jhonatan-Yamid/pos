// app/api/[slug]/game/route.js
import { NextResponse } from 'next/server';
import { resolveTenantConfig } from '@/libs/tenantConfig';
import { getTenantDb } from '@/libs/tenantDb';

export async function GET(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const games = await db.game.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(games, { status: 200 });
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json({ message: 'Failed to fetch games' }, { status: 500 });
  } finally {
    await db.$disconnect();
  }
}
