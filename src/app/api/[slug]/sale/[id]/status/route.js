// app/api/[slug]/sale/[id]/status/route.js
import { NextResponse } from 'next/server';
import { resolveTenantConfig } from '@/libs/tenantConfig';
import { getTenantDb } from '@/libs/tenantDb';

export async function PUT(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const { id } = params;
    const { status, paymentType, cashAmount, discountPercent, totalAmount } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ message: 'ID de venta o estado faltante.' }, { status: 400 });
    }

    const saleIdInt = parseInt(id);
    if (isNaN(saleIdInt)) {
      return NextResponse.json({ message: 'ID de venta inválido.' }, { status: 400 });
    }

    const allowedStatuses = ['en proceso', 'en mesa', 'pagada', 'domicilio', 'hecho', 'en tienda'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ message: 'Estado proporcionado no válido.' }, { status: 400 });
    }

    const paymentData = {};
    if (paymentType !== undefined) {
      if (!['efectivo', 'transferencia', 'mixto'].includes(paymentType)) {
        return NextResponse.json({ message: 'Tipo de pago no válido.' }, { status: 400 });
      }
      paymentData.paymentType = paymentType;
      paymentData.cashAmount =
        paymentType === 'transferencia' ? null : Number(cashAmount) || 0;
    }
    if (discountPercent !== undefined) {
      const pct = Number(discountPercent) || 0;
      if (pct < 0 || pct > 100) {
        return NextResponse.json(
          { message: 'El descuento debe estar entre 0 y 100.' },
          { status: 400 }
        );
      }
      paymentData.discountPercent = pct;
    }
    if (totalAmount !== undefined) {
      paymentData.totalAmount = Number(totalAmount);
    }

    const updatedSale = await db.sale.update({
      where: { id: saleIdInt },
      data: {
        status: status,
        updatedAt: new Date(),
        ...paymentData,
      },
    });

    return NextResponse.json(updatedSale, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el estado de la venta:', error);
    return NextResponse.json(
      {
        message: 'Error interno del servidor al actualizar el estado de la venta.',
        error: error.message,
      },
      { status: 500 }
    );
  } finally {
    await db.$disconnect();
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
}

export async function POST() {
  return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
}
