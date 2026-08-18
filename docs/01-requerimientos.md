# Análisis de requerimientos

## Sistema web de control de inventario y facturación para una licorería

**Versión:** 1.1  
**Estado:** Documento formal de análisis de requerimientos  
**Ámbito:** Una sola sucursal

## 1. Introducción

Este documento define los requerimientos del “Sistema web de control de inventario y facturación para una licorería”. Su propósito es establecer una base formal, clara y comprobable para el diseño, desarrollo, pruebas y aceptación del sistema. La solución centralizará las operaciones de una única sucursal y permitirá administrar bebidas y productos complementarios autorizados, como gaseosas, agua, hielo, snacks y otros productos aprobados por la administración. Los requerimientos aquí descritos constituyen la referencia funcional y de calidad para delimitar el producto y verificar su cumplimiento.

## 2. Descripción del problema

La gestión manual o dispersa de productos, compras, ventas, inventario y caja incrementa el riesgo de errores de cálculo, pérdida de información, diferencias de existencias y escasa trazabilidad. También dificulta conocer oportunamente las ventas, compras, productos con inventario bajo, resultados de caja y acciones realizadas por los usuarios. Se requiere una solución que integre estos procesos, aplique controles de acceso y preserve el historial operativo para apoyar la administración y la toma de decisiones.

## 3. Objetivo general

Desarrollar una aplicación web segura, modular y auditable que permita controlar el inventario, las compras, las ventas, la facturación, la caja y las operaciones administrativas de una licorería con una sola sucursal.

## 4. Objetivos específicos

1. Centralizar la administración de productos, categorías, marcas, unidades de medida, clientes y proveedores.
2. Registrar compras y ventas con cálculos realizados y validados en el backend.
3. Mantener existencias confiables sin permitir inventario negativo y conservar el historial de movimientos.
4. Controlar el acceso mediante autenticación, roles y permisos.
5. Gestionar aperturas, movimientos y cierres de caja.
6. Proporcionar facturas o comprobantes internos imprimibles.
7. Ofrecer indicadores, gráficos y reportes para apoyar la toma de decisiones.
8. Auditar acciones críticas y permitir respaldos y restauraciones controlados.

## 5. Alcance del sistema

El sistema cubrirá una sola sucursal e incluirá autenticación; usuarios, roles y permisos; categorías, marcas y unidades de medida; bebidas y productos complementarios autorizados; clientes y proveedores; compras; inventario; ventas; facturación interna; pagos en efectivo, tarjeta, transferencia o combinados; descuentos controlados mediante permisos; impuestos configurables; caja; dashboard con al menos tres gráficos; al menos ocho reportes; bitácora; respaldos, restauraciones y configuración general. Todas las funciones del frontend se comunicarán con el backend mediante una API REST con JSON.

## 6. Funcionalidades fuera del alcance

- Operación multisucursal y transferencias entre sucursales.
- Comercio electrónico, pedidos en línea y entregas a domicilio.
- Contabilidad general, nómina y gestión de recursos humanos.
- Integración aprobada con bancos, pasarelas de pago, autoridades tributarias o facturación electrónica fiscal.
- Programas de fidelización, créditos a clientes y cuentas por cobrar.
- Gestión de lotes, fechas de vencimiento, números de serie o producción.
- Aplicaciones móviles nativas.
- Almacenamiento de datos completos de tarjetas.
- Venta de productos no autorizados por la administración.

## 7. Actores del sistema

- **Administrador:** administra la configuración, seguridad, catálogos y operaciones autorizadas; supervisa información y procesos críticos.
- **Vendedor:** realiza las operaciones comerciales y de caja permitidas por sus permisos.
- **Consulta:** accede en modo de lectura a la información y los reportes autorizados.
- **Sistema:** ejecuta validaciones, cálculos, transacciones, actualizaciones de inventario, generación de documentos y registros automáticos.

## 8. Descripción de los roles

### Administrador

Dispone de acceso administrativo según los permisos asignados. Puede gestionar usuarios, roles, catálogos, configuración, compras, ajustes, anulaciones, reportes, bitácora, respaldos y restauraciones. Las acciones críticas requieren autorización explícita.

### Vendedor

Puede iniciar sesión, consultar productos y clientes, operar el punto de venta, registrar pagos, imprimir comprobantes y gestionar su caja. Los descuentos, anulaciones u otras acciones sensibles solo estarán disponibles si posee el permiso correspondiente.

### Consulta

Puede visualizar la información operativa, dashboard y reportes para los que tenga permiso. No puede crear, modificar, confirmar, anular ni eliminar registros.

## 9. Requerimientos funcionales

### 9.1 Autenticación

### RF-001 — Inicio de sesión

**Descripción:** El sistema permitirá que un usuario activo se autentique mediante sus credenciales y reciba una sesión basada en JWT con tiempo de expiración.

**Actor principal:** Administrador, Vendedor o Consulta.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Con credenciales válidas se concede acceso y con credenciales inválidas se rechaza sin revelar información sensible.

### RF-002 — Cierre de sesión

**Descripción:** El sistema permitirá cerrar la sesión activa y el frontend eliminará la información local utilizada para autenticar solicitudes.

**Actor principal:** Administrador, Vendedor o Consulta.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Después de cerrar sesión, las vistas y solicitudes protegidas requieren una nueva autenticación.

### RF-003 — Control de intentos fallidos

**Descripción:** El sistema limitará los intentos fallidos de inicio de sesión y aplicará un bloqueo temporal conforme a la configuración de seguridad.

**Actor principal:** Sistema.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Al superar el límite configurado, nuevos intentos son rechazados durante el período de bloqueo y el evento queda auditado.

### 9.2 Usuarios

### RF-004 — Gestión de usuarios

**Descripción:** El sistema permitirá al Administrador crear, consultar y modificar usuarios con los datos requeridos, sin exponer sus contraseñas.

**Actor principal:** Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Un usuario válido puede registrarse y actualizarse, y los datos inválidos o identificadores duplicados son rechazados.

### RF-005 — Desactivación de usuarios

**Descripción:** El sistema permitirá desactivar y reactivar usuarios sin eliminar su historial.

**Actor principal:** Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Un usuario desactivado no puede iniciar sesión y sus operaciones históricas permanecen consultables.

### RF-006 — Asignación de rol a usuarios

**Descripción:** El sistema permitirá asignar a cada usuario uno de los roles aprobados: Administrador, Vendedor o Consulta.

**Actor principal:** Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** El cambio de rol modifica los accesos del usuario en su siguiente sesión sin alterar su historial.

### 9.3 Roles y permisos

### RF-007 — Consulta de roles y permisos

**Descripción:** El sistema permitirá consultar los roles aprobados y los permisos asociados a cada uno.

**Actor principal:** Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Se muestran los tres roles y su conjunto vigente de permisos.

### RF-008 — Configuración de permisos por rol

**Descripción:** El sistema permitirá al Administrador asignar o retirar permisos a los roles, conservando la existencia de los tres roles aprobados.

**Actor principal:** Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Un permiso modificado se aplica de forma consistente a los endpoints y a la interfaz correspondiente.

### RF-009 — Autorización de operaciones

**Descripción:** El backend verificará el permiso requerido antes de ejecutar cada operación protegida, incluidas las de descuento, ajuste, anulación, respaldo y restauración.

**Actor principal:** Sistema.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Una solicitud autenticada sin el permiso requerido es rechazada y no modifica datos.

### 9.4 Categorías

### RF-010 — Gestión de categorías

**Descripción:** El sistema permitirá listar, crear y modificar categorías de productos, validando que su nombre sea único.

**Actor principal:** Administrador.

**Prioridad:** Media.

**Criterio básico de aceptación:** Se guardan categorías válidas y se rechazan nombres duplicados.

### RF-011 — Desactivación de categorías

**Descripción:** El sistema permitirá desactivar y reactivar categorías sin eliminar las relaciones históricas.

**Actor principal:** Administrador.

**Prioridad:** Media.

**Criterio básico de aceptación:** Una categoría inactiva no se ofrece para nuevos productos y continúa visible en registros históricos.

### 9.5 Marcas

### RF-012 — Gestión de marcas

**Descripción:** El sistema permitirá listar, crear y modificar marcas utilizadas por los productos.

**Actor principal:** Administrador.

**Prioridad:** Media.

**Criterio básico de aceptación:** Una marca con datos válidos puede registrarse, consultarse y actualizarse.

### RF-013 — Desactivación de marcas

**Descripción:** El sistema permitirá desactivar y reactivar marcas sin afectar los registros históricos asociados.

**Actor principal:** Administrador.

**Prioridad:** Media.

**Criterio básico de aceptación:** Una marca inactiva no se ofrece en nuevos registros y conserva sus relaciones previas.

### 9.6 Unidades de medida

### RF-014 — Gestión de unidades de medida

**Descripción:** El sistema permitirá listar, crear y modificar unidades de medida aplicables a los productos.

**Actor principal:** Administrador.

**Prioridad:** Media.

**Criterio básico de aceptación:** Una unidad válida puede registrarse y editarse sin duplicar su identificación.

### RF-015 — Desactivación de unidades de medida

**Descripción:** El sistema permitirá desactivar y reactivar unidades de medida sin borrar su uso histórico.

**Actor principal:** Administrador.

**Prioridad:** Media.

**Criterio básico de aceptación:** Una unidad inactiva no puede asignarse a nuevos productos y permanece en consultas históricas.

### 9.7 Productos

### RF-016 — Gestión de productos

**Descripción:** El sistema permitirá listar, crear y modificar bebidas y productos complementarios autorizados, con categoría, marca, unidad, costo, precio, existencia mínima y estado. El costo promedio podrá establecerse inicialmente o corregirse administrativamente solo mientras la existencia sea cero; con existencia positiva no podrá alterarse desde el CRUD.

**Actor principal:** Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Los productos válidos se guardan y los costos, precios o existencias mínimas inválidos son rechazados. Omitir el costo promedio al editar conserva el valor vigente; las compras confirmadas constituyen su fuente normal de actualización operativa.

### RF-017 — Identificación y búsqueda de productos

**Descripción:** El sistema permitirá identificar y buscar productos por nombre, código interno o código de barras.

**Actor principal:** Administrador, Vendedor o Consulta.

**Prioridad:** Alta.

**Criterio básico de aceptación:** La búsqueda devuelve los productos coincidentes con los criterios autorizados.

### RF-018 — Filtrado y paginación de productos

**Descripción:** El sistema permitirá filtrar productos por categoría, marca y estado, y presentará resultados paginados.

**Actor principal:** Administrador, Vendedor o Consulta.

**Prioridad:** Media.

**Criterio básico de aceptación:** Los resultados respetan simultáneamente los filtros y la página solicitada.

### RF-019 — Desactivación de productos

**Descripción:** El sistema permitirá desactivar y reactivar productos sin eliminar su historial de compras, ventas o inventario.

**Actor principal:** Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Un producto inactivo no puede incluirse en nuevas compras o ventas, pero permanece en consultas históricas.

### 9.8 Clientes

### RF-020 — Gestión de clientes

**Descripción:** El sistema permitirá listar, crear, modificar, desactivar y reactivar clientes sin borrar su historial comercial.

**Actor principal:** Administrador o Vendedor con permiso.

**Prioridad:** Media.

**Criterio básico de aceptación:** Los datos válidos se guardan y un cliente inactivo no se selecciona para nuevas ventas.

### RF-021 — Cliente Consumidor final

**Descripción:** El sistema dispondrá de un cliente predeterminado denominado “Consumidor final” para ventas que no requieran identificar a otro cliente.

**Actor principal:** Vendedor.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Al iniciar una venta se puede seleccionar o usar “Consumidor final” sin crear un cliente nuevo.

### 9.9 Proveedores

### RF-022 — Gestión de proveedores

**Descripción:** El sistema permitirá listar, crear y modificar proveedores con sus datos de identificación y contacto.

**Actor principal:** Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Un proveedor válido puede registrarse, consultarse y actualizarse.

### RF-023 — Desactivación de proveedores

**Descripción:** El sistema permitirá desactivar y reactivar proveedores sin eliminar sus compras históricas.

**Actor principal:** Administrador.

**Prioridad:** Media.

**Criterio básico de aceptación:** Un proveedor inactivo no puede utilizarse en nuevas compras y sus compras anteriores permanecen disponibles.

### 9.10 Compras

### RF-024 — Registro de compra en borrador

**Descripción:** El sistema permitirá crear una compra en borrador, seleccionar un proveedor y agregar productos con cantidades y costos válidos.

**Actor principal:** Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** El borrador admite modificaciones antes de confirmarse y no altera el inventario.

### RF-025 — Cálculo de compra

**Descripción:** El backend calculará subtotal, descuento monetario concedido por el proveedor, impuesto configurable y total de la compra a partir de su detalle. El límite comercial de descuentos en ventas no aplica a compras.

**Actor principal:** Sistema.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Los totales almacenados y mostrados coinciden con el detalle y la configuración vigente al confirmar.

### RF-026 — Confirmación transaccional de compra

**Descripción:** El sistema confirmará la compra, aumentará existencias y registrará los movimientos de inventario en una única transacción.

**Actor principal:** Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Se aplican todos los cambios o ninguno ante un error, y la compra confirmada no se elimina físicamente. La recepción actualiza el costo promedio ponderado vigente del producto.

### RF-027 — Consulta de compras

**Descripción:** El sistema permitirá consultar el encabezado y detalle de compras y filtrarlas por rango de fechas, proveedor y estado.

**Actor principal:** Administrador o Consulta.

**Prioridad:** Media.

**Criterio básico de aceptación:** La consulta devuelve compras y detalles que cumplen los filtros indicados.

### RF-028 — Anulación controlada de compra

**Descripción:** El sistema permitirá anular una compra confirmada mediante permiso y motivo obligatorios, revirtiendo únicamente sus cantidades de inventario en una transacción cuando exista disponibilidad suficiente para hacerlo. La anulación no modificará automáticamente `productos.costo_promedio` ni los costos históricos de ventas posteriores.

**Actor principal:** Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** La anulación conserva la compra, registra el motivo, disminuye la existencia y crea el movimiento inverso sin modificar `productos.costo_promedio`; no produce inventario negativo ni cambios parciales. La existencia de movimientos posteriores no impide por sí sola la anulación si continúa disponible la cantidad requerida.

### 9.11 Inventario

### RF-029 — Consulta de existencias

**Descripción:** El sistema permitirá consultar las existencias actuales y la existencia mínima de cada producto.

**Actor principal:** Administrador, Vendedor o Consulta.

**Prioridad:** Alta.

**Criterio básico de aceptación:** La existencia mostrada coincide con los movimientos confirmados del producto.

### RF-030 — Historial de movimientos

**Descripción:** El sistema permitirá consultar movimientos de inventario con producto, tipo, cantidad, fecha, usuario y operación de origen.

**Actor principal:** Administrador o Consulta.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Cada cambio de existencia puede rastrearse hasta su operación y responsable.

### RF-031 — Ajustes de inventario

**Descripción:** El sistema permitirá registrar ajustes positivos o negativos con permiso y motivo obligatorios mediante una transacción.

**Actor principal:** Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** El ajuste actualiza la existencia y crea su movimiento, o revierte ambos cambios si ocurre un error.

### RF-032 — Prevención de inventario negativo

**Descripción:** El backend rechazará cualquier venta, anulación de compra, ajuste u otra operación que produzca una existencia inferior a cero.

**Actor principal:** Sistema.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Ninguna operación confirmada deja un producto con existencia negativa.

### RF-033 — Alerta de inventario bajo

**Descripción:** El sistema identificará los productos cuya existencia sea igual o inferior a su existencia mínima configurada.

**Actor principal:** Administrador, Vendedor o Consulta.

**Prioridad:** Media.

**Criterio básico de aceptación:** La lista incluye exclusivamente los productos activos que cumplen el umbral definido.

### 9.12 Ventas

### RF-034 — Preparación de venta

**Descripción:** El sistema permitirá crear una venta en preparación, seleccionar un cliente y agregar productos activos con las cantidades solicitadas.

**Actor principal:** Vendedor o Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Antes de confirmar, la venta puede modificarse y no reduce inventario.

### RF-035 — Validación de existencias

**Descripción:** El backend validará la existencia disponible de cada producto inmediatamente antes de confirmar una venta.

**Actor principal:** Sistema.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Una venta con cantidades superiores a las existencias es rechazada sin cambios parciales.

### RF-036 — Cálculo de venta

**Descripción:** El backend calculará precios, descuentos autorizados, impuestos configurables, subtotal y total definitivo de la venta. El descuento de línea es un importe monetario limitado por el porcentaje global máximo configurado para ventas.

**Actor principal:** Sistema.

**Prioridad:** Alta.

**Criterio básico de aceptación:** El total confirmado se obtiene en el backend y coincide con el detalle, los permisos y la configuración aplicable.

### RF-037 — Confirmación transaccional de venta

**Descripción:** El sistema registrará la venta, sus pagos, la reducción de inventario, los movimientos y el costo histórico en una única transacción.

**Actor principal:** Vendedor o Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** La operación aplica todos sus registros o ninguno y la venta confirmada no puede eliminarse físicamente.

### RF-038 — Consulta de ventas

**Descripción:** El sistema permitirá consultar ventas con su detalle y filtrarlas por rango de fechas, cliente, vendedor y estado.

**Actor principal:** Administrador, Vendedor o Consulta según permiso.

**Prioridad:** Media.

**Criterio básico de aceptación:** La consulta devuelve únicamente ventas autorizadas que cumplen los filtros.

### RF-039 — Anulación controlada de venta

**Descripción:** El sistema permitirá anular una venta confirmada con permiso y motivo obligatorios, restaurando inventario y registrando movimientos mediante una transacción.

**Actor principal:** Administrador o usuario con permiso.

**Prioridad:** Alta.

**Criterio básico de aceptación:** La venta conserva su historial con estado anulada y la reversión se completa íntegramente o no se aplica.

### 9.13 Facturación

### RF-040 — Numeración de comprobantes

**Descripción:** El sistema asignará a cada venta confirmada un número de factura o comprobante interno único y consecutivo según la configuración vigente.

**Actor principal:** Sistema.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Dos ventas confirmadas no comparten el mismo número y una anulación no reutiliza la numeración.

### RF-041 — Comprobante imprimible

**Descripción:** El sistema generará una vista imprimible de la factura o comprobante interno con datos del negocio, venta, cliente, detalle, impuestos, descuentos, pagos y totales.

**Actor principal:** Vendedor o Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Una venta confirmada puede visualizarse e imprimirse con información consistente con el registro almacenado.

### 9.14 Métodos de pago

### RF-042 — Registro de método de pago

**Descripción:** El sistema permitirá registrar pagos de ventas mediante efectivo, tarjeta o transferencia.

**Actor principal:** Vendedor o Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** El método y monto quedan asociados a la venta y el total pagado satisface las reglas de confirmación.

### RF-043 — Pagos combinados

**Descripción:** El sistema permitirá distribuir el pago de una venta entre dos o más métodos aprobados.

**Actor principal:** Vendedor o Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** La suma de los pagos aplicados cubre el total exigible y cada componente queda registrado.

### RF-044 — Cálculo de cambio

**Descripción:** El sistema calculará el cambio correspondiente cuando el monto recibido en efectivo exceda el importe pendiente de la venta.

**Actor principal:** Sistema.

**Prioridad:** Alta.

**Criterio básico de aceptación:** El cambio mostrado equivale al efectivo recibido menos el importe cubierto en efectivo.

### 9.15 Caja

### RF-045 — Apertura de caja

**Descripción:** El sistema permitirá abrir caja con un monto inicial y evitará que un mismo usuario mantenga dos cajas abiertas simultáneamente.

**Actor principal:** Vendedor o Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** La apertura válida queda registrada y una segunda apertura del mismo usuario es rechazada.

### RF-046 — Movimientos de caja

**Descripción:** El sistema registrará las ventas y permitirá registrar ingresos o egresos de caja autorizados con concepto y responsable.

**Actor principal:** Vendedor o Administrador según permiso.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Cada movimiento afecta el saldo esperado y conserva tipo, monto, fecha, concepto y usuario.

### RF-047 — Cierre de caja

**Descripción:** El sistema calculará el monto esperado, recibirá el monto contado, determinará la diferencia y cerrará la caja mediante una transacción.

**Actor principal:** Vendedor o Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** El cierre registra los montos esperado, contado y diferencia, y la caja deja de aceptar movimientos.

### RF-048 — Historial y reporte de caja

**Descripción:** El sistema permitirá consultar aperturas, movimientos y cierres, y generar un reporte imprimible de cierre.

**Actor principal:** Administrador o Consulta según permiso.

**Prioridad:** Media.

**Criterio básico de aceptación:** El reporte reproduce los datos y totales registrados para la caja seleccionada.

### 9.16 Dashboard

### RF-049 — Indicadores operativos

**Descripción:** El dashboard mostrará, según los permisos, ventas del día, número de ventas, productos con inventario bajo y ventas recientes.

**Actor principal:** Administrador, Vendedor o Consulta.

**Prioridad:** Media.

**Criterio básico de aceptación:** Los indicadores corresponden a datos confirmados y al período mostrado.

### RF-050 — Gráficos del dashboard

**Descripción:** El dashboard presentará al menos tres gráficos: ventas por período, productos más vendidos y ventas por categoría.

**Actor principal:** Administrador o Consulta.

**Prioridad:** Media.

**Criterio básico de aceptación:** Los tres gráficos se visualizan con datos del período seleccionado y coinciden con los registros confirmados.

### 9.17 Reportes

### RF-051 — Reportes operativos mínimos

**Descripción:** El sistema ofrecerá al menos ocho reportes: ventas por fechas, maestro-detalle de ventas, compras por proveedor, inventario actual, inventario bajo, productos más vendidos, ventas por vendedor y utilidad bruta estimada.

**Actor principal:** Administrador o Consulta según permiso.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Están disponibles los ocho reportes enumerados y cada uno presenta datos consistentes con sus fuentes.

### RF-052 — Filtros de reportes

**Descripción:** Los reportes permitirán aplicar los filtros pertinentes, incluidos rangos de fechas, estados, productos, proveedores o usuarios, según corresponda.

**Actor principal:** Administrador o Consulta según permiso.

**Prioridad:** Media.

**Criterio básico de aceptación:** Cada reporte devuelve únicamente registros que cumplen los filtros aplicados.

### RF-053 — Exportación de reportes

**Descripción:** El sistema permitirá exportar a Excel los reportes definidos, respetando filtros, columnas y permisos.

**Actor principal:** Administrador o Consulta según permiso.

**Prioridad:** Media.

**Criterio básico de aceptación:** El archivo exportado puede abrirse y contiene los datos visibles del reporte filtrado.

### 9.18 Bitácora

### RF-054 — Registro de acciones críticas

**Descripción:** El sistema registrará inicios de sesión, intentos fallidos, cambios de usuarios y precios, ajustes, anulaciones, respaldos y restauraciones.

**Actor principal:** Sistema.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Cada acción crítica genera una entrada con usuario cuando aplique, fecha, acción, entidad, resultado e información de trazabilidad sin secretos.

### RF-055 — Consulta de bitácora

**Descripción:** El sistema permitirá consultar la bitácora mediante filtros de fecha, usuario, acción y resultado, sin permitir la alteración de sus registros desde la aplicación.

**Actor principal:** Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Los filtros devuelven las entradas correspondientes y ningún usuario puede editarlas o eliminarlas mediante la API.

### 9.19 Respaldos y restauraciones

### RF-056 — Creación de respaldos

**Descripción:** El sistema permitirá a un usuario autorizado crear un respaldo de la base de datos, almacenarlo fuera de carpetas públicas y registrar su resultado.

**Actor principal:** Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** El respaldo autorizado genera un archivo identificable y una entrada de bitácora sin exponerlo públicamente.

### RF-057 — Restauración controlada

**Descripción:** El sistema permitirá restaurar un respaldo válido con permiso explícito, validaciones y confirmación previa.

**Actor principal:** Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** Antes de restaurar se crea un respaldo preventivo y el resultado completo de la operación queda auditado.

### RF-058 — Consulta de respaldos

**Descripción:** El sistema permitirá consultar metadatos, estado, fecha, responsable y resultado de respaldos y restauraciones autorizados.

**Actor principal:** Administrador.

**Prioridad:** Media.

**Criterio básico de aceptación:** La consulta muestra los registros disponibles sin revelar rutas internas sensibles ni permitir acceso público a archivos.

### 9.20 Configuración general

### RF-059 — Configuración de impuestos

**Descripción:** El sistema permitirá al Administrador activar, desactivar y establecer la tasa de impuesto aplicable a nuevas compras y ventas.

**Actor principal:** Administrador.

**Prioridad:** Alta.

**Criterio básico de aceptación:** La configuración validada se aplica a nuevas operaciones y las operaciones históricas conservan sus importes originales.

### RF-060 — Configuración del negocio y comprobantes

**Descripción:** El sistema permitirá configurar los datos generales de la única sucursal y los parámetros autorizados de numeración y presentación de comprobantes internos.

**Actor principal:** Administrador.

**Prioridad:** Media.

**Criterio básico de aceptación:** Los cambios válidos se reflejan en comprobantes posteriores sin modificar documentos históricos.

La configuración `descuento_maximo` representa un porcentaje global entre 0 y 100,
editable por el Administrador con `configuracion.editar`. Limita los descuentos
monetarios concedidos al cliente por línea de venta y no limita los descuentos
recibidos de proveedores en compras.

## 10. Requerimientos no funcionales

### RNF-001 — Seguridad

El sistema utilizará JWT con expiración, contraseñas protegidas con bcrypt, Helmet, CORS controlado, variables de entorno, consultas parametrizadas y autorización en el backend. No expondrá credenciales, tokens, consultas SQL ni detalles internos en respuestas o registros.

### RNF-002 — Rendimiento

En el entorno objetivo y bajo carga operativa normal de una sucursal, el 95 % de las solicitudes interactivas deberá responder en un máximo de 2 segundos, excluyendo reportes extensos, respaldos y restauraciones; las listas deberán admitir paginación cuando corresponda.

### RNF-003 — Usabilidad

La interfaz utilizará navegación, etiquetas, mensajes y confirmaciones consistentes; mostrará estados de carga, éxito, validación y error, y solicitará confirmación para acciones críticas.

### RNF-004 — Compatibilidad

La aplicación web deberá funcionar en las dos versiones estables más recientes de Chrome, Edge y Firefox disponibles durante las pruebas de aceptación, y el backend deberá operar con MariaDB/MySQL provisto mediante XAMPP.

### RNF-005 — Disponibilidad

Durante el horario de operación, el sistema deberá permanecer disponible salvo mantenimiento planificado, fallas de infraestructura o ejecución controlada de una restauración; después de un reinicio deberá poder recuperar un estado consistente.

### RNF-006 — Mantenibilidad

El software deberá organizarse por módulos y separar rutas, controladores, servicios, repositorios y validaciones en el backend, así como páginas, componentes, servicios y validaciones en el frontend, manteniendo las convenciones definidas por el proyecto.

### RNF-007 — Integridad de datos

La base de datos utilizará InnoDB, `utf8mb4`, claves primarias y foráneas, restricciones apropiadas y tipos `DECIMAL` para dinero y cantidades. Compras, ventas, anulaciones, caja e inventario deberán ejecutarse mediante transacciones y nunca dejar inventario negativo.

### RNF-008 — Auditoría

Las acciones críticas deberán generar registros de bitácora íntegros y consultables que identifiquen fecha, acción, resultado y usuario cuando corresponda, sin almacenar contraseñas, tokens ni datos completos de tarjetas.

### RNF-009 — Respaldo y recuperación

Los respaldos deberán almacenarse fuera de directorios públicos, validarse antes de una restauración y probarse periódicamente mediante un procedimiento documentado de recuperación.

### RNF-010 — Privacidad

El sistema recopilará únicamente los datos necesarios para la operación aprobada, restringirá su consulta mediante permisos y no almacenará datos completos de tarjetas ni secretos en el frontend.

### RNF-011 — Manejo de errores

La API devolverá respuestas JSON consistentes con códigos HTTP apropiados y mensajes comprensibles, mientras registrará de forma segura la información técnica necesaria para diagnóstico sin revelar detalles internos al cliente.

### RNF-012 — Diseño responsivo

La interfaz deberá adaptarse, sin pérdida de funcionalidad esencial ni desplazamiento horizontal general, a resoluciones de escritorio, tableta y teléfono desde 360 píxeles de ancho.

## 11. Restricciones técnicas

- El frontend se desarrollará con React y Vite.
- El backend se desarrollará con Node.js y Express.
- La comunicación se realizará mediante una API REST con JSON.
- La autenticación utilizará JWT y el hash de contraseñas utilizará bcrypt.
- El acceso a MariaDB/MySQL se realizará con mysql2 y un pool de conexiones.
- La base de datos se ejecutará en MariaDB/MySQL mediante XAMPP, con InnoDB y `utf8mb4`.
- Se utilizarán consultas SQL parametrizadas y manejo centralizado de errores.
- El acceso se controlará mediante roles y permisos validados en el backend.
- Los cálculos definitivos de precios, descuentos, impuestos y totales se realizarán en el backend.
- El sistema atenderá exclusivamente una sucursal.

## 12. Supuestos

- La licorería dispone de infraestructura local compatible con XAMPP, navegador actualizado y red necesaria para acceder al sistema.
- La administración mantendrá actualizados los datos de productos, precios, costos, existencias mínimas, impuestos y usuarios.
- Solo se registrarán productos cuya comercialización haya sido autorizada por la administración.
- Los usuarios dispondrán de credenciales individuales y no las compartirán.
- El efectivo, las tarjetas y las transferencias se procesarán operativamente fuera del sistema; este registrará el método y monto, pero no actuará como pasarela de pago.
- La factura o comprobante generado será interno mientras no se aprueben requisitos de integración fiscal.

## 13. Dependencias

- Disponibilidad y configuración de Node.js, npm, XAMPP y MariaDB/MySQL.
- Definición y provisión de variables de entorno seguras para la aplicación y la base de datos.
- Disponibilidad de un mecanismo del entorno servidor para crear y restaurar respaldos.
- Compatibilidad de la impresora y del navegador con la impresión de comprobantes.
- Definición administrativa de usuarios iniciales, permisos, catálogo de productos, datos de la sucursal, tasas de impuesto y numeración inicial.
- Librerías aprobadas para formularios, validación, gráficos y exportación a Excel, seleccionadas durante el diseño técnico.

## 14. Casos de uso principales

### CU-001 — Iniciar sesión

**Actor principal:** Administrador, Vendedor o Consulta.  
**Resultado esperado:** El usuario activo obtiene acceso únicamente a las funciones permitidas o recibe un rechazo controlado.

### CU-002 — Administrar usuarios y permisos

**Actor principal:** Administrador.  
**Resultado esperado:** Los usuarios, roles y permisos quedan actualizados y auditados sin perder historial.

### CU-003 — Administrar catálogos y productos

**Actor principal:** Administrador.  
**Resultado esperado:** Categorías, marcas, unidades, productos, clientes y proveedores quedan disponibles según su estado.

### CU-004 — Registrar y confirmar una compra

**Actor principal:** Administrador.  
**Resultado esperado:** La compra confirmada incrementa inventario y registra movimientos de forma transaccional.

### CU-005 — Consultar y ajustar inventario

**Actor principal:** Administrador.  
**Resultado esperado:** Las existencias y movimientos se consultan, y un ajuste autorizado queda justificado sin generar valores negativos.

### CU-006 — Registrar y confirmar una venta

**Actor principal:** Vendedor o Administrador.  
**Resultado esperado:** La venta registra detalle y pagos, reduce inventario y genera un comprobante en una operación transaccional.

### CU-007 — Registrar un pago combinado

**Actor principal:** Vendedor o Administrador.  
**Resultado esperado:** Los montos distribuidos entre métodos cubren el total y quedan asociados a la venta.

### CU-008 — Anular una venta

**Actor principal:** Administrador o usuario con permiso.  
**Resultado esperado:** La venta conserva su historial, registra el motivo y restaura el inventario sin cambios parciales.

### CU-009 — Abrir y cerrar caja

**Actor principal:** Vendedor o Administrador.  
**Resultado esperado:** La sesión de caja conserva monto inicial, movimientos, monto esperado, conteo y diferencia.

### CU-010 — Consultar dashboard y reportes

**Actor principal:** Administrador o Consulta según permiso.  
**Resultado esperado:** El usuario visualiza indicadores, al menos tres gráficos y los reportes autorizados con filtros.

### CU-011 — Consultar la bitácora

**Actor principal:** Administrador.  
**Resultado esperado:** Las acciones críticas pueden rastrearse sin que sus registros puedan modificarse desde la aplicación.

### CU-012 — Respaldar y restaurar la base de datos

**Actor principal:** Administrador.  
**Resultado esperado:** El respaldo o la restauración se ejecuta de forma controlada, genera evidencia y queda auditado.

### CU-013 — Configurar impuestos y comprobantes

**Actor principal:** Administrador.  
**Resultado esperado:** La nueva configuración se aplica a operaciones posteriores y no altera datos históricos.

## 15. Criterios generales de aceptación

### CA-001 — Cobertura funcional

Cada requerimiento funcional de prioridad alta deberá contar con una prueba aprobada; los de prioridad media o baja deberán probarse antes de la entrega del módulo correspondiente.

### CA-002 — Control de acceso

Los roles Administrador, Vendedor y Consulta solo podrán acceder y operar conforme a sus permisos, tanto en la interfaz como en la API.

### CA-003 — Transacciones e integridad

Las compras, ventas, anulaciones, operaciones de caja y cambios de inventario deberán completarse íntegramente o revertirse ante cualquier error.

### CA-004 — Inventario no negativo

Las pruebas de venta, ajuste y anulación de compra deberán demostrar que ninguna operación deja existencias negativas.

### CA-005 — Conservación histórica

Las ventas y compras confirmadas no podrán eliminarse físicamente; las anulaciones, desactivaciones y relaciones históricas deberán permanecer consultables.

### CA-006 — Exactitud de cálculos

Los subtotales, descuentos, impuestos, totales, pagos, cambio y resultados de caja deberán coincidir con los cálculos realizados por el backend para los casos de prueba aprobados.

### CA-007 — Facturación interna

Cada venta confirmada deberá generar un número único y un comprobante interno imprimible consistente con los datos almacenados.

### CA-008 — Pagos

El sistema deberá aceptar efectivo, tarjeta, transferencia y combinaciones de estos métodos, validando que los pagos cubran el importe exigible.

### CA-009 — Dashboard y reportes

El sistema deberá presentar al menos tres gráficos y ocho reportes, cuyos datos deberán coincidir con un conjunto de operaciones de prueba conocido.

### CA-010 — Auditoría

Las acciones críticas definidas deberán producir entradas de bitácora completas, consultables y libres de contraseñas, tokens y datos completos de tarjetas.

### CA-011 — Respaldo y restauración

Deberá demostrarse la creación de un respaldo fuera de carpetas públicas y la restauración controlada de un respaldo válido, incluida la copia preventiva y la auditoría del resultado.

### CA-012 — API y manejo de errores

Todas las funciones deberán operar mediante la API REST con JSON, validar datos en el servidor y devolver errores controlados sin exponer consultas ni información interna.

### CA-013 — Compatibilidad y adaptación

Los flujos principales deberán completarse en los navegadores y tamaños de pantalla definidos en los requerimientos no funcionales.

### CA-014 — Documentación y trazabilidad

La documentación relacionada deberá reflejar el comportamiento implementado y permitir relacionar pruebas, casos de uso y módulos con sus requerimientos.

## Decisiones pendientes de confirmación futura

Sin ampliar el alcance aprobado, antes del diseño detallado deberán confirmarse: la tasa o las tasas de impuesto iniciales y sus reglas de redondeo; los límites y tipos de descuento; la matriz exacta de permisos por rol; los datos obligatorios de clientes y proveedores; el formato, serie y numeración inicial del comprobante; el tratamiento de caja para pagos no efectivos; los formatos y columnas definitivos de reportes; la política de retención, ubicación, frecuencia y cifrado de respaldos; los objetivos cuantitativos de disponibilidad y recuperación; y si el comprobante interno deberá adaptarse posteriormente a requisitos fiscales.
