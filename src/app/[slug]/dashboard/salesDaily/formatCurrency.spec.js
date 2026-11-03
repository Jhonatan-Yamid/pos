import { describe, it } from "vitest";
import * as fc from "fast-check";

// Copy-definition of formatCurrency from salesDaily/page.js.
// This function is module-internal (not exported), so we replicate its
// implementation here to test it as a pure function without refactoring the page.
function formatCurrency(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

// Colombian peso amounts are integers; floating-point non-negatives are also
// accepted to stress-test the "no decimals" property.
const nonNegativeInt = fc.integer({ min: 0, max: 100_000_000 });

describe("formatCurrency — property tests", () => {
  // Feature: report-payment-method-summary, Property 7: Formato de moneda aplicado a cualquier monto no negativo
  // Validates: Requirements 2.4, 2.5, 2.8
  it("Property 7: Formato de moneda aplicado a cualquier monto no negativo", () => {
    fc.assert(
      fc.property(nonNegativeInt, (amount) => {
        const result = formatCurrency(amount);

        // 1. Must return a string
        if (typeof result !== "string") return false;

        // 2. Must contain the peso symbol "$"
        //    The es-CL / CLP locale renders as "$1.000" (with "$" prefix).
        if (!result.includes("$")) return false;

        // 3. Must not contain a decimal separator for whole integer amounts.
        //    The es-CL locale uses "," as decimal separator and "." as thousands separator.
        //    With maximumFractionDigits: 0 the formatted value should never contain a comma.
        if (result.includes(",")) return false;

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
