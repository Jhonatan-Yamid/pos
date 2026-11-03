/**
 * Computes the transfer and cash contribution for a single sale record.
 *
 * @param {object} params
 * @param {string|null} params.paymentType - "transferencia", "mixto", "efectivo", or null/other
 * @param {number} params.totalAmount      - Total sale amount
 * @param {number} [params.cashAmount=0]   - Cash portion (relevant for "mixto")
 * @returns {{ transfer: number, cash: number, countsAsTransfer: boolean }}
 */
export function computeContribution({ paymentType, totalAmount, cashAmount = 0 }) {
  switch (paymentType) {
    case "transferencia":
      return { transfer: totalAmount, cash: 0, countsAsTransfer: true };

    case "mixto":
      return {
        transfer: totalAmount - cashAmount,
        cash: cashAmount,
        countsAsTransfer: true,
      };

    case "efectivo":
      return { transfer: 0, cash: totalAmount, countsAsTransfer: false };

    default:
      // null or any unrecognized value — contributes nothing
      return { transfer: 0, cash: 0, countsAsTransfer: false };
  }
}
