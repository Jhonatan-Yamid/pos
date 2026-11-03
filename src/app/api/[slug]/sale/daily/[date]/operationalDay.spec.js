import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeOperationalDay } from './operationalDay.js';

// ─── Test helpers ────────────────────────────────────────────────────────────

/**
 * Returns the hour (0-23) in Colombia time (UTC-5) for a given Date.
 * @param {Date} date
 * @returns {number}
 */
function getColombiaHour(date) {
  const COLOMBIA_OFFSET_MS = 5 * 60 * 60 * 1000;
  const colombiaMs = date.getTime() - COLOMBIA_OFFSET_MS;
  return new Date(colombiaMs).getUTCHours();
}

/**
 * Returns the calendar day in Colombia time as a YYYY-MM-DD string.
 * @param {Date} date
 * @returns {string}
 */
function getColombiaCalendarDay(date) {
  const COLOMBIA_OFFSET_MS = 5 * 60 * 60 * 1000;
  const colombiaMs = date.getTime() - COLOMBIA_OFFSET_MS;
  const d = new Date(colombiaMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns the previous day as a YYYY-MM-DD string.
 * @param {string} dateStr  YYYY-MM-DD
 * @returns {string}
 */
function subtractOneDay(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day - 1));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// ─── Property tests ──────────────────────────────────────────────────────────

describe('computeOperationalDay — property tests', () => {
  /**
   * Feature: report-payment-method-summary
   * Property 6: Lógica del día operativo — hora < 6 pertenece al día anterior
   * Validates: Requirements 1.10
   *
   * The date range is constrained to 1970–2100 to ensure JavaScript's Date
   * arithmetic works correctly in all helpers (Date.UTC with extreme years
   * like -127324 normalizes incorrectly). POS sales always fall within this
   * realistic range.
   */
  it('Property 6: hora Colombia < 6 → día operativo es el día calendario anterior; hora >= 6 → mismo día', () => {
    const MIN_DATE = new Date('1970-01-01T00:00:00.000Z');
    const MAX_DATE = new Date('2100-12-31T23:59:59.999Z');

    fc.assert(
      fc.property(
        fc.date({ min: MIN_DATE, max: MAX_DATE }),
        (dt) => {
          const colHour = getColombiaHour(dt);
          const opDay = computeOperationalDay(dt);
          const calDay = getColombiaCalendarDay(dt);
          if (colHour < 6) {
            return opDay === subtractOneDay(calDay);
          }
          return opDay === calDay;
        },
      ),
      { numRuns: 200 },
    );
  });
});
