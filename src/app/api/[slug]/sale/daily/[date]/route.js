import { NextResponse } from 'next/server';
import { resolveTenantConfig } from '@/libs/tenantConfig';
import { getTenantDb } from '@/libs/tenantDb';
import { buildUtcRange } from './operationalDay.js';
import { computeContribution } from './paymentContribution.js';

export async function GET(request, { params }) {
  const { slug, date } = params;

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { message: 'Formato de fecha inválido. Use YYYY-MM-DD.' },
      { status: 400 }
    );
  }

  const tenantConfig = await resolveTenantConfig(slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }

  const db = getTenantDb(tenantConfig);

  try {
    const { startUtc, endUtc } = buildUtcRange(date);

    const rows = await db.$queryRaw`
      SELECT
        paymentType,
        totalAmount,
        COALESCE(cashAmount, 0) AS cashAmount
      FROM Sale
      WHERE createdAt >= ${startUtc}
        AND createdAt <= ${endUtc}
    `;

    let transferCount = 0;
    let transferTotal = 0;
    let cashTotal = 0;

    for (const row of rows) {
      const { transfer, cash, countsAsTransfer } = computeContribution({
        paymentType: row.paymentType,
        totalAmount: Number(row.totalAmount),
        cashAmount: Number(row.cashAmount),
      });

      transferTotal += transfer;
      cashTotal += cash;
      if (countsAsTransfer) {
        transferCount += 1;
      }
    }

    return NextResponse.json(
      { transferCount, transferTotal, cashTotal },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al obtener detalle de pagos del día:', error);
    return NextResponse.json(
      { message: 'Error al obtener detalle de pagos del día', error: error.message },
      { status: 500 }
    );
  } finally {
    await db.$disconnect();
  }
}
