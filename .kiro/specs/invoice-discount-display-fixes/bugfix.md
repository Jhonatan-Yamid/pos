# Bugfix Requirements Document

## Introduction

Este documento cubre dos bugs de visualización en el POS:

1. **Bug 1 — Proveedor en adjuntar factura (perfil empleado):** El desplegable de selección de proveedor en la página de registro de facturas muestra el nombre del proveedor (`name`) en lugar de su descripción (`description`). Si el proveedor no tiene descripción, debe mostrarse el texto "sin descripción".

2. **Bug 2 — Porcentaje de descuento en comanda:** El campo de porcentaje de descuento y el resumen de "Total con descuento" en la tabla de ventas (comanda) son visibles para todos los perfiles de usuario. Solo el perfil administrador debe poder ver y usar ese campo.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN un usuario con perfil empleado accede a la página de adjuntar factura y abre el desplegable de proveedores THEN el sistema muestra el campo `name` (nombre) del proveedor como texto de cada opción

1.2 WHEN el proveedor tiene una descripción definida THEN el sistema igualmente muestra el `name` en lugar de la descripción

1.3 WHEN el proveedor no tiene descripción THEN el sistema muestra el `name` en lugar de un texto alternativo

1.4 WHEN un usuario con cualquier perfil distinto al administrador accede a la tabla de ventas y selecciona una venta "en mesa" para marcarla como pagada THEN el sistema muestra el campo de entrada "% Descuento" a todos los perfiles

1.5 WHEN un usuario con perfil no administrador visualiza el resumen de pago de una venta "en mesa" THEN el sistema muestra el resumen "Total con descuento (X%)" independientemente del rol del usuario

### Expected Behavior (Correct)

2.1 WHEN un usuario con perfil empleado accede a la página de adjuntar factura y abre el desplegable de proveedores THEN el sistema SHALL mostrar el campo `description` del proveedor como texto de cada opción

2.2 WHEN el proveedor tiene una descripción definida THEN el sistema SHALL mostrar esa descripción como texto de la opción en el desplegable

2.3 WHEN el proveedor no tiene descripción THEN el sistema SHALL mostrar el texto "sin descripción" como texto de la opción en el desplegable

2.4 WHEN un usuario con perfil administrador accede a la tabla de ventas y selecciona una venta "en mesa" para marcarla como pagada THEN el sistema SHALL mostrar el campo de entrada "% Descuento" y el resumen "Total con descuento"

2.5 WHEN un usuario con perfil distinto al administrador accede a la tabla de ventas y selecciona una venta "en mesa" para marcarla como pagada THEN el sistema SHALL ocultar el campo de entrada "% Descuento" y el resumen "Total con descuento"

### Unchanged Behavior (Regression Prevention)

3.1 WHEN un usuario con perfil empleado selecciona un proveedor en el desplegable THEN el sistema SHALL CONTINUE TO registrar la factura asociada al `id` del proveedor seleccionado

3.2 WHEN el endpoint `/api/providers?minimal=1` es llamado THEN el sistema SHALL CONTINUE TO omitir campos sensibles como `accountNumber` en la respuesta

3.3 WHEN un usuario con perfil administrador accede a la gestión completa de proveedores THEN el sistema SHALL CONTINUE TO mostrar el nombre y demás datos del proveedor sin cambios

3.4 WHEN un administrador aplica un porcentaje de descuento y confirma el pago THEN el sistema SHALL CONTINUE TO calcular el total final con el descuento aplicado y guardarlo correctamente

3.5 WHEN un usuario con perfil no administrador confirma el pago de una venta THEN el sistema SHALL CONTINUE TO procesar el pago sin descuento, con el total subtotal sin modificaciones

3.6 WHEN cualquier usuario selecciona el tipo de pago (efectivo, transferencia, mixto) THEN el sistema SHALL CONTINUE TO mostrar y procesar ese campo sin cambios independientemente del rol
