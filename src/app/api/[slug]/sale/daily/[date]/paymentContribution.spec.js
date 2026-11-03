import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { computeContribution } from "./paymentContribution.js";

// Monetary amounts in a POS system are integers (Colombian pesos, no decimals).
// Using integers avoids IEEE 754 precision issues when computing totalAmount - cashAmount.
const nonNegativeInt = fc.integer({ min: 0, max: 10_000_000 });

describe("computeContribution — property tests", () => {
  // Feature: report-payment-method-summary, Property 1: Mixto split
  // Validates: Requirements 1.3, 1.6
  it("Property 1: Mixto split — transferencia es el complemento del efectivo", () => {
    fc.assert(
      fc.property(
        nonNegativeInt, // cashAmount
        nonNegativeInt, // extra (transfer part, i.e. totalAmount - cashAmount)
        (cash, extra) => {
          const totalAmount = cash + extra;
          const result = computeContribution({
            paymentType: "mixto",
            totalAmount,
            cashAmount: cash,
          });
          // transfer must be exactly extra (totalAmount - cashAmount),
          // cash contribution must be exactly cash, and their sum must equal totalAmount.
          return (
            result.transfer === extra &&
            result.cash === cash &&
            result.transfer + result.cash === totalAmount &&
            result.countsAsTransfer === true
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: report-payment-method-summary, Property 2: Transferencia aporta su totalAmount completo al transferTotal
  // Validates: Requirements 1.4
  it("Property 2: Transferencia aporta su totalAmount completo al transferTotal", () => {
    fc.assert(
      fc.property(
        nonNegativeInt,
        (totalAmount) => {
          const result = computeContribution({
            paymentType: "transferencia",
            totalAmount,
          });
          return (
            result.transfer === totalAmount &&
            result.cash === 0 &&
            result.countsAsTransfer === true
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: report-payment-method-summary, Property 3: Efectivo aporta su totalAmount completo al cashTotal
  // Validates: Requirements 1.5
  it("Property 3: Efectivo aporta su totalAmount completo al cashTotal", () => {
    fc.assert(
      fc.property(
        nonNegativeInt,
        (totalAmount) => {
          const result = computeContribution({
            paymentType: "efectivo",
            totalAmount,
          });
          return (
            result.cash === totalAmount &&
            result.transfer === 0 &&
            result.countsAsTransfer === false
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: report-payment-method-summary, Property 4: Tipos inválidos o null aportan cero a todos los totales
  // Validates: Requirements 1.7
  it("Property 4: Tipos inválidos o null aportan cero a todos los totales", () => {
    const validTypes = new Set(["efectivo", "transferencia", "mixto"]);

    // Test with null explicitly
    const nullResult = computeContribution({ paymentType: null, totalAmount: 100 });
    expect(nullResult.transfer).toBe(0);
    expect(nullResult.cash).toBe(0);
    expect(nullResult.countsAsTransfer).toBe(false);

    // Test with arbitrary non-valid strings
    fc.assert(
      fc.property(
        fc.string().filter((s) => !validTypes.has(s)),
        nonNegativeInt,
        (invalidType, totalAmount) => {
          const result = computeContribution({
            paymentType: invalidType,
            totalAmount,
          });
          return (
            result.transfer === 0 &&
            result.cash === 0 &&
            result.countsAsTransfer === false
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
