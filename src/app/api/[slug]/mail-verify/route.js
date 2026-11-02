import { ImapFlow } from 'imapflow';
import PostalMime from 'postal-mime';
import { NextResponse } from 'next/server';
import { resolveTenantConfig } from '@/libs/tenantConfig';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Strips HTML tags and decodes common HTML entities from a string.
 * Used to clean the parsed HTML body before applying regex.
 *
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')          // remove tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#[0-9]+;/g, ' ')
    .replace(/\s{2,}/g, ' ')           // collapse whitespace
    .trim();
}

/**
 * Parses a decoded Bancolombia notification email body and extracts:
 *   - monto  (amount, e.g. "$42,000.00")
 *   - quien  (sender name, e.g. "JUNIOR MEDINA")
 *   - fecha  (date+time, e.g. "30/10/2026 00:04")
 *
 * Example body text (after stripHtml):
 *   "Hierba Mala Gastroba, recibiste un pago de JUNIOR MEDINA por $42,000.00
 *    en tu cuenta *8997 conectado a la llave 0072975642 el 30/10/2026 a las 00:04."
 *
 * @param {string} text  Plain text (from postal-mime text field or stripped HTML)
 * @returns {{ monto: string|null, quien: string, fecha: string }}
 */
function parseBancolombiaBody(text) {
  // ── Monto ────────────────────────────────────────────────────────────────
  // Matches "$55,000.00" or "$81.700,00" etc.
  const montoMatch = text.match(/\$[\d.,]+/);
  const monto = montoMatch ? montoMatch[0] : null;

  // ── Quien ────────────────────────────────────────────────────────────────
  // Bancolombia body: "recibiste un pago de BRAIDER ARENAS por $55,000.00"
  // Name is between "pago de" and " por $"
  let quien = 'Desconocido';

  // Primary: everything between "pago de" and " por $"
  const quienMatch = text.match(/pago de\s+(.+?)\s+por\s+\$/i);
  if (quienMatch) {
    const nombre = quienMatch[1].trim();
    const palabrasProhibidas = ['FAVOR', 'CUENTA', 'LLAVE', 'NOTIFICACIONES'];
    const esProhibido = palabrasProhibidas.some((p) => nombre.toUpperCase().includes(p));
    if (!esProhibido && nombre.length >= 3) {
      quien = nombre;
    }
  }

  // ── Fecha ────────────────────────────────────────────────────────────────
  // Body: "el 02/11/2026 a las 00:18"
  let fecha = 'Sin fecha';
  const fechaMatch = text.match(/(\d{2}\/\d{2}\/\d{4})\s+a\s+las\s+(\d{2}:\d{2})/i);
  if (fechaMatch) {
    fecha = `${fechaMatch[1]} ${fechaMatch[2]}`;
  } else {
    const soloFecha = text.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (soloFecha) fecha = soloFecha[1];
  }

  return { monto, quien, fecha };
}

export async function GET(request, { params }) {
  const { slug } = params;

  const tenantConfig = await resolveTenantConfig(slug);
  if (!tenantConfig) {
    return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
  }

  const emailUser = tenantConfig.email_user;
  const emailPass = tenantConfig.email_pass;

  if (!emailUser || !emailPass) {
    return NextResponse.json(
      { success: false, error: 'Email credentials not configured for this tenant' },
      { status: 503 }
    );
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: emailUser, pass: emailPass },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    // Search on the server: from Bancolombia AND body contains "recibiste"
    // (every transfer notification contains "recibiste un pago de ...").
    // This avoids downloading every message before filtering.
    const messages = await client.search({
      header: { from: 'alertasynotificaciones@ayn.notificacionesbancolombia.com' },
      body: 'recibiste',
    });

    // Most recent first — only need up to 3
    const allIds = [...messages].reverse();
    const resultados = [];

    for (const uid of allIds) {
      if (resultados.length >= 3) break;

      const message = await client.fetchOne(uid, { source: true, envelope: true });
      const subject = message.envelope.subject || '';

      // Parse full MIME — handles quoted-printable, base64, HTML, etc.
      const parser = new PostalMime();
      const parsed = await parser.parse(message.source);

      // Prefer plain text; fall back to stripped HTML
      const bodyText = parsed.text
        ? parsed.text
        : parsed.html
        ? stripHtml(parsed.html)
        : '';

      const { monto, quien, fecha } = parseBancolombiaBody(bodyText);

      if (monto) {
        resultados.push({
          sujeto: subject,
          monto,
          quien,
          fecha,
          id_interno: uid,
        });
      }
    }

    lock.release();
    await client.logout();

    return NextResponse.json({ success: true, data: resultados });
  } catch (error) {
    console.error('Error en IMAP:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
