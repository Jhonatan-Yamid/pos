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
    const business = await db.business.findFirst();

    if (!business) {
      return NextResponse.json({ message: 'No business configuration found' }, { status: 404 });
    }

    return NextResponse.json(business, { status: 200 });
  } catch (error) {
    console.error('Error fetching business config:', error);
    return NextResponse.json({ message: 'Failed to fetch business config' }, { status: 500 });
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

    const business = await db.business.upsert({
      where: { id: data.id || 'default' },
      update: data,
      create: data,
    });

    return NextResponse.json(business, { status: 200 });
  } catch (error) {
    console.error('Error saving business config:', error);
    return NextResponse.json({ message: 'Failed to save business config' }, { status: 500 });
  } finally {
    await db.$disconnect();
  }
}
