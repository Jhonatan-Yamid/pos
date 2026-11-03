# Requirements Document

## Introduction

El POS ya almacena el tipo de pago de cada venta (`paymentType`: `"efectivo"`, `"transferencia"`, `"mixto"`) y el monto en efectivo (`cashAmount`). Sin embargo, la modal de detalle diario en la página de Reportes solo muestra la división por porcentajes del total, sin desglose por método de pago.

Esta feature agrega, en esa modal, un resumen de métodos de pago antes de la sección de porcentajes: cantidad de transferencias realizadas, total en dinero de transferencias y total en efectivo recibido.

Esto requiere:
1. Extender el endpoint `/api/[slug]/sale/daily` (o crear uno derivado) para que incluya los datos de pago agrupados por día.
2. Mostrar el resumen de pagos en la modal de la página `salesDaily`.

## Glossary

- **Daily_API**: El endpoint `GET /api/[slug]/sale/daily` que devuelve el resumen de ventas por día operativo.
- **Daily_Detail_API**: El endpoint `GET /api/[slug]/sale/daily/[date]` que devuelve el detalle de ventas de un día operativo específico, incluyendo métodos de pago.
- **Modal**: El componente `<Modal>` de la página `salesDaily` que se abre al hacer click en una fila del detalle diario.
- **Payment_Summary**: La sección nueva dentro de la Modal que muestra el resumen de métodos de pago.
- **Transfer_Count**: Número de transacciones cuyo `paymentType` es `"transferencia"` o `"mixto"`.
- **Transfer_Total**: Suma del monto de transferencia de cada venta del día. Para `paymentType = "transferencia"` es `totalAmount`; para `"mixto"` es `totalAmount - cashAmount`.
- **Cash_Total**: Suma del dinero en efectivo del día. Para `paymentType = "efectivo"` es `totalAmount`; para `"mixto"` es `cashAmount`. Las ventas con `paymentType = "transferencia"` aportan `0` al efectivo.
- **Operational_Day**: El día operativo, que comienza a las 06:00 hora Colombia (UTC-5) y puede contener ventas con hora entre 06:00 del día actual y 05:59 del día siguiente (ventas entre medianoche y 05:59 pertenecen al día anterior).

## Requirements

### Requirement 1: Endpoint de detalle diario con métodos de pago

**User Story:** As an administrator, I want to query the payment breakdown of a specific operational day via API, so that the front end can display it without making multiple requests.

#### Acceptance Criteria

1. WHEN a `GET` request is made to `/api/[slug]/sale/daily/[date]` with a valid date string in `YYYY-MM-DD` format, THE Daily_Detail_API SHALL return a JSON object containing `transferCount`, `transferTotal`, and `cashTotal` for that operational day.
2. WHEN the requested date has no sales, THE Daily_Detail_API SHALL return a JSON object with `transferCount: 0`, `transferTotal: 0`, and `cashTotal: 0`.
3. WHEN calculating Transfer_Total for a sale with `paymentType = "mixto"`, THE Daily_Detail_API SHALL compute it as `totalAmount - cashAmount`.
4. WHEN calculating Transfer_Total for a sale with `paymentType = "transferencia"`, THE Daily_Detail_API SHALL use the full `totalAmount` as the transfer amount.
5. WHEN calculating Cash_Total for a sale with `paymentType = "efectivo"`, THE Daily_Detail_API SHALL use the full `totalAmount` as the cash amount.
6. WHEN calculating Cash_Total for a sale with `paymentType = "mixto"`, THE Daily_Detail_API SHALL use the `cashAmount` field value.
7. WHEN a sale has `paymentType = NULL` or an unrecognized value, THE Daily_Detail_API SHALL exclude it from Transfer_Total, Cash_Total, and Transfer_Count.
8. IF the `[date]` parameter does not match the `YYYY-MM-DD` format, THEN THE Daily_Detail_API SHALL return a `400` status with a descriptive error message.
9. IF the tenant is not found, THEN THE Daily_Detail_API SHALL return a `404` status with a descriptive error message.
10. THE Daily_Detail_API SHALL apply the same Operational_Day timezone logic (UTC-5, ventas entre medianoche y 05:59 pertenecen al día anterior) used by the existing Daily_API.

### Requirement 2: Resumen de métodos de pago en la Modal

**User Story:** As an administrator, I want to see a payment method summary inside the daily detail modal, so that I can quickly understand how much was received in cash versus transfers on a given day.

#### Acceptance Criteria

1. WHEN the user clicks a row in the daily detail table, THE Modal SHALL display a Payment_Summary section before the percentage breakdown section.
2. WHEN the Modal opens for a selected day, THE Modal SHALL fetch the payment data from the Daily_Detail_API for that day's date.
3. WHILE the payment data is being fetched, THE Modal SHALL display a loading indicator inside the Payment_Summary section.
4. WHEN the payment data is successfully loaded, THE Modal SHALL display Transfer_Count formatted as a whole number and Transfer_Total formatted as Colombian peso currency.
5. WHEN the payment data is successfully loaded, THE Modal SHALL display Cash_Total formatted as Colombian peso currency.
6. WHEN Transfer_Count is zero, THE Modal SHALL display `0 transferencias` and `$0` for the transfer total.
7. IF the Daily_Detail_API returns an error, THEN THE Modal SHALL display an error message inside the Payment_Summary section without blocking the percentage breakdown section.
8. THE Modal SHALL use the same `formatCurrency` utility already present in the `salesDaily` page for all monetary values in the Payment_Summary section.
