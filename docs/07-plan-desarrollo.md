# Estado de implementación del frontend

## Respaldos

La ruta `/backups`, protegida por `respaldos.ver`, muestra historial y filtros.
`respaldos.crear` habilita creación manual, `respaldos.ver` descarga y
`respaldos.restaurar` el modal que exige `RESTAURAR`. Al finalizar, la rotación del
epoch provoca el flujo global existente de `401` y nuevo inicio de sesión.

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
Antes de iniciar una preparación, la interfaz consulta el estado operativo mínimo
de Ventas. Cuando el control está activo y falta una caja abierta, muestra una
indicación preventiva y ofrece acceso a Caja únicamente con `caja.abrir`; la
confirmación del backend continúa siendo la autoridad final.

## Caja

Las rutas `/cash` y `/cash/:id` permiten administrar la caja propia: apertura,
ingresos y egresos manuales, movimientos de ventas y anulaciones, cierre e
historial. El monto esperado mostrado durante el turno es una ayuda calculada con
movimientos reales; el backend conserva la autoridad sobre el cierre y diferencia.

## Inventario

La ruta `/inventory`, protegida por `inventario.ver`, reúne existencias, productos
con stock bajo y movimientos paginados. Los listados consumen los filtros reales
del backend y representan cantidades según la unidad permita o no decimales.

Los usuarios con `inventario.ajustar` pueden registrar entradas y salidas mediante
un formulario modal con motivo obligatorio, vista previa y validaciones locales de
cantidad. El backend conserva la autoridad sobre existencia, producto activo y
registro transaccional. Los ajustes no modifican el costo promedio.

## Usuarios, roles y permisos

La ruta `/users`, protegida por `usuarios.ver`, ofrece búsqueda, filtros remotos,
paginación y consulta del estado de acceso. Según permisos permite crear, editar,
activar o desactivar usuarios y reemplazar su único rol. La contraseña inicial se
valida y envía únicamente durante la creación; no se persiste en el frontend.

La ruta `/roles`, protegida por `roles.ver`, consulta roles y el catálogo completo
de permisos agrupado por módulo. `roles.administrar` habilita el reemplazo completo
de permisos únicamente para los roles que el backend declara editables. No se
inventan operaciones de creación, edición, estado o eliminación de roles/permisos.

## Configuración general

La ruta `/settings`, protegida por `configuracion.ver`, presenta los parámetros
reales agrupados en General, Fiscal, Caja y Comprobantes. `configuracion.editar`
habilita cambios individuales mediante `PUT /settings/:key`; `descuento_maximo` es
el porcentaje máximo configurable por línea de venta y
`siguiente_numero_comprobante` permanece en solo lectura. Los
cambios operativos sensibles requieren confirmación y el backend conserva las
validaciones y reglas definitivas.

## Bitácora

La ruta `/audit`, protegida por `bitacora.ver`, ofrece consulta paginada, filtros
admitidos por la API y detalle de cada evento con sus datos anteriores y nuevos
sanitizados por el backend. Es una pantalla estrictamente de lectura y no incorpora
acciones de creación, edición ni eliminación.

## Manejo de errores del frontend

Las validaciones locales se muestran junto al campo correspondiente. Los errores de
acciones enviados por la API se presentan en un diálogo accesible y contextual; los
errores al cargar una pantalla conservan su estado con opción de reintento. Una
respuesta `401` mantiene el flujo global de sesión expirada.

## Dashboard y reportes

La ruta `/dashboard` muestra una bienvenida y accesos autorizados con `dashboard.ver`.
Los indicadores diarios, las ventas recientes y los tres gráficos agregados requieren
`dashboard.graficos`; estos últimos admiten período y vendedor. La ruta `/reports`, protegida por `reportes.ver`,
ofrece los ocho reportes aprobados con filtros y paginación remotos. Los usuarios con
`reportes.exportar` pueden descargar el conjunto filtrado completo como XLSX generado
por el backend; la exportación se limita a 10 000 filas y conserva las mismas columnas
y reglas que la consulta JSON.
En la experiencia básica, quienes poseen `ventas.crear` reciben el estado operativo
de su propia caja. La advertencia y los accesos rápidos se adaptan sin mostrar
indicadores financieros ni configuraciones administrativas.
