# Invoice Discount Display Fixes — Bugfix Design

## Overview

Este documento cubre dos bugs de visualización en el POS que afectan a usuarios con roles distintos al administrador:

**Bug 1 — Selector de proveedor (perfil empleado):** El desplegable de selección de proveedor en `/dashboard/provider-invoice` muestra el campo `name` en lugar de `description`. El fix requiere dos cambios coordinados: que el endpoint `/api/providers?minimal=1` incluya `description` en la proyección, y que el componente renderice `description` (o "sin descripción" como fallback) en lugar de `name`.

**Bug 2 — Campo de descuento visible para no-administradores:** El campo "% Descuento" y el resumen "Total con descuento" en el modal de pago de `/dashboard/saleTable` son visibles para todos los roles. El fix consiste en envolver ambos bloques JSX con una guarda de rol usando `getRole(session) === ROLE_ADMIN`.

Ambos fixes son de alcance mínimo: no alteran lógica de negocio, flujos de pago, ni APIs más allá de lo estrictamente necesario para corregir el comportamiento visible.

---

## Glossary

- **Bug_Condition (C)**: La condición que activa el bug — los inputs o contextos de ejecución en los que el sistema produce comportamiento incorrecto.
- **Property (P)**: El comportamiento correcto esperado cuando se cumple la condición de bug.
- **Preservation**: Comportamientos existentes que no deben cambiar como consecuencia del fix.
- **`minimal=1`**: Query param del endpoint `GET /api/providers` que limita la proyección a campos no sensibles para roles distintos al administrador.
- **`description`**: Campo nullable (`String?`) del modelo `Provider` en Prisma. Representa una descripción textual del proveedor, distinta a su nombre comercial.
- **`discountPercentInput`**: Estado React en `saleTable/page.js` que almacena el porcentaje de descuento ingresado. Se inicializa en `"0"` y permanece en `"0"` para no-admins con el fix aplicado, por lo que el cálculo del total final no se ve afectado.
- **`getRole(session) === ROLE_ADMIN`**: Guarda de rol ya disponible en `saleTable/page.js` (se usa en otros puntos del mismo archivo) que devuelve `true` solo cuando el usuario autenticado tiene rol de administrador.
- **`isBugCondition(input)`**: Función pseudocódigo que identifica si un input dado está en el dominio de entradas afectadas por el bug.

---

## Bug Details

### Bug 1 — Selector de proveedor muestra `name` en lugar de `description`

El bug se manifiesta cuando un usuario con perfil empleado accede a `/dashboard/provider-invoice` y abre el desplegable de selección de proveedor. El sistema renderiza `p.name` en lugar de `p.description`, independientemente de si la descripción existe o no.

Hay dos causas coordinadas:
1. El endpoint `GET /api/providers?minimal=1` proyecta `{ id: true, name: true }` — no incluye `description`, por lo que el cliente nunca recibe ese campo.
2. El componente renderiza `{p.name}` de forma incondicional, sin leer `description`.

**Formal Specification:**

```
FUNCTION isBugCondition_Bug1(input)
  INPUT: input de tipo { id: Int, name: String, description: String? }
         (objeto proveedor en el desplegable del perfil empleado)
  OUTPUT: boolean

  RETURN textoMostrado(input) === input.name
         AND textoMostrado(input) !== (input.description ?? "sin descripción")
END FUNCTION
```

### Ejemplos Bug 1

- Proveedor `{ id: 1, name: "Distribuidora XYZ", description: "Carnes y embutidos" }` → se muestra "Distribuidora XYZ" (incorrecto); debe mostrarse "Carnes y embutidos".
- Proveedor `{ id: 2, name: "Lácteos del Valle", description: null }` → se muestra "Lácteos del Valle" (incorrecto); debe mostrarse "sin descripción".
- Proveedor `{ id: 3, name: "Frutas Colombia", description: "" }` → se muestra "Frutas Colombia" (incorrecto); debe mostrarse "sin descripción" (descripción vacía equivale a ausente).
- Al seleccionar cualquier proveedor, el `value` del `<option>` es `p.id` — esto no cambia con el fix.

---

### Bug 2 — Campo de descuento visible para todos los roles

El bug se manifiesta cuando un usuario con cualquier rol accede al modal de pago de una venta "en mesa". El bloque `{isAboutToBePaid && (...)}` no filtra por rol, por lo que tanto el campo "% Descuento" como el resumen "Total con descuento (X%)" son visibles para roles distintos al administrador.

**Formal Specification:**

```
FUNCTION isBugCondition_Bug2(input)
  INPUT: input de tipo { isAboutToBePaid: boolean, userRole: Int }
  OUTPUT: boolean

  RETURN input.isAboutToBePaid === true
         AND input.userRole !== ROLE_ADMIN
         AND campoDescuentoVisible() === true
END FUNCTION
```

### Ejemplos Bug 2

- Usuario con rol empleado abre el modal de pago de una venta "en mesa" → ve el campo "% Descuento" (incorrecto); no debe verlo.
- Usuario con rol empleado con `discountPercentInput = "0"` confirma pago → el total calculado es correcto (0% de descuento), pero el campo no debería haber sido visible.
- Usuario con rol administrador abre el modal de pago → ve el campo "% Descuento" y el resumen (correcto, comportamiento sin cambios).
- Usuario con rol empleado confirma pago → el pago se procesa normalmente sin descuento; el fix solo oculta la UI, no modifica la lógica de cálculo.

---

## Expected Behavior

### Preservation Requirements

**Comportamientos que NO deben cambiar:**

- Al seleccionar un proveedor en el desplegable, el `value` enviado al formulario sigue siendo `p.id` — la factura se registra correctamente asociada al proveedor correcto.
- El endpoint `GET /api/providers?minimal=1` continúa omitiendo `accountNumber` y otros campos sensibles. Agregar `description` no expone datos restringidos.
- La gestión completa de proveedores (`/dashboard/providers`, solo rol administrador) no se modifica — sigue mostrando `name` y todos los demás campos sin cambios.
- Para el rol administrador, el campo "% Descuento" y el resumen "Total con descuento" continúan visibles y funcionando exactamente igual.
- El cálculo de `finalTotal` y `discountPct` no cambia para ningún rol: cuando `discountPercentInput` es `"0"`, `finalTotal === subtotal` independientemente de si el campo es visible.
- El tipo de pago (efectivo, transferencia, mixto) y la calculadora de vuelto siguen visibles y operativos para todos los roles sin cambios.
- El flujo completo de confirmación de pago (`handleConfirmPayment`) no se modifica.

**Scope:**
Todas las interacciones que NO involucran (a) la carga del desplegable de proveedores en el perfil empleado, o (b) la visibilidad del campo de descuento para no-admins, quedan completamente inalteradas por estos fixes.

---

## Hypothesized Root Cause

### Bug 1

1. **Proyección incompleta en el endpoint**: `db.provider.findMany({ select: { id: true, name: true } })` no incluye `description`. El campo no llega al cliente, por lo que incluso si el componente intentara leer `p.description`, obtendría `undefined`.

2. **Renderizado incondicional de `name` en el componente**: `<option key={p.id} value={p.id}>{p.name}</option>` usa `name` de forma explícita, sin considerar `description`.

3. **Ausencia de fallback para descripción nula**: El campo `description` es nullable en el schema de Prisma. Aunque se incluya en la proyección, el componente necesita manejar el caso `null`/`undefined`/`""`.

### Bug 2

1. **Ausencia de guarda de rol en el bloque JSX**: El bloque `{isAboutToBePaid && (...)}` que contiene el campo "% Descuento" y el resumen "Total con descuento" no tiene condición de rol. La guarda `getRole(session) === ROLE_ADMIN` ya se usa en el mismo archivo (ej: para el botón de eliminar venta y para mostrar el total del día), pero no fue aplicada a estos dos elementos.

2. **El campo y el resumen no están isolados en su propio componente**: Están mezclados dentro de un bloque `<div>` con otros controles (tipo de pago, monto en efectivo) que sí deben ser visibles para todos los roles, lo que hace necesario envolver solo los sub-bloques específicos.

---

## Correctness Properties

Property 1: Bug Condition — Selector de proveedor muestra descripción

_For any_ objeto proveedor retornado por `GET /api/providers?minimal=1` donde la condición de bug Bug 1 se cumple (el texto mostrado en el `<option>` es `name` en lugar de `description`), el componente corregido SHALL mostrar `p.description` cuando ésta sea un string no vacío, y SHALL mostrar `"sin descripción"` cuando `p.description` sea `null`, `undefined` o `""`.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Bug Condition — Campo de descuento oculto para no-admins

_For any_ sesión de usuario donde `getRole(session) !== ROLE_ADMIN` y `isAboutToBePaid === true`, el componente corregido SHALL ocultar el campo de entrada "% Descuento" y el resumen "Total con descuento (X%)", de forma que nunca sean renderizados en el DOM para roles distintos al administrador.

**Validates: Requirements 2.4, 2.5**

Property 3: Preservation — Registro de factura no afectado

_For any_ selección de proveedor en el desplegable del perfil empleado donde la condición de bug Bug 1 NO se cumple (fix aplicado correctamente), el componente corregido SHALL enviar el mismo `providerId` (`p.id`) al endpoint `/api/provider-movements` que el componente original, preservando el registro correcto de la factura.

**Validates: Requirements 3.1, 3.2**

Property 4: Preservation — Flujo de pago no afectado para admins ni no-admins

_For any_ sesión de usuario con cualquier rol donde `isAboutToBePaid === true`, el componente corregido SHALL calcular `finalTotal` y `discountPct` de forma idéntica al componente original (dado que `discountPercentInput` permanece en `"0"` para no-admins), y SHALL procesar el pago con `handleConfirmPayment` sin modificaciones.

**Validates: Requirements 3.4, 3.5, 3.6**

---

## Fix Implementation

### Bug 1 — Cambios requeridos

**Archivo 1:** `src/app/api/providers/route.js`

**Función/bloque:** Handler `GET` — rama `minimal=1`

**Cambio específico:**
```js
// Antes
const providers = await db.provider.findMany({
  select: { id: true, name: true },
  orderBy: { name: "asc" },
});

// Después
const providers = await db.provider.findMany({
  select: { id: true, name: true, description: true },
  orderBy: { name: "asc" },
});
```

**Archivo 2:** `src/app/dashboard/provider-invoice/page.jsx`

**Bloque:** Renderizado de `<option>` en el `<Select>` de proveedores

**Cambio específico:**
```jsx
// Antes
{providers.map((p) => (
  <option key={p.id} value={p.id}>
    {p.name}
  </option>
))}

// Después
{providers.map((p) => (
  <option key={p.id} value={p.id}>
    {p.description ? p.description : "sin descripción"}
  </option>
))}
```

> El `value={p.id}` no cambia — el `providerId` enviado al registrar la factura sigue siendo correcto.

---

### Bug 2 — Cambios requeridos

**Archivo:** `src/app/dashboard/saleTable/page.js`

**Bloque 1 — Campo "% Descuento":** dentro del `<div className="flex flex-wrap gap-4 items-end">` que contiene los controles de pago, el sub-bloque del campo de descuento debe envolverse con la guarda de rol:

```jsx
// Antes
<div>
  <label className="block text-xs text-content-muted mb-1">% Descuento</label>
  <input
    type="number"
    min="0"
    max="100"
    value={discountPercentInput}
    onChange={(e) => setDiscountPercentInput(e.target.value)}
    className="bg-surface-hover border border-border text-content px-3 py-2 rounded-md w-24 text-right"
  />
</div>

// Después
{getRole(session) === ROLE_ADMIN && (
  <div>
    <label className="block text-xs text-content-muted mb-1">% Descuento</label>
    <input
      type="number"
      min="0"
      max="100"
      value={discountPercentInput}
      onChange={(e) => setDiscountPercentInput(e.target.value)}
      className="bg-surface-hover border border-border text-content px-3 py-2 rounded-md w-24 text-right"
    />
  </div>
)}
```

**Bloque 2 — Resumen "Total con descuento":** el `<p>` condicional que muestra el resumen:

```jsx
// Antes
{discountPct > 0 && (
  <p>
    Total con descuento ({discountPct}%):{" "}
    <span className="text-emerald-400 font-semibold">
      {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(finalTotal)}
    </span>
  </p>
)}

// Después
{getRole(session) === ROLE_ADMIN && discountPct > 0 && (
  <p>
    Total con descuento ({discountPct}%):{" "}
    <span className="text-emerald-400 font-semibold">
      {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(finalTotal)}
    </span>
  </p>
)}
```

> No se modifica `handleConfirmPayment`, `discountPct`, `finalTotal` ni ningún otro estado. El cálculo del total sigue siendo correcto para todos los roles.

---

## Testing Strategy

### Validation Approach

La estrategia sigue el enfoque en dos fases: primero confirmar que el bug existe en el código sin parchear (exploración), luego verificar que el fix lo corrige (fix checking) y que no rompe nada que funcionaba (preservation checking).

---

### Exploratory Bug Condition Checking

**Goal**: Demostrar el bug en el código sin fix. Confirmar o refutar el análisis de causa raíz.

**Test Plan**: Renderizar los componentes en su estado actual y verificar que el comportamiento defectuoso es observable.

**Test Cases:**

1. **Proyección del endpoint (Bug 1)**: Llamar `GET /api/providers?minimal=1` con el código sin fix y verificar que el objeto retornado NO contiene `description` — confirmará que la causa raíz del endpoint es correcta.
2. **Renderizado del selector (Bug 1)**: Renderizar `ProviderInvoicePage` con una lista de proveedores mockeada (`[{ id: 1, name: "ABC", description: "Desc A" }]`) y verificar que el texto visible del `<option>` es `"ABC"` (nombre) — fallará en código sin fix.
3. **Visibilidad del campo descuento (Bug 2)**: Renderizar `DailySales` con sesión de rol empleado y `isAboutToBePaid = true`, verificar que el campo "% Descuento" está presente en el DOM — será visible en código sin fix (comportamiento incorrecto).
4. **Visibilidad del resumen descuento (Bug 2)**: Con el mismo setup anterior y `discountPercentInput = "10"`, verificar que el texto "Total con descuento" aparece en el DOM — aparecerá en código sin fix.

**Expected Counterexamples:**
- El endpoint retorna `[{ id: 1, name: "ABC" }]` sin `description` → confirma causa raíz 1 del Bug 1.
- El `<option>` muestra el nombre en lugar de la descripción → confirma causa raíz 2 del Bug 1.
- El campo "% Descuento" es visible para el rol empleado → confirma causa raíz del Bug 2.

---

### Fix Checking

**Goal**: Verificar que para todos los inputs donde se cumple la condición de bug, el código corregido produce el comportamiento esperado.

**Pseudocode:**
```
FOR ALL proveedor WHERE isBugCondition_Bug1(proveedor) DO
  textoOpcion := renderOption(proveedor_fixed)
  ASSERT textoOpcion === (proveedor.description || "sin descripción")
END FOR

FOR ALL { isAboutToBePaid, userRole } WHERE isBugCondition_Bug2({ isAboutToBePaid, userRole }) DO
  dom := renderSaleTable_fixed({ isAboutToBePaid, userRole })
  ASSERT campoDescuento NOT IN dom
  ASSERT resumenDescuento NOT IN dom
END FOR
```

---

### Preservation Checking

**Goal**: Verificar que para todos los inputs donde la condición de bug NO se cumple, el código corregido produce el mismo resultado que el original.

**Pseudocode:**
```
FOR ALL proveedor WHERE NOT isBugCondition_Bug1(proveedor) DO
  -- value del <option> no cambia
  ASSERT valueOpcion_original(proveedor) === valueOpcion_fixed(proveedor)
END FOR

FOR ALL { isAboutToBePaid, userRole } WHERE NOT isBugCondition_Bug2(...) DO
  -- Admin sigue viendo el campo; non-admin en ventas no "en mesa" no afectado
  ASSERT render_original(...) === render_fixed(...)
END FOR
```

**Testing Approach**: Se recomienda property-based testing para la preservation del selector de proveedores, generando listas aleatorias de proveedores con combinaciones de `description` nula/no nula y verificando que el `value` del `<option>` siempre es `p.id`.

**Test Cases:**

1. **`value` del `<option>` no cambia (Bug 1)**: Generar proveedores con distintas combinaciones de `name`/`description` y verificar que el `value` del `<option>` es siempre `p.id`.
2. **Admin sigue viendo el campo descuento (Bug 2)**: Renderizar con sesión de administrador y verificar que el campo "% Descuento" es visible.
3. **Cálculo del total sin cambios para no-admin (Bug 2)**: Verificar que con `discountPercentInput = "0"`, `finalTotal === subtotal` independientemente del rol.
4. **Campos de pago visibles para todos los roles (Bug 2)**: Verificar que el selector de tipo de pago y la calculadora de vuelto siguen visibles para rol empleado.
5. **Registro de factura correcto (Bug 1)**: Verificar que al seleccionar un proveedor y enviar el formulario, el `providerId` en el payload es `p.id` (no afectado por el cambio de texto visible).

---

### Unit Tests

- Verificar que `GET /api/providers?minimal=1` incluye `description` en la respuesta tras el fix.
- Verificar que `<option>` muestra `description` cuando existe, y `"sin descripción"` cuando es `null`/`""`.
- Verificar que el campo "% Descuento" no se renderiza cuando `getRole(session) !== ROLE_ADMIN` y `isAboutToBePaid === true`.
- Verificar que el campo "% Descuento" sí se renderiza cuando `getRole(session) === ROLE_ADMIN` y `isAboutToBePaid === true`.
- Verificar que el resumen "Total con descuento" no se renderiza para no-admins aunque `discountPct > 0`.

### Property-Based Tests

- Generar arrays de proveedores con `description` aleatoria (string, null, "") y verificar que el texto del `<option>` siempre es `description || "sin descripción"` y el `value` siempre es `id`.
- Generar combinaciones de rol y estado de venta y verificar que el campo descuento solo es visible cuando `rol === ROLE_ADMIN && isAboutToBePaid`.
- Generar valores de `discountPercentInput` para rol no-admin y verificar que `finalTotal` siempre iguala `subtotal` (ya que el input no es accesible, permanece en "0").

### Integration Tests

- Flujo completo empleado: cargar `/dashboard/provider-invoice`, abrir desplegable, verificar que las opciones muestran `description` (o fallback), seleccionar uno, registrar factura, verificar que el `providerId` correcto fue enviado.
- Flujo completo no-admin pagando venta: abrir modal de pago de venta "en mesa" con rol empleado, verificar que el campo descuento no está presente, confirmar pago, verificar que el total es el subtotal sin descuento.
- Flujo completo admin pagando con descuento: confirmar que el campo descuento es visible, ingresar un porcentaje, confirmar pago, verificar que `totalAmount` guardado refleja el descuento correctamente.
