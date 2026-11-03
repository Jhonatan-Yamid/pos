/**
 * Lógica del día operativo para la zona horaria Colombia (UTC-5).
 *
 * El día operativo comienza a las 06:00 hora Colombia (= 11:00 UTC).
 * Las ventas con hora Colombia < 6 pertenecen al día calendario anterior.
 */

/**
 * Dado un `Date` en UTC, devuelve la fecha operativa Colombia como string `YYYY-MM-DD`.
 *
 * Reglas:
 *   - Si la hora en Colombia (UTC-5) es < 6 → fecha operativa = día calendario Colombia - 1
 *   - Si la hora en Colombia (UTC-5) es >= 6 → fecha operativa = día calendario Colombia
 *
 * @param {Date} date  Instancia de Date (se interpreta en UTC)
 * @returns {string}   Fecha operativa en formato `YYYY-MM-DD`
 */
export function computeOperationalDay(date) {
  // Obtener la hora en Colombia: UTC-5 → restar 5 horas en ms
  const COLOMBIA_OFFSET_MS = 5 * 60 * 60 * 1000;
  const colombiaMs = date.getTime() - COLOMBIA_OFFSET_MS;
  const colombiaDate = new Date(colombiaMs);

  // Año, mes y día calendario en hora Colombia
  const year = colombiaDate.getUTCFullYear();
  const month = colombiaDate.getUTCMonth(); // 0-based
  const day = colombiaDate.getUTCDate();
  const hour = colombiaDate.getUTCHours();

  let operationalDate;
  if (hour < 6) {
    // Pertenece al día anterior
    operationalDate = new Date(Date.UTC(year, month, day - 1));
  } else {
    operationalDate = new Date(Date.UTC(year, month, day));
  }

  return formatDateUTC(operationalDate);
}

/**
 * Dado un string de fecha operativa `YYYY-MM-DD`, devuelve el rango UTC
 * que abarca ese día operativo completo.
 *
 *   startUtc = `YYYY-MM-DD 11:00:00` UTC  (= D 06:00 hora Colombia)
 *   endUtc   = `(D+1) 10:59:59` UTC        (= D+1 05:59:59 hora Colombia)
 *
 * @param {string} dateStr  Fecha operativa en formato `YYYY-MM-DD`
 * @returns {{ startUtc: string, endUtc: string }}
 */
export function buildUtcRange(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);

  // startUtc: mismo día D a las 11:00:00 UTC
  const start = new Date(Date.UTC(year, month - 1, day, 11, 0, 0));

  // endUtc: día siguiente (D+1) a las 10:59:59 UTC
  const end = new Date(Date.UTC(year, month - 1, day + 1, 10, 59, 59));

  return {
    startUtc: formatDatetimeUTC(start),
    endUtc: formatDatetimeUTC(end),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Formatea un Date como `YYYY-MM-DD` usando sus componentes UTC.
 * @param {Date} d
 * @returns {string}
 */
function formatDateUTC(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Formatea un Date como `YYYY-MM-DD HH:mm:ss` usando sus componentes UTC.
 * @param {Date} d
 * @returns {string}
 */
function formatDatetimeUTC(d) {
  const date = formatDateUTC(d);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${date} ${hh}:${mm}:${ss}`;
}
