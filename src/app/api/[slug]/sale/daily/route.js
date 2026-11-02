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
    const url = new URL(request.url);
    const daysParam = parseInt(url.searchParams.get('days') || '60', 10);

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysParam);

    /**
     * 💡 Lógica:
     *  - El "día operativo" comienza a las 15:00 (3 p.m.) hora Colombia (-05:00)
     *  - Las ventas entre medianoche y 5:59 a.m. pertenecen al día anterior
     */
    const dailySales = await db.$queryRaw`
      SELECT 
        DATE_FORMAT(
          DATE(
            CASE 
              WHEN HOUR(CONVERT_TZ(createdAt, '+00:00', '-05:00')) < 6 
                THEN DATE_SUB(CONVERT_TZ(createdAt, '+00:00', '-05:00'), INTERVAL 1 DAY)
              ELSE CONVERT_TZ(createdAt, '+00:00', '-05:00')
            END
          ),
          '%Y-%m-%d'
        ) AS date,
        DAYNAME(
          DATE(
            CASE 
              WHEN HOUR(CONVERT_TZ(createdAt, '+00:00', '-05:00')) < 6 
                THEN DATE_SUB(CONVERT_TZ(createdAt, '+00:00', '-05:00'), INTERVAL 1 DAY)
              ELSE CONVERT_TZ(createdAt, '+00:00', '-05:00')
            END
          )
        ) AS dayOfWeek,
        SUM(totalAmount) AS totalSales
      FROM Sale
      WHERE createdAt >= ${sinceDate}
      GROUP BY date
      ORDER BY date DESC;
    `;

    return NextResponse.json(dailySales, { status: 200 });
  } catch (error) {
    console.error('Error al obtener ventas diarias:', error);
    return NextResponse.json(
      { message: 'Error al obtener ventas diarias', error: error.message },
      { status: 500 }
    );
  } finally {
    await db.$disconnect();
  }
}
