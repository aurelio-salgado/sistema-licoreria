# Reglas de negocio

## Sistema web de control de inventario y facturación para una licorería

## 1. Información del documento

| Campo | Valor |
|---|---|
| Documento | Reglas de negocio |
| Versión | 1.0 |
| Estado | Documento formal para validación |
| Proyecto | Sistema web de control de inventario y facturación para una licorería |
| Ámbito | Una sola sucursal |
| Documento fuente | `docs/01-requerimientos.md`, versión 1.1 |

## 2. Propósito

Este documento establece las reglas que condicionan, restringen y validan la operación del sistema. Las reglas convierten los requerimientos aprobados en condiciones claras y comprobables para orientar el diseño, la implementación, las pruebas y la aceptación, sin incorporar módulos ni funcionalidades adicionales.

## 3. Alcance

Las reglas comprenden autenticación; usuarios; roles y permisos; categorías, marcas y unidades de medida; productos; clientes; proveedores; compras; inventario; ventas; facturación interna; pagos; caja; dashboard; reportes; bitácora; respaldos y restauraciones; y configuración general de una sola sucursal.

Quedan fuera de este documento la operación multisucursal, el comercio electrónico, la contabilidad general, el crédito a clientes, las aplicaciones móviles nativas, las pasarelas de pago y la facturación electrónica fiscal, mientras estas funciones no sean aprobadas formalmente.

## 4. Convenciones de identificación

Cada regla utiliza el formato `RN-MOD-NNN`, donde `RN` significa regla de negocio, `MOD` identifica el módulo y `NNN` representa una secuencia consecutiva de tres dígitos dentro de ese módulo.

| Prefijo | Módulo |
|---|---|
| `RN-AUT` | Autenticación |
| `RN-USU` | Usuarios |
| `RN-ROL` | Roles y permisos |
| `RN-CAT` | Categorías, marcas y unidades de medida |
| `RN-PRO` | Productos |
| `RN-CLI` | Clientes |
| `RN-PRV` | Proveedores |
| `RN-COM` | Compras |
| `RN-INV` | Inventario |
| `RN-VEN` | Ventas |
| `RN-FAC` | Facturación |
| `RN-PAG` | Pagos |
| `RN-CAJ` | Caja |
| `RN-DAS` | Dashboard |
| `RN-REP` | Reportes |
| `RN-BIT` | Bitácora |
| `RN-BKP` | Respaldos y restauraciones |
| `RN-CON` | Configuración general |

## 5. Definiciones generales

- **Operación en preparación o borrador:** registro aún modificable que no produce efectos definitivos en inventario, caja ni historial confirmado.
- **Operación confirmada:** registro definitivo cuya ejecución válida produce todos sus efectos relacionados dentro de una transacción.
- **Anulación:** operación controlada que conserva el registro original, cambia su estado y revierte los efectos autorizados sin eliminar historia.
- **Desactivación lógica:** cambio de estado que impide utilizar un registro en operaciones nuevas sin eliminarlo físicamente.
- **Movimiento de inventario:** evidencia inmutable de una variación de existencias asociada a una operación de origen.
- **Caja abierta:** sesión operativa habilitada para recibir movimientos hasta su cierre.
- **Comprobante interno:** documento imprimible asociado a una venta confirmada; no constituye facturación fiscal electrónica.
- **Costo histórico:** costo conservado en el detalle de una venta para estimar la utilidad sin depender de cambios posteriores.
- **Permiso explícito:** autorización asignada y comprobada por el backend para ejecutar una acción protegida.
- **Producto autorizado:** bebida o producto complementario aprobado por la administración para su comercialización.

## 6. Reglas de negocio organizadas por módulo

### 6.1 Autenticación

### RN-AUT-001 — Acceso exclusivo de usuarios activos

**Descripción:** Solo un usuario activo y no bloqueado podrá iniciar sesión y operar en el sistema.

**Aplica a:** Autenticación y usuarios.

**Validación:** El backend comprobará el estado y el bloqueo del usuario antes de emitir una sesión y antes de autorizar su operación.

### RN-AUT-002 — Respuesta uniforme ante credenciales inválidas

**Descripción:** El rechazo de credenciales inválidas no revelará si el nombre de usuario existe ni cuál dato resultó incorrecto.

**Aplica a:** Inicio de sesión.

**Validación:** Todos los rechazos por usuario inexistente o contraseña incorrecta devolverán un mensaje funcional equivalente y sin información sensible.

### RN-AUT-003 — Bloqueo temporal por intentos fallidos

**Descripción:** Los intentos fallidos consecutivos producirán un bloqueo temporal conforme al límite y duración configurados.

**Aplica a:** Inicio de sesión y configuración de seguridad.

**Validación:** El sistema contará los intentos fallidos, rechazará nuevas autenticaciones durante el bloqueo y registrará los eventos en bitácora.

### RN-AUT-004 — Protección de credenciales y sesiones

**Descripción:** Las contraseñas se almacenarán únicamente mediante hash con bcrypt y toda sesión basada en token tendrá expiración.

**Aplica a:** Autenticación y almacenamiento de usuarios.

**Validación:** No existirá almacenamiento ni respuesta con contraseñas en texto legible, y los tokens vencidos serán rechazados.

### RN-AUT-005 — Protección y cierre de sesión

**Descripción:** Toda operación protegida requerirá autenticación válida; al cerrar sesión, el cliente invalidará o eliminará la sesión utilizada y no podrá reutilizarla desde dicho cliente.

**Aplica a:** Sesiones, frontend y operaciones protegidas.

**Validación:** Una solicitud sin autenticación válida será rechazada y, después del cierre, el cliente exigirá una nueva autenticación.

### 6.2 Usuarios

### RN-USU-001 — Nombre de usuario único

**Descripción:** Cada nombre de usuario será obligatorio y único dentro del sistema.

**Aplica a:** Creación y modificación de usuarios.

**Validación:** El backend rechazará nombres vacíos o ya asignados a otro usuario.

### RN-USU-002 — Correo único cuando se proporcione

**Descripción:** El correo será opcional, pero deberá ser único cuando se registre.

**Aplica a:** Creación y modificación de usuarios.

**Validación:** El backend permitirá la ausencia de correo y rechazará un correo ya asociado a otro usuario.

### RN-USU-003 — Desactivación y conservación histórica

**Descripción:** La baja de usuarios será lógica; un usuario relacionado con operaciones históricas no podrá eliminarse físicamente.

**Aplica a:** Administración de usuarios y consultas históricas.

**Validación:** La baja cambiará el estado del usuario y sus referencias históricas continuarán disponibles.

### RN-USU-004 — Continuidad administrativa

**Descripción:** El sistema deberá conservar al menos un usuario activo con rol Administrador.

**Aplica a:** Desactivación de usuarios y cambio de roles.

**Validación:** Se rechazará cualquier operación que desactive o retire el rol al último Administrador activo.

### RN-USU-005 — Efecto del estado y cambio de rol

**Descripción:** Un usuario bloqueado o inactivo no podrá operar; un cambio de rol afectará sus permisos en nuevas sesiones sin modificar la autoría ni los datos de operaciones históricas.

**Aplica a:** Usuarios, sesiones, roles e historial.

**Validación:** El backend rechazará operaciones del usuario impedido y conservará intactas las referencias históricas tras cualquier cambio de rol.

### 6.3 Roles y permisos

### RN-ROL-001 — Roles iniciales obligatorios

**Descripción:** El sistema dispondrá de los roles iniciales Administrador, Vendedor y Consulta.

**Aplica a:** Roles y usuarios.

**Validación:** La configuración inicial y las consultas de roles mostrarán los tres roles aprobados.

### RN-ROL-002 — Autorización obligatoria en el backend

**Descripción:** Los permisos de toda operación protegida se validarán en el backend; ocultar botones, enlaces o rutas en el frontend no sustituirá dicha autorización.

**Aplica a:** API, frontend y roles.

**Validación:** Una solicitud directa sin permiso será rechazada sin modificar datos, aunque el cliente intente invocarla.

### RN-ROL-003 — Permisos para acciones críticas

**Descripción:** Los descuentos, anulaciones, ajustes de inventario, respaldos y restauraciones requerirán permisos explícitos.

**Aplica a:** Roles y procesos críticos.

**Validación:** El backend comprobará el permiso específico antes de iniciar cada acción y rechazará su ausencia.

### RN-ROL-004 — Restricciones del rol Consulta

**Descripción:** El rol Consulta no podrá crear, modificar, confirmar ni anular registros.

**Aplica a:** Usuario con rol Consulta.

**Validación:** Las operaciones de escritura solicitadas por este rol serán rechazadas y no producirán cambios.

### RN-ROL-005 — Aplicación controlada de permisos

**Descripción:** Los permisos modificados se aplicarán de forma consistente en nuevas sesiones y no alterarán operaciones históricas.

**Aplica a:** Gestión de permisos y sesiones.

**Validación:** Una sesión nueva reflejará la matriz vigente y las operaciones previas conservarán su usuario y contexto originales.

### 6.4 Categorías, marcas y unidades de medida

### RN-CAT-001 — Unicidad de categorías

**Descripción:** No podrán existir categorías con nombres duplicados.

**Aplica a:** Categorías.

**Validación:** El backend normalizará el valor conforme al criterio aprobado y rechazará un nombre ya registrado.

### RN-CAT-002 — Conservación del historial de catálogos

**Descripción:** Las categorías, marcas y unidades de medida relacionadas con operaciones o productos históricos se conservarán mediante desactivación lógica.

**Aplica a:** Categorías, marcas, unidades y consultas históricas.

**Validación:** La desactivación mantendrá las relaciones existentes y no eliminará físicamente registros referenciados.

### RN-CAT-003 — Uso de catálogos inactivos

**Descripción:** Un catálogo inactivo no se ofrecerá en registros nuevos, pero podrá seguir apareciendo en productos y consultas históricas.

**Aplica a:** Categorías, marcas, unidades y productos.

**Validación:** Los selectores de nuevas operaciones excluirán registros inactivos y las consultas anteriores conservarán sus valores.

### 6.5 Productos

### RN-PRO-001 — Código interno único

**Descripción:** Todo producto tendrá un código interno obligatorio y único.

**Aplica a:** Productos.

**Validación:** El backend rechazará códigos vacíos o asignados a otro producto.

### RN-PRO-002 — Código de barras opcional y único

**Descripción:** El código de barras será opcional, pero deberá ser único cuando exista.

**Aplica a:** Productos y búsqueda.

**Validación:** El backend aceptará su ausencia y rechazará un valor ya asignado a otro producto.

### RN-PRO-003 — Datos básicos obligatorios

**Descripción:** Todo producto tendrá nombre obligatorio y exactamente una unidad de medida principal.

**Aplica a:** Creación y modificación de productos.

**Validación:** El backend rechazará productos sin nombre o sin una única unidad principal válida.

### RN-PRO-004 — Valores económicos válidos

**Descripción:** El precio de venta será mayor que cero y el costo será igual o mayor que cero.

**Aplica a:** Productos y cambios de precios.

**Validación:** El backend rechazará precios nulos o negativos y costos negativos.

El costo promedio podrá establecerse al crear el producto y corregirse administrativamente cuando su existencia sea cero. Si existe inventario, el CRUD solo aceptará el mismo valor vigente y rechazará cualquier cambio; omitir el campo durante la edición conservará su valor. Las compras confirmadas serán la fuente normal de actualización operativa, mientras que ajustes y anulaciones no modificarán el costo promedio.

### RN-PRO-005 — Existencia mínima válida

**Descripción:** La existencia mínima configurada para un producto será igual o mayor que cero.

**Aplica a:** Productos e inventario bajo.

**Validación:** El backend rechazará valores negativos antes de guardar el producto.

### RN-PRO-006 — Existencias fuera del formulario de productos

**Descripción:** Las existencias no podrán modificarse desde el formulario de productos y solo cambiarán por operaciones de inventario autorizadas.

**Aplica a:** Productos, compras, ventas, anulaciones y ajustes.

**Validación:** El backend ignorará o rechazará cambios directos de existencia y exigirá una operación válida que genere movimiento.

### RN-PRO-007 — Estado e historial del producto

**Descripción:** Los productos inactivos no podrán comprarse ni venderse; los productos con historial no se eliminarán físicamente y los cambios de precio no alterarán ventas anteriores.

**Aplica a:** Productos, compras, ventas e historial.

**Validación:** Las nuevas operaciones excluirán productos inactivos y los detalles históricos conservarán sus valores originales.

### 6.6 Clientes

### RN-CLI-001 — Cliente predeterminado

**Descripción:** Deberá existir el cliente predeterminado “Consumidor final” y podrá utilizarse en una venta ordinaria cuando no se identifique a otro cliente.

**Aplica a:** Clientes y ventas.

**Validación:** El sistema comprobará su disponibilidad y permitirá seleccionarlo sin crear un cliente adicional.

### RN-CLI-002 — Protección de Consumidor final

**Descripción:** El cliente “Consumidor final” no podrá eliminarse ni quedar inutilizable para las ventas ordinarias.

**Aplica a:** Administración de clientes.

**Validación:** El backend rechazará su eliminación y cualquier cambio que impida cumplir su función predeterminada.

### RN-CLI-003 — Datos personales necesarios

**Descripción:** Solo se recopilarán los datos personales necesarios para la operación aprobada.

**Aplica a:** Clientes y privacidad.

**Validación:** Los formularios y validaciones se limitarán a los campos definidos como necesarios en la especificación aprobada.

### RN-CLI-004 — Estado e historial comercial

**Descripción:** Los clientes inactivos no podrán seleccionarse en ventas nuevas y su historial comercial deberá conservarse.

**Aplica a:** Clientes, ventas y consultas históricas.

**Validación:** Los selectores excluirán clientes inactivos sin retirar su identificación de ventas anteriores.

### 6.7 Proveedores

### RN-PRV-001 — Proveedor activo obligatorio

**Descripción:** Toda compra nueva requerirá un proveedor activo.

**Aplica a:** Proveedores y compras.

**Validación:** El backend rechazará borradores o confirmaciones sin proveedor activo.

### RN-PRV-002 — Conservación y estado de proveedores

**Descripción:** Los proveedores con historial no se eliminarán físicamente y los proveedores inactivos no podrán seleccionarse en compras nuevas.

**Aplica a:** Proveedores, compras e historial.

**Validación:** La baja será lógica, las nuevas compras excluirán al proveedor y las compras históricas conservarán su referencia.

### RN-PRV-003 — Identificación fiscal única cuando exista

**Descripción:** La identificación fiscal será opcional hasta definir los datos obligatorios, pero no podrá duplicarse cuando se proporcione.

**Aplica a:** Proveedores.

**Validación:** El backend permitirá su ausencia y rechazará un valor ya registrado para otro proveedor.

### 6.8 Compras

### RN-COM-001 — Efecto del borrador

**Descripción:** Una compra en borrador podrá modificarse y no afectará el inventario.

**Aplica a:** Compras e inventario.

**Validación:** Crear o editar el borrador no generará movimientos ni cambiará existencias.

### RN-COM-002 — Detalle válido de compra

**Descripción:** Para confirmarse, una compra contendrá al menos un producto; cada cantidad será mayor que cero y cada costo será igual o mayor que cero.

**Aplica a:** Detalle y confirmación de compras.

**Validación:** El backend rechazará compras vacías, cantidades no positivas o costos negativos.

### RN-COM-003 — Cálculo definitivo de compras

**Descripción:** El backend calculará los subtotales, descuentos monetarios concedidos por el proveedor, impuestos configurados y total definitivo de la compra. El límite comercial `descuento_maximo` no aplica a compras.

**Aplica a:** Compras y configuración.

**Validación:** Los valores enviados por el cliente serán recalculados y el resultado persistido coincidirá con el detalle y la configuración aplicable.

### RN-COM-004 — Confirmación transaccional

**Descripción:** La confirmación, el encabezado, los detalles, el aumento de inventario, la actualización del costo promedio ponderado y sus movimientos se ejecutarán en una sola transacción.

**Aplica a:** Confirmación de compras e inventario.

**Validación:** Ante cualquier error se revertirán todos los cambios; si concluye, la compra aumentará las existencias correspondientes.

### RN-COM-005 — Inmutabilidad y conservación de compras confirmadas

**Descripción:** Una compra confirmada no se eliminará físicamente ni se convertirá nuevamente en borrador.

**Aplica a:** Compras confirmadas.

**Validación:** El backend rechazará su eliminación física o cambio regresivo de estado y conservará el registro histórico.

### RN-COM-006 — Autorización de anulación

**Descripción:** La anulación de una compra confirmada requerirá permiso explícito y motivo obligatorio; una compra anulada no podrá confirmarse nuevamente.

**Aplica a:** Compras, roles y bitácora.

**Validación:** El backend validará permiso, motivo y estado antes de anular, y rechazará la reconfirmación posterior.

### RN-COM-007 — Reversión segura de compras

**Descripción:** La anulación revertirá únicamente las cantidades de inventario mediante una transacción y será rechazada si cualquiera de sus productos quedara con existencia negativa. No modificará automáticamente `productos.costo_promedio`, no reconstruirá retrospectivamente la valoración y no alterará los costos históricos de ventas.

**Aplica a:** Anulación de compras e inventario.

**Validación:** El backend verificará las existencias antes de aplicar la reversión, disminuirá la existencia, registrará el movimiento inverso y completará todos los cambios o ninguno. No aplicará una reversión algebraica del costo ni rechazará la anulación solo por existir movimientos posteriores, siempre que haya existencia suficiente.

### 6.9 Inventario

### RN-INV-001 — Prohibición de inventario negativo

**Descripción:** Ninguna operación podrá dejar la existencia de un producto por debajo de cero.

**Aplica a:** Compras, ventas, anulaciones, ajustes e inventario.

**Validación:** El backend comprobará las existencias dentro de la operación transaccional y rechazará el resultado negativo.

### RN-INV-002 — Movimiento obligatorio por cambio de existencia

**Descripción:** Todo cambio de existencia generará un movimiento con la existencia anterior y posterior.

**Aplica a:** Inventario y operaciones que modifican existencias.

**Validación:** La transacción no podrá confirmarse si cambia una existencia sin registrar el movimiento y ambos saldos.

### RN-INV-003 — Inmutabilidad de movimientos

**Descripción:** Los movimientos confirmados no se editarán ni eliminarán; las correcciones se realizarán mediante movimientos inversos o ajustes autorizados.

**Aplica a:** Historial de inventario.

**Validación:** El sistema rechazará modificaciones directas y exigirá una nueva operación trazable para corregir diferencias.

### RN-INV-004 — Ajustes controlados

**Descripción:** Todo ajuste positivo o negativo requerirá permiso explícito y motivo obligatorio.

**Aplica a:** Ajustes de inventario, roles y bitácora.

**Validación:** El backend comprobará permiso y motivo antes de registrar existencia y movimiento en una transacción.

### RN-INV-005 — Consistencia de existencias

**Descripción:** La existencia actual deberá ser consistente con los movimientos confirmados y solo las operaciones confirmadas podrán afectarla.

**Aplica a:** Inventario, borradores y controles de consistencia.

**Validación:** Las verificaciones compararán la existencia vigente con el saldo derivado de movimientos confirmados y excluirán borradores.

### RN-INV-006 — Alerta de inventario bajo

**Descripción:** Todo producto activo cuya existencia sea igual o inferior a su existencia mínima generará una condición de alerta.

**Aplica a:** Inventario, dashboard y reportes.

**Validación:** El sistema comparará ambos valores e incluirá únicamente los productos activos que cumplan el umbral.

### 6.10 Ventas

### RN-VEN-001 — Efecto de la venta en preparación

**Descripción:** Una venta en preparación podrá modificarse y no afectará inventario ni caja.

**Aplica a:** Ventas, inventario y caja.

**Validación:** Crear o editar la preparación no generará movimientos de inventario ni de caja.

### RN-VEN-002 — Detalle válido de venta

**Descripción:** Una venta deberá contener al menos un producto activo y todas sus cantidades deberán ser mayores que cero.

**Aplica a:** Preparación y confirmación de ventas.

**Validación:** El backend rechazará ventas vacías, productos inactivos o cantidades no positivas.

### RN-VEN-003 — Validación inmediata de existencias

**Descripción:** El backend validará la existencia disponible de cada producto inmediatamente antes de confirmar la venta.

**Aplica a:** Confirmación de ventas e inventario.

**Validación:** Si una cantidad supera la existencia disponible, se rechazará la operación completa.

### RN-VEN-004 — Cálculo definitivo de ventas

**Descripción:** El backend calculará precios aplicables, descuentos autorizados, impuestos configurados, subtotal y total definitivo. Cada descuento de línea es un importe monetario y no podrá superar el porcentaje global `descuento_maximo` configurado para ventas.

**Aplica a:** Ventas y configuración.

**Validación:** Los valores del cliente serán recalculados y los importes confirmados coincidirán con el detalle y las reglas vigentes.

### RN-VEN-005 — Valores históricos del detalle

**Descripción:** Al confirmar, el precio de venta y el costo histórico se copiarán al detalle y se conservarán para las consultas y el cálculo de utilidad.

**Aplica a:** Detalle de ventas, productos y reportes.

**Validación:** Los cambios posteriores de precio o costo del producto no modificarán los valores almacenados en ventas anteriores.

### RN-VEN-006 — Confirmación transaccional integral

**Descripción:** La venta, sus detalles, pagos, reducción de inventario, movimientos y efectos de caja se procesarán en una sola transacción.

**Aplica a:** Ventas, pagos, inventario y caja.

**Validación:** Ante un error se revertirán todos los componentes; una confirmación exitosa los registrará de forma íntegra.

### RN-VEN-007 — Inmutabilidad de ventas confirmadas

**Descripción:** Una venta confirmada no se editará directamente ni se eliminará físicamente.

**Aplica a:** Ventas confirmadas e historial.

**Validación:** El backend rechazará modificaciones o eliminaciones y exigirá una anulación controlada cuando corresponda.

### RN-VEN-008 — Anulación definitiva de venta

**Descripción:** La anulación exigirá permiso y motivo, restaurará el inventario dentro de una transacción, conservará el número del comprobante y no permitirá confirmar nuevamente la venta anulada.

**Aplica a:** Ventas, inventario, facturación, roles y bitácora.

**Validación:** El backend comprobará permiso, motivo y estado; registrará la reversión completa y rechazará la reutilización o reconfirmación.

### 6.11 Facturación

### RN-FAC-001 — Número único por venta confirmada

**Descripción:** Cada venta confirmada recibirá un número de factura o comprobante interno único.

**Aplica a:** Ventas y facturación.

**Validación:** Antes de confirmar se garantizará que el número asignado no corresponda a otra venta.

### RN-FAC-002 — Numeración consecutiva no reutilizable

**Descripción:** La numeración será consecutiva y los números de ventas anuladas no se reutilizarán.

**Aplica a:** Facturación y anulaciones.

**Validación:** La asignación seguirá la secuencia configurada y una anulación no devolverá el número a los disponibles.

### RN-FAC-003 — Inmutabilidad documental

**Descripción:** Los comprobantes históricos conservarán los valores y la presentación aplicables al confirmarse, sin cambios por configuraciones posteriores.

**Aplica a:** Facturación y configuración general.

**Validación:** La reimpresión de un comprobante reproducirá sus datos históricos aunque la configuración vigente sea distinta.

### RN-FAC-004 — Naturaleza y contenido del comprobante

**Descripción:** El comprobante será interno mientras no exista integración fiscal aprobada y contendrá negocio, cliente, vendedor, detalle, impuestos, descuentos, pagos y total.

**Aplica a:** Facturación e impresión.

**Validación:** El sistema identificará el documento como interno y comprobará la presencia y consistencia de los datos exigidos.

### 6.12 Pagos

### RN-PAG-001 — Métodos de pago iniciales

**Descripción:** Los métodos iniciales serán efectivo, tarjeta y transferencia.

**Aplica a:** Pagos y ventas.

**Validación:** La configuración inicial permitirá registrar cada uno de los tres métodos aprobados.

### RN-PAG-002 — Pagos combinados

**Descripción:** Una venta podrá distribuir su pago entre dos o más métodos aprobados.

**Aplica a:** Pagos y confirmación de ventas.

**Validación:** El sistema conservará por separado el método y monto de cada componente del pago.

### RN-PAG-003 — Cobertura exacta del total

**Descripción:** La suma de los importes aplicados a la venta, descontando el efectivo entregado como cambio, deberá cubrir exactamente el total exigible.

**Aplica a:** Pagos simples y combinados.

**Validación:** El backend rechazará pagos netos inferiores o superiores al total y conciliará el excedente de efectivo únicamente como cambio.

### RN-PAG-004 — Cambio y referencias

**Descripción:** El cambio se calculará únicamente sobre el efectivo recibido y una referencia será obligatoria cuando la configuración del método de pago la requiera.

**Aplica a:** Efectivo, tarjeta, transferencia y pagos combinados.

**Validación:** El backend excluirá montos no efectivos del cálculo de cambio y rechazará el pago sin la referencia exigida.

### RN-PAG-005 — Protección y anulación de pagos

**Descripción:** No se almacenarán datos completos de tarjetas y los pagos de una venta anulada permanecerán asociados a su anulación para fines históricos.

**Aplica a:** Pagos, privacidad y anulaciones.

**Validación:** Los datos persistidos excluirán información completa de tarjeta y la consulta histórica conservará la relación entre venta, pagos y anulación.

### 6.13 Caja

### RN-CAJ-001 — Caja abierta para vender

**Descripción:** Cuando el control de caja esté activo, una venta solo podrá confirmarse si el usuario dispone de una caja abierta válida.

**Aplica a:** Caja y confirmación de ventas.

**Validación:** El backend comprobará el estado de la caja antes de confirmar la venta.

### RN-CAJ-002 — Una caja abierta por usuario

**Descripción:** Un usuario no podrá mantener dos cajas abiertas simultáneamente.

**Aplica a:** Apertura de caja.

**Validación:** El sistema rechazará una nueva apertura si ya existe una caja abierta para el usuario.

### RN-CAJ-003 — Monto inicial válido

**Descripción:** El monto inicial de caja será igual o mayor que cero.

**Aplica a:** Apertura de caja.

**Validación:** El backend rechazará montos iniciales negativos.

### RN-CAJ-004 — Movimientos autorizados de caja

**Descripción:** Los ingresos y egresos requerirán concepto, y una caja cerrada no aceptará movimientos nuevos.

**Aplica a:** Movimientos y estado de caja.

**Validación:** El backend validará concepto y estado abierto antes de registrar el movimiento.

### RN-CAJ-005 — Cierre y efectivo esperado

**Descripción:** El cierre registrará monto esperado, monto contado y diferencia; el efectivo esperado excluirá pagos de tarjeta y transferencia.

**Aplica a:** Cierre de caja y métodos de pago.

**Validación:** El sistema calculará el efectivo esperado con movimientos de efectivo y conservará los tres importes del cierre.

### RN-CAJ-006 — Historial y anulaciones en caja

**Descripción:** Las anulaciones se reflejarán de acuerdo con sus efectos monetarios en caja y el cierre no eliminará ni modificará movimientos anteriores.

**Aplica a:** Caja, ventas anuladas e historial.

**Validación:** La anulación generará el efecto trazable correspondiente y las consultas posteriores conservarán todos los movimientos originales.

### 6.14 Dashboard

### RN-DAS-001 — Datos autorizados del dashboard

**Descripción:** El dashboard solo mostrará indicadores y gráficos permitidos para el usuario autenticado.

**Aplica a:** Dashboard, roles y permisos.

**Validación:** El backend filtrará la información y rechazará consultas de datos no autorizados.

### RN-DAS-002 — Período explícito de indicadores

**Descripción:** Cada indicador y gráfico deberá señalar claramente el período utilizado y calcularse sobre operaciones confirmadas, excluyendo anuladas por defecto.

**Aplica a:** Dashboard.

**Validación:** La interfaz mostrará el período y los resultados coincidirán con las operaciones válidas incluidas en dicho intervalo.

### 6.15 Reportes

### RN-REP-001 — Estado de operaciones reportadas

**Descripción:** Los reportes incluirán por defecto operaciones confirmadas y excluirán las anuladas de los totales, salvo que un filtro específico solicite mostrarlas.

**Aplica a:** Reportes de compras, ventas, caja e inventario.

**Validación:** Los totales predeterminados omitirán anulaciones y el filtro de estado permitirá identificarlas sin sumarlas como operaciones vigentes.

### RN-REP-002 — Validación de filtros

**Descripción:** Todos los filtros de reportes se validarán en el backend.

**Aplica a:** Reportes.

**Validación:** El backend rechazará rangos, estados o valores inválidos antes de generar resultados.

### RN-REP-003 — Resultados sujetos a permisos

**Descripción:** Los resultados de reportes respetarán los permisos del usuario.

**Aplica a:** Reportes, roles y permisos.

**Validación:** El backend devolverá únicamente los reportes y datos autorizados para la sesión.

### RN-REP-004 — Correspondencia de exportación

**Descripción:** La exportación contendrá los mismos datos, filtros y alcance autorizado que el reporte visible.

**Aplica a:** Reportes y exportación.

**Validación:** La comparación entre vista y archivo exportado mostrará correspondencia de filtros y registros.

### RN-REP-005 — Utilidad con costo histórico

**Descripción:** La utilidad bruta estimada se calculará utilizando el costo histórico guardado en cada detalle de venta.

**Aplica a:** Reporte de utilidad bruta estimada.

**Validación:** Los cambios posteriores del costo del producto no alterarán la utilidad calculada para ventas anteriores.

### 6.16 Bitácora

### RN-BIT-001 — Registro de acciones críticas

**Descripción:** Se auditarán las acciones críticas, incluidos intentos fallidos de autenticación, cambios de usuarios y precios, ajustes, anulaciones, respaldos y restauraciones.

**Aplica a:** Bitácora y procesos críticos.

**Validación:** Cada acción definida producirá una entrada aun cuando su resultado sea fallido, cuando corresponda.

### RN-BIT-002 — Contenido trazable

**Descripción:** La bitácora registrará usuario cuando corresponda, fecha, acción, resultado, entidad y referencia de la operación.

**Aplica a:** Bitácora.

**Validación:** Las entradas contendrán los campos de trazabilidad aplicables y permitirán identificar el evento de origen.

### RN-BIT-003 — Exclusión de información sensible

**Descripción:** La bitácora no almacenará contraseñas, tokens ni datos completos de tarjetas.

**Aplica a:** Bitácora, autenticación y pagos.

**Validación:** La inspección de eventos registrados no mostrará ninguno de los datos sensibles prohibidos.

### RN-BIT-004 — Inmutabilidad desde la aplicación

**Descripción:** Los registros de bitácora no podrán editarse ni eliminarse desde la aplicación.

**Aplica a:** Consulta de bitácora.

**Validación:** No existirá una operación funcional autorizada que altere o elimine entradas registradas.

### 6.17 Respaldos y restauraciones

### RN-BKP-001 — Permiso explícito

**Descripción:** Solo los usuarios con permiso explícito podrán crear respaldos o ejecutar restauraciones.

**Aplica a:** Respaldos, restauraciones y roles.

**Validación:** El backend rechazará la acción antes de iniciarla cuando falte el permiso requerido.

### RN-BKP-002 — Almacenamiento no público

**Descripción:** Los archivos de respaldo se guardarán fuera de carpetas públicas.

**Aplica a:** Creación y custodia de respaldos.

**Validación:** La ubicación configurada no será servida como contenido público por la aplicación.

### RN-BKP-003 — Confirmación y respaldo preventivo

**Descripción:** Toda restauración requerirá confirmación previa y la creación de un respaldo preventivo antes de modificar la base de datos.

**Aplica a:** Restauraciones.

**Validación:** La restauración no comenzará sin confirmación ni evidencia de que el respaldo preventivo terminó correctamente.

### RN-BKP-004 — Archivo validado

**Descripción:** No se permitirá restaurar un archivo que no haya superado las validaciones definidas de integridad y compatibilidad.

**Aplica a:** Restauraciones.

**Validación:** El sistema rechazará el archivo antes de modificar datos si alguna validación obligatoria falla.

### RN-BKP-005 — Auditoría sin exposición de rutas

**Descripción:** El resultado exitoso o fallido de cada respaldo y restauración quedará registrado, y el frontend no recibirá rutas internas del servidor.

**Aplica a:** Respaldos, restauraciones, bitácora y privacidad.

**Validación:** Cada intento producirá una entrada de resultado y las respuestas al cliente omitirán rutas internas.

### RN-BKP-006 — Exclusión operativa durante la restauración

**Descripción:** Mientras una restauración esté en curso, el sistema impedirá operaciones transaccionales incompatibles.

**Aplica a:** Restauraciones, compras, ventas, anulaciones, inventario y caja.

**Validación:** Las operaciones incompatibles serán rechazadas o permanecerán fuera de ejecución hasta concluir la restauración, sin generar cambios parciales.

### 6.18 Configuración general

### RN-CON-001 — Sucursal única

**Descripción:** El sistema administrará exclusivamente una sucursal.

**Aplica a:** Configuración general y todos los módulos operativos.

**Validación:** No se permitirá crear ni seleccionar sucursales adicionales.

### RN-CON-002 — Vigencia prospectiva

**Descripción:** Los cambios de configuración se aplicarán a operaciones futuras y las operaciones históricas conservarán los valores con los que fueron confirmadas.

**Aplica a:** Impuestos, descuentos comerciales de ventas, comprobantes, compras y ventas.

**Validación:** Una modificación afectará nuevas operaciones sin recalcular ni sobrescribir registros confirmados anteriores.

### RN-CON-003 — Rangos configurables válidos

**Descripción:** Las tasas de impuesto y el porcentaje global `descuento_maximo` deberán encontrarse entre 0 y 100. Este último limita exclusivamente los descuentos concedidos al cliente por línea de venta.

**Aplica a:** Configuración y ventas.

**Validación:** El backend rechazará valores fuera de los rangos que se definan formalmente.

### RN-CON-004 — Numeración sin duplicados

**Descripción:** La configuración de comprobantes no podrá producir números duplicados.

**Aplica a:** Configuración general y facturación.

**Validación:** El sistema comprobará la continuidad y unicidad antes de aceptar cambios o asignar un número.

### RN-CON-005 — Protección de configuración crítica

**Descripción:** Las configuraciones críticas solo podrán modificarse con permiso explícito. La tasa de impuesto y el porcentaje máximo de descuento en ventas se validan entre 0 y 100.

**Aplica a:** Configuración general, roles y permisos.

**Validación:** El backend rechazará cambios no autorizados y no asumirá porcentajes que no hayan sido aprobados formalmente.

## 7. Reglas críticas transversales

Las siguientes condiciones tienen precedencia en todos los módulos relacionados:

1. **Autenticación y autorización:** ninguna protección de interfaz sustituye las validaciones de identidad, estado y permisos realizadas por el backend.
2. **Atomicidad:** compras, ventas, anulaciones, caja e inventario deben aplicar todos sus efectos o revertirlos íntegramente.
3. **Inventario no negativo:** ninguna confirmación, ajuste o reversión puede dejar existencias menores que cero.
4. **Conservación histórica:** compras, ventas, movimientos, comprobantes y registros de auditoría confirmados no se eliminan físicamente ni se sobrescriben.
5. **Cálculo confiable:** precios, descuentos, impuestos, totales, pagos y resultados definitivos se calculan y validan en el backend.
6. **Trazabilidad:** las acciones críticas y todo cambio de inventario deben conservar actor, fecha, resultado y operación de origen cuando corresponda.
7. **Protección de información:** no se almacenan ni exponen contraseñas, tokens, datos completos de tarjetas o rutas internas sensibles.
8. **Vigencia histórica:** las configuraciones nuevas no alteran operaciones ya confirmadas.

## 8. Decisiones pendientes

Antes del diseño detallado o de las pruebas definitivas deberán aprobarse:

1. La tasa o las tasas iniciales de impuesto, sus rangos válidos y reglas de redondeo.
2. Los tipos, límites y rangos válidos de descuento.
3. La matriz exacta de permisos de Administrador, Vendedor y Consulta.
4. El límite de intentos fallidos y la duración del bloqueo temporal.
5. Los datos obligatorios y reglas de normalización para clientes y proveedores.
6. El criterio de comparación para nombres de categorías, nombres de usuario, correos, códigos e identificaciones fiscales.
7. El formato, la serie, la numeración inicial y la presentación del comprobante interno.
8. El tratamiento detallado en caja de anulaciones y pagos no efectivos.
9. Los métodos que exigirán referencia y el formato válido de cada referencia.
10. Los formatos, columnas y filtros definitivos de los reportes y exportaciones.
11. La política de ubicación, frecuencia, retención, cifrado y validación de respaldos.
12. El mecanismo exacto para impedir operaciones incompatibles durante una restauración.
13. Los objetivos cuantitativos de disponibilidad y recuperación.
14. La eventual adaptación del comprobante interno a requisitos fiscales, si se aprueba ese alcance en el futuro.

## 9. Matriz resumida de reglas críticas

| Tema crítico | Reglas principales | Resultado exigido |
|---|---|---|
| Acceso seguro | RN-AUT-001 a RN-AUT-005; RN-ROL-002 | Solo usuarios válidos ejecutan operaciones autorizadas. |
| Continuidad administrativa | RN-USU-004 | Siempre existe al menos un Administrador activo. |
| Acciones sensibles | RN-ROL-003; RN-COM-006; RN-INV-004; RN-VEN-008; RN-BKP-001 | Cada acción crítica exige permiso y, cuando corresponde, motivo. |
| Inventario no negativo | RN-COM-007; RN-INV-001; RN-VEN-003 | Ninguna operación confirmada produce existencias negativas. |
| Transacciones | RN-COM-004; RN-COM-007; RN-VEN-006; RN-VEN-008 | Los cambios relacionados se aplican por completo o se revierten. |
| Conservación histórica | RN-PRO-007; RN-COM-005; RN-INV-003; RN-VEN-007; RN-FAC-003; RN-BIT-004 | Los registros confirmados conservan su trazabilidad y valores. |
| Pagos y caja | RN-PAG-003; RN-PAG-004; RN-CAJ-005; RN-CAJ-006 | Los pagos concilian con la venta y el efectivo se distingue de otros métodos. |
| Auditoría y privacidad | RN-BIT-001 a RN-BIT-004; RN-PAG-005 | Las acciones quedan trazadas sin almacenar información sensible prohibida. |
| Respaldo y recuperación | RN-BKP-001 a RN-BKP-006 | Los respaldos y restauraciones son autorizados, validados, privados y auditados. |
| Configuración histórica | RN-CON-002 a RN-CON-005 | Los cambios futuros son válidos, autorizados y no alteran operaciones anteriores. |

## 10. Criterios de validación

### CV-001 — Cobertura

Cada regla deberá vincularse con al menos un caso de prueba del módulo correspondiente.

### CV-002 — Resultado comprobable

Cada prueba deberá identificar datos de entrada, condición previa, acción, resultado esperado y evidencia obtenida.

### CV-003 — Validación del backend

Las reglas de seguridad, permisos, estados, cálculos e integridad deberán comprobarse mediante solicitudes válidas e inválidas, sin depender exclusivamente de la interfaz.

### CV-004 — Pruebas transaccionales

Las compras, ventas, anulaciones, caja e inventario deberán probarse provocando fallos controlados para comprobar que no queden cambios parciales.

### CV-005 — Pruebas de inventario

Se deberán probar existencias suficientes, insuficientes, iguales a cero y en el límite mínimo, verificando que nunca exista un saldo negativo.

### CV-006 — Pruebas históricas

Se deberán modificar configuraciones, precios, costos, estados y roles para comprobar que las operaciones confirmadas conservan sus valores y referencias originales.

### CV-007 — Pruebas de autorización

Los roles Administrador, Vendedor y Consulta deberán probarse tanto desde la interfaz como mediante solicitudes directas al backend.

### CV-008 — Pruebas de pagos y caja

Se deberán validar pagos simples y combinados, cambio en efectivo, referencias obligatorias, anulaciones y cierres con diferencias conocidas.

### CV-009 — Pruebas de auditoría y privacidad

Las acciones críticas deberán generar trazabilidad suficiente sin contraseñas, tokens, datos completos de tarjetas ni rutas internas del servidor.

### CV-010 — Pruebas de recuperación

La restauración deberá probarse con archivos válidos e inválidos, respaldo preventivo, resultado auditado y bloqueo de operaciones incompatibles.

### CV-011 — Aceptación de decisiones pendientes

Las reglas dependientes de parámetros aún no definidos solo podrán considerarse completamente aceptadas después de documentar y aprobar dichos parámetros.
