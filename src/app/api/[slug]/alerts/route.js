import { NextResponse } from 'next/server';
import { resolveTenantConfig } from '@/libs/tenantConfig';
import { getTenantDb } from '@/libs/tenantDb';

// Crear una nueva alerta
export async function POST(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const { title, description, alertTime, repeatWeekly, repeatDay } = await request.json();

    if (!title || !description || !alertTime) {
      return NextResponse.json(
        { message: 'Todos los campos son obligatorios.' },
        { status: 400 }
      );
    }

    const alert = await db.alert.create({
      data: {
        title,
        description,
        alertTime: new Date(alertTime),
        repeatWeekly: repeatWeekly || false,
        repeatDay: repeatWeekly ? parseInt(repeatDay) : null,
      },
    });

    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    console.error('Error al crear la alerta:', error);
    return NextResponse.json(
      { message: 'Error al crear la alerta.' },
      { status: 500 }
    );
  } finally {
    await db.$disconnect();
  }
}

// Obtener todas las alertas
export async function GET(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const alerts = await db.alert.findMany({
      orderBy: { alertTime: 'asc' },
    });

    return NextResponse.json(alerts, { status: 200 });
  } catch (error) {
    console.error('Error al obtener las alertas:', error);
    return NextResponse.json(
      { message: 'Error al obtener las alertas.' },
      { status: 500 }
    );
  } finally {
    await db.$disconnect();
  }
}

// Eliminar una alerta
export async function DELETE(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { message: 'Se requiere el ID de la alerta.' },
        { status: 400 }
      );
    }

    await db.alert.delete({ where: { id } });

    return NextResponse.json({ message: 'Alerta eliminada.' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar la alerta:', error);
    return NextResponse.json(
      { message: 'Error al eliminar la alerta.' },
      { status: 500 }
    );
  } finally {
    await db.$disconnect();
  }
}
