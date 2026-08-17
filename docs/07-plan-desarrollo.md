# Estado de implementación del frontend

## Catálogos de productos

El frontend dispone de pantallas funcionales y protegidas por `productos.ver` para:

- `/categories`: categorías.
- `/brands`: marcas.
- `/units`: unidades de medida.

Las acciones visibles respetan `productos.crear`, `productos.editar` y
`productos.desactivar`. Los listados usan búsqueda, estado y paginación del backend;
las altas y ediciones se realizan en formularios modales, y los cambios de estado
requieren confirmación y usan `PATCH /:id/status`. No existe eliminación física.

## Productos

La ruta `/products` ofrece listado paginado, búsqueda y filtros remotos por estado,
categoría y marca. Permite crear, editar, desactivar y reactivar según los permisos
`productos.crear`, `productos.editar` y `productos.desactivar`.

El formulario no modifica la existencia. El costo promedio se omite del `PUT` cuando
hay inventario y queda como solo lectura; los catálogos seleccionables se limitan a
categorías, marcas y unidades activas.

## Clientes y proveedores

Las rutas `/clients` y `/suppliers` ofrecen búsqueda, filtro de estado, paginación,
creación, edición y cambio lógico de estado según los permisos reales de cada módulo.
Los formularios normalizan campos opcionales vacíos como `null`.

El cliente marcado mediante `es_consumidor_final` se identifica como cliente
predeterminado y no presenta acciones de edición ni desactivación.

## Compras

La ruta `/purchases` permite consultar y filtrar compras, crear borradores y acceder
a `/purchases/:id`. El detalle administra encabezado y líneas mientras la compra está
en `borrador`, muestra totales calculados por el backend y aplica permisos separados
para crear/editar, confirmar y anular.

La confirmación advierte que actualizará inventario y costo promedio. La anulación
exige motivo, revierte existencias y deja la compra histórica en modo consulta.

## Ventas

Las rutas `/sales` y `/sales/:id` permiten consultar, filtrar y preparar ventas.
Las preparaciones admiten encabezado y líneas editables; la confirmación registra
uno o varios métodos de pago activos y muestra la factura generada por el backend.
Las ventas completadas conservan sus pagos históricos y pueden anularse de forma
controlada según permisos, inventario y reglas de caja.

## Caja

Las rutas `/cash` y `/cash/:id` permiten administrar la caja propia: apertura,
ingresos y egresos manuales, movimientos de ventas y anulaciones, cierre e
historial. El monto esperado mostrado durante el turno es una ayuda calculada con
movimientos reales; el backend conserva la autoridad sobre el cierre y diferencia.

## Manejo de errores del frontend

Las validaciones locales se muestran junto al campo correspondiente. Los errores de
acciones enviados por la API se presentan en un diálogo accesible y contextual; los
errores al cargar una pantalla conservan su estado con opción de reintento. Una
respuesta `401` mantiene el flujo global de sesión expirada.
