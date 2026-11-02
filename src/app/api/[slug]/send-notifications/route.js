import webPush from '@/libs/webPushConfig';
import { resolveTenantConfig } from '@/libs/tenantConfig';
import { getTenantDb } from '@/libs/tenantDb';
import { DateTime } from 'luxon';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return new Response(
      JSON.stringify({ success: false, message: 'Tenant no encontrado.' }),
      { status: 404 }
    );
  }
  const db = getTenantDb(tenantConfig);
  try {
    const timeZone = 'America/Bogota';

    const now = DateTime.now().setZone(timeZone);

    const todayStart = now
      .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
      .toUTC()
      .toISO();
    const todayEnd = now
      .set({ hour: 24, minute: 0, second: 0, millisecond: 0 })
      .toUTC()
      .toISO();

    const alerts = await db.alert.findMany({
      where: {
        OR: [
          {
            alertTime: {
              gte: todayStart,
              lt: todayEnd,
            },
          },
          {
            repeatWeekly: true,
            repeatDay: now.weekday === 7 ? 0 : now.weekday,
          },
        ],
      },
    });

    console.log('Fechas calculadas:', { todayStart, todayEnd });
    console.log('Alertas encontradas:', alerts);

    if (alerts.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `No hay alertas para hoy. Rango: ${todayStart} - ${todayEnd}`,
        }),
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    const subscriptions = await db.subscription.findMany();

    let alertassumadas = '';
    for (const alert of alerts) {
      alertassumadas += alert.title;

      const notificationPayload = JSON.stringify({
        title: alert.title,
        body: alert.description,
      });

      for (const subscription of subscriptions) {
        try {
          await webPush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: subscription.keys,
            },
            notificationPayload
          );
          console.log('Notificación enviada correctamente a:', subscription.endpoint);
        } catch (error) {
          console.error('Error al enviar notificación:', {
            endpoint: subscription.endpoint,
            error: error.message,
            statusCode: error.statusCode,
          });

          if (error.statusCode === 410 || error.statusCode === 404) {
            await db.subscription.delete({
              where: { endpoint: subscription.endpoint },
            });
            console.log('Suscripción eliminada por ser inválida:', subscription.endpoint);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notificaciones enviadas. Rango: ${todayStart} - ${todayEnd}. Títulos: ${alertassumadas}`,
      }),
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Error en el proceso de notificación:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } finally {
    await db.$disconnect();
  }
}
