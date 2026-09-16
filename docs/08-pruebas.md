# Estrategia y estado de pruebas de LIQUORIX

## 1. Estado verificado

La ejecución verificada de `npm --prefix backend test` finaliza con **211 pruebas backend aprobadas, 0 fallidas**, distribuidas en **32 archivos de pruebas backend**. Esta cifra corresponde exclusivamente al backend y no representa el total de pruebas manuales, frontend o integradas del sistema.

La suite usa `node:test`, dobles de prueba y dependencias controladas. No se conecta a una instancia real de MariaDB durante la ejecución ordinaria.

Existen cuatro archivos de pruebas de utilidades frontend (`dashboardAccess`, `inventorySearch`, `productSearch` y `salesDiscount`), pero `frontend/package.json` no define un script oficial `test`; por ello no forman parte del resultado oficial de 211 pruebas.

## 2. Comandos de verificación

```text
npm --prefix backend run check
npm --prefix backend test
npm --prefix frontend run lint
npm --prefix frontend run build
git diff --check
```

- `backend check` ejecuta `node --check` únicamente sobre `src/app.js` y `src/server.js`: es una comprobación sintáctica limitada, no lint completo.
- No existe un script oficial `backend lint`.
- `backend test` ejecuta la suite oficial backend con `node:test`.
- `frontend lint` ejecuta Oxlint.
- `frontend build` genera y valida el bundle de producción con Vite.
- No existe un script oficial `frontend test`.
- `git diff --check` comprueba marcadores de conflicto y errores de espacios en el diff. Si Git rechaza el repositorio por propiedad dudosa, se usa una excepción temporal por comando, sin cambiar la configuración global.

## 3. Matriz de cobertura automatizada backend

| Área | Evidencia principal | Cobertura observable |
| --- | --- | --- |
| Login | `auth.service.test.js`, `auth.routes.test.js` | Credenciales válidas e inválidas, usuario inexistente o inactivo, bloqueo, validación de campos, JWT y respuesta sin credenciales. |
| Logout | `auth.logout.test.js` | Usuario autenticado, caja abierta, caja cerrada, identidad obtenida del request y middleware requerido. |
| `authenticate` | `authenticate.test.js` | Header Bearer, token inválido o expirado, usuario vigente, bloqueo, identidad reconstruida y epoch. |
| Permisos efectivos | `requirePermission.test.js` | Usuario/rol activo, permiso vigente, rechazo de datos controlados por cliente y cambios sin depender del JWT. |
| `session_epoch` | `sessionEpoch.test.js`, `rotate-session-epoch.test.js` | Inicialización idempotente, rotación, verificación, rollback, cierre del pool y no exposición del UUID. |
| Mantenimiento | `operationCoordinator.test.js`, pruebas de backups | Exclusión de mutaciones, whitelist y conservación del mantenimiento ante fallo crítico. |
| Búsquedas | `catalog-search.repository.test.js` | Campos de búsqueda autorizados para categorías, marcas, unidades y productos. |
| Marcas y logos | `brand.image.test.js` | Rutas, permiso, multipart y reutilización del almacenamiento seguro. |
| Imágenes de productos | `product.image.test.js`, `product.routes.test.js` | Firma/MIME, 2 MB, UUID, traversal, multipart, reemplazo, eliminación, rollback y limpieza. |
| Productos | `product.service.test.js` | Costo inicial, precisión, costo protegido con existencia, edición, transacción y bitácora. |
| Catálogo público | `publicCatalog.test.js` | Acceso sin JWT, proyección cerrada, disponibilidad, filtros, paginación, imágenes y logos controlados. |
| Compras | `purchase.service.test.js` | Borrador, líneas, cálculos, confirmación, costo promedio, movimientos, anulaciones y rollback. |
| Inventario | `inventory.service.test.js` | Consultas, ajustes, unidades, no negatividad, referencias, bitácora y rollback. |
| Ventas | `sale.service.test.js`, `sale.access.test.js` | Preparación, lectura de pagos, estado operativo, confirmación y alcance propio/global. |
| Pagos | `sale.service.test.js` | Métodos activos, pagos históricos, efectivo, pagos combinados, monto recibido y cambio. |
| Descuentos | `sale.service.test.js`, `setting.validation.test.js` | Límite `descuento_maximo`, frontera permitida y rechazo de manipulación. |
| Alcance de ventas | `sale.access.test.js` | Ventas propias por defecto, filtro protegido y supervisión mediante `ventas.supervisar`. |
| Anulación de ventas | `sale.service.test.js` | Inventario, pagos históricos, compensación de efectivo, caja del anulador, idempotencia y rollback. |
| Caja | `cash.service.test.js` | Apertura, propiedad, movimientos, esperado, cierre, diferencia, conflictos y rollback. |
| Supervisión de caja | `cash.supervision.test.js` | Filtros, cierres ajenos, responsable, resultados y permiso `caja.supervisar`. |
| Dashboard | `dashboard.validation.test.js`, `dashboard.routes.test.js` | Permiso, períodos, vendedor, indicadores y exclusión de anuladas. |
| Reportes | pruebas `report.*.test.js` | Ocho tipos, filtros, permisos, agregados, costo histórico, paginación y límite. |
| XLSX | `report.exporter.test.js`, demás pruebas de reportes | Archivo válido, columnas, formatos, totales, headers y prevención de formula injection. |
| Configuración crítica | `setting.validation.test.js` | `descuento_maximo`, permiso de edición y exclusión de `jwt_session_epoch`. |
| Respaldos | `backup.process.test.js`, `backup.service.test.js`, `backup.validation.test.js` | Filtros, SHA-256, metadata, paths, modo autocontenido, locks, auditoría y validaciones. |
| Restauración simulada | `backup.service.test.js` | Respaldo preventivo, mantenimiento, import simulado, renovación, epoch, auditoría y fallos. |

## 4. Áreas sin archivo de prueba específico

No existe un archivo backend dedicado que pruebe integralmente:

- usuarios;
- roles y administración completa de permisos;
- categorías;
- unidades;
- clientes;
- proveedores;
- bitácora;
- health;
- configuración CORS;
- Helmet;
- manejador central de errores.

Tampoco existe una suite automatizada oficial para:

- navegación, formularios, componentes y páginas React;
- integración completa frontend-backend;
- operaciones contra una MariaDB temporal real.

Algunos comportamientos aparecen cubiertos indirectamente por pruebas de rutas, permisos, búsquedas, servicios que consumen esos catálogos o por las cuatro utilidades frontend existentes. Esta cobertura indirecta no equivale a una prueba específica del módulo completo.

## 5. Detalles de cobertura vigente

### Catálogo público e imágenes

Las pruebas backend verifican acceso sin middleware JWT, proyección cerrada, disponibilidad booleana, filtros, paginación y referencias de imagen controladas. La lectura cubre UUID, traversal, inexistencia, tamaño, firma y MIME sin usar MariaDB real. Productos y marcas cubren carga, reemplazo, eliminación, referencia pública y aislamiento del storage.

### Respaldos y restauración

Los procesos externos se sustituyen por stubs. Se cubren confirmación, SHA-256, metadata pública, path traversal, concurrencia, mantenimiento, emisión/comparación/rotación del epoch y no exposición en Settings. La generación comprueba `mysqldump --databases`, ausencia de `--add-drop-database`, nombre validado y checksum del SQL final.

Una recuperación real solo debe probarse manualmente contra una base temporal aislada. `rotate-session-epoch` se prueba con dobles: éxito, fallo, cierre del pool, rechazo de argumentos y ausencia del UUID. `sessionEpoch` cubre persistencia verificada, transacción, rollback e inicialización idempotente.

### Inventario y búsquedas frontend

La utilidad frontend de inventario filtra localmente por nombre, de forma parcial e insensible a mayúsculas y con recorte de espacios. Cubre resultado vacío y restauración al limpiar. Se usa sobre productos activos disponibles en ajustes y líneas de compra; ventas conserva búsqueda remota. Esta prueba existe en el repositorio, pero no forma parte de las 211 pruebas backend ni dispone de un comando frontend oficial.

## 6. Preparación controlada de datos de demostración

Los scripts de demostración no forman parte de la suite automatizada y **no deben ejecutarse sobre producción sin un ensayo previo y autorización expresa**. No contienen credenciales, pero operan sobre datos persistentes.

### `database/demo-reset.sql`

Prepara el dataset definitivo de demostración. Conserva y verifica elementos protegidos, incluido el Administrador esperado, el hash existente, roles, permisos, configuración, métodos de pago, `jwt_session_epoch` y metadata de respaldo identificada por el propio preflight. Limpia y reconstruye datos de demostración solamente si se cumplen las precondiciones incorporadas.

El script calcula huellas y conteos antes de mutar, valida el nombre de base autorizado, trabaja dentro de una transacción y concluye con verificaciones. Su decisión final debe ser `COMMIT`; si una condición requerida falla, debe producir `ROLLBACK`. No sustituye `schema.sql`, `seed.sql` ni la creación segura del administrador.

### `database/demo-sales.sql`

Agrega actividad comercial reproducible sobre el dataset ya preparado: vendedores, clientes, ventas distribuidas por fechas, distintos métodos de pago, descuentos, anulaciones y líneas de productos. Resuelve identificadores mediante claves naturales, consulta la configuración vigente y usa un plan temporal antes de insertar operaciones.

También contiene preflight, transacción y validaciones finales. Solo debe conservar los cambios cuando `decision_final` indique `COMMIT`; cualquier resultado distinto exige revisar la salida y descartar el intento.

### Orden y entorno recomendado

1. Crear o restaurar una copia aislada llamada `sistema_licoreria_restore_test`.
2. Aplicar y verificar `schema.sql` y `seed.sql` cuando corresponda.
3. Conservar una copia segura y confirmar que no se están usando credenciales en comandos o evidencias.
4. Ensayar primero una copia temporal de `demo-reset.sql` siguiendo las instrucciones internas para el nombre de base de prueba.
5. Revisar preflight, huellas protegidas, conteos y decisión final.
6. Ensayar después `demo-sales.sql` sobre el resultado anterior y revisar todas sus consultas finales.
7. Solo tras un ensayo satisfactorio, seguir el procedimiento aprobado para preparar el entorno de defensa.

Los scripts versionados contienen controles específicos del dataset esperado. No deben editarse de forma improvisada ni ejecutarse si el administrador, respaldo, epoch, catálogos o base objetivo no coinciden. Esta documentación no confirma que el ensayo manual haya sido realizado.

[CAPTURA PENDIENTE: salida final de demo-reset.sql en la base temporal mostrando preflight satisfactorio, validaciones protegidas y decision_final COMMIT, sin hashes, epoch ni credenciales visibles]

[CAPTURA PENDIENTE: salida final de demo-sales.sql en la base temporal mostrando conteos esperados y decision_final COMMIT]

## 7. Pruebas manuales y evidencia de aceptación

Los siguientes marcadores indican evidencia todavía necesaria; no afirman que la prueba ya fue ejecutada:

[CAPTURA PENDIENTE: ejecución completa de npm --prefix backend test mostrando 211 pruebas backend aprobadas y 0 fallidas]

[CAPTURA PENDIENTE: login válido, rechazo uniforme de credenciales y bloqueo temporal sin mostrar contraseñas ni tokens]

[CAPTURA PENDIENTE: matriz real de permisos para Administrador, Vendedor y Consulta]

[CAPTURA PENDIENTE: Vendedor consultando solo ventas propias y usuario con ventas.supervisar filtrando otro vendedor]

[CAPTURA PENDIENTE: compra en borrador y confirmada, con movimiento de inventario y costo promedio resultante]

[CAPTURA PENDIENTE: rechazo backend de una operación que produciría inventario negativo]

[CAPTURA PENDIENTE: venta con pago combinado, cambio y comprobante imprimible sin datos completos de tarjeta]

[CAPTURA PENDIENTE: anulación de venta con restauración de inventario y compensación exclusiva del efectivo]

[CAPTURA PENDIENTE: apertura, movimientos y cierre de caja mostrando esperado, contado y diferencia]

[CAPTURA PENDIENTE: supervisión de cajas cerradas filtrada por responsable y resultado faltante, sobrante o cuadrada]

[CAPTURA PENDIENTE: dashboard con indicadores y exactamente tres gráficos sobre un período conocido]

[CAPTURA PENDIENTE: los ocho tipos de reporte y un XLSX abierto con columnas, formatos y totales]

[CAPTURA PENDIENTE: bitácora de una acción crítica con datos sensibles saneados]

[CAPTURA PENDIENTE: catálogo público en anchos 360, 480, 768 y escritorio, incluyendo imagen, logo, placeholder, Disponible y Agotado]

[CAPTURA PENDIENTE: creación y descarga de respaldo con metadata y SHA-256, sin mostrar rutas privadas]

[CAPTURA PENDIENTE: restauración ensayada únicamente en sistema_licoreria_restore_test con respaldo preventivo y mantenimiento]

[CAPTURA PENDIENTE: JWT anterior rechazado con 401 después de rotar session_epoch, sin mostrar el JWT ni el UUID]

## 8. Criterio de cierre

La verificación automática se considera satisfactoria cuando los cinco comandos terminan correctamente. La aceptación final del examen requiere además conservar evidencia manual del entorno de demostración, contrastar la base con `schema.sql`, validar roles y flujos críticos y ensayar recuperación únicamente conforme a `docs/09-recuperacion-desastres.md`.
