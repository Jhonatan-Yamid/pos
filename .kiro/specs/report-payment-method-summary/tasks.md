# Implementation Plan: Report Payment Method Summary

## Overview

Implementar el endpoint `GET /api/[slug]/sale/daily/[date]` y el componente `PaymentSummary` dentro de la modal de `salesDaily`. El backend calcula `transferCount`, `transferTotal` y `cashTotal` aplicando la lógica de día operativo UTC-5 existente. El frontend consume ese endpoint de forma independiente al renderizado de la sección de porcentajes.

## Tasks

- [x] 1. Crear la función pura de cálculo de contribuciones por `paymentType`
  - [x] 1.1 Crear `src/app/api/[slug]/sale/daily/[date]/paymentContribution.js` con la función `computeContribution({ paymentType, totalAmount, cashAmount })`
    - La función retorna `{ transfer, cash, countsAsTransfer }` para un registro individual
    - Cubrir los cuatro casos: `"transferencia"`, `"mixto"`, `"efectivo"`, y null/otro
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 1.2 Escribir property tests para `computeContribution`
    - **Property 1: Mixto split — transferencia es el complemento del efectivo**
    - **Validates: Requirements 1.3, 1.6**
    - **Property 2: Transferencia aporta su totalAmount completo al transferTotal**
    - **Validates: Requirements 1.4**
    - **Property 3: Efectivo aporta su totalAmount completo al cashTotal**
    - **Validates: Requirements 1.5**
    - **Property 4: Tipos inválidos o null aportan cero a todos los totales**
    - **Validates: Requirements 1.7**

- [x] 2. Crear la función pura de lógica del día operativo
  - [x] 2.1 Crear `src/app/api/[slug]/sale/daily/[date]/operationalDay.js` con las funciones `computeOperationalDay(date)` y `buildUtcRange(dateStr)`
    - `computeOperationalDay` recibe un `Date` en UTC y devuelve la fecha operativa Colombia como string `YYYY-MM-DD`
    - `buildUtcRange` recibe un string `YYYY-MM-DD` y devuelve `{ startUtc, endUtc }` correspondientes al día operativo completo (11:00:00 UTC del día → 10:59:59 UTC del día siguiente)
    - _Requirements: 1.10_

  - [x] 2.2 Escribir property test para la lógica del día operativo
    - **Property 6: Lógica del día operativo — hora < 6 pertenece al día anterior**
    - **Validates: Requirements 1.10**

- [x] 3. Crear el route handler `GET /api/[slug]/sale/daily/[date]/route.js`
  - [x] 3.1 Implementar el handler usando `resolveTenantConfig`, `getTenantDb`, validación con regex `/^\d{4}-\d{2}-\d{2}$/`, query raw con `$queryRaw` y llamadas a `computeContribution`
    - Respuesta 200: `{ transferCount, transferTotal, cashTotal }`
    - Respuesta 400 si `date` no coincide con el patrón
    - Respuesta 404 si el tenant no existe
    - Respuesta 500 en error de DB; siempre llama `db.$disconnect()` en `finally`
    - _Requirements: 1.1, 1.2, 1.8, 1.9_

  - [x] 3.2 Escribir property test para la validación del formato de fecha
    - **Property 5: Cualquier string que no sea YYYY-MM-DD recibe respuesta 400**
    - **Validates: Requirements 1.8**

  - [x] 3.3 Escribir tests unitarios para el route handler
    - Caso: date válida con ventas → 200 con las tres claves
    - Caso: date válida sin ventas → `{ transferCount: 0, transferTotal: 0, cashTotal: 0 }`
    - Caso: date inválida → 400
    - Caso: tenant no encontrado → 404
    - Caso: error de DB → 500
    - _Requirements: 1.1, 1.2, 1.8, 1.9_

- [x] 4. Checkpoint — verificar backend
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implementar el componente `PaymentSummary` en `salesDaily/page.js`
  - [x] 5.1 Crear la función `PaymentSummary({ date, slug })` dentro de `src/app/[slug]/dashboard/salesDaily/page.js`
    - Gestiona su propio estado `loading` / `data` / `error` con `useState` y `useEffect`
    - En estado `loading` muestra el texto "Cargando pagos..." dentro de la sección
    - En estado `error` muestra "No se pudo cargar el resumen de pagos." sin afectar la sección de porcentajes
    - En estado `data` muestra `transferCount` como número entero, `transferTotal` y `cashTotal` formateados con `formatCurrency`
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 5.2 Escribir property test para `formatCurrency`
    - **Property 7: Formato de moneda aplicado a cualquier monto no negativo**
    - **Validates: Requirements 2.4, 2.5, 2.8**

- [x] 6. Integrar `PaymentSummary` en la Modal de `salesDaily/page.js`
  - [x] 6.1 Modificar el bloque `{showModal && selectedDay && ...}` para renderizar `<PaymentSummary date={selectedDay.date} slug={slug} />` antes de la sección de porcentajes existente
    - El componente debe aparecer entre el encabezado de la modal (fecha + total) y el `{(() => { const pockets = ... })()}`
    - _Requirements: 2.1_

- [x] 7. Checkpoint final — asegurar integración completa
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Las funciones puras (`computeContribution`, `buildUtcRange`) se extraen en archivos separados para facilitar las pruebas sin necesidad de mockear la DB
- Los property tests usan **fast-check** ya instalado; los unit tests usan **Vitest**
- El componente `PaymentSummary` hace su propio `fetch` para que la sección de porcentajes no quede bloqueada
- Todos los valores monetarios usan la función `formatCurrency` ya presente en el archivo

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "5.1"] },
    { "id": 3, "tasks": ["5.2", "6.1"] }
  ]
}
```
