# Estado final de implementación de LIQUORIX

Este documento resume el estado observable del repositorio al cierre del desarrollo. No sustituye los requerimientos, las reglas de negocio ni la documentación técnica detallada.

## Convenciones

- `[x]` Implementado: existe evidencia en código, esquema, pruebas o documentación operativa.
- `[~]` Validación manual final: la implementación existe, pero debe comprobarse en el entorno de demostración.
- `[ ]` Mejora futura no bloqueante: no forma parte de los requisitos pendientes del examen.

## Implementado

### Infraestructura y persistencia

- [x] Frontend React con Vite y rutas públicas y protegidas.
- [x] Backend Node.js con Express y API REST bajo `/api/v1`.
- [x] Organización modular por rutas, controladores, servicios, repositorios y validaciones.
- [x] Pool MariaDB/MySQL mediante `mysql2`, errores centralizados y endpoint de salud.
- [x] Helmet, CORS controlado, variables de entorno y logging HTTP.
- [x] Esquema InnoDB/`utf8mb4` con PK, FK, restricciones, índices y valores `DECIMAL`.
- [x] Seed de roles, permisos, métodos de pago, configuración y Consumidor final.
- [x] Scripts `demo-reset.sql` y `demo-sales.sql` con preflight, transacción y validaciones finales.

### Autenticación, usuarios y permisos

- [x] Login con bcrypt, JWT con expiración y `session_epoch` persistente.
- [x] Intentos fallidos, bloqueo temporal y validación del usuario vigente en cada solicitud.
- [x] Logout validado por backend, bloqueo con caja abierta, restauración de sesión y manejo global de `401`.
- [x] Usuarios: creación, consulta, edición, estado lógico y asignación de rol.
- [x] Roles Administrador, Vendedor y Consulta, catálogo de permisos y asignación a roles.
- [x] Autorización autoritativa en backend y visibilidad frontend basada en permisos.

### Catálogos, productos y directorios

- [x] Categorías, marcas y unidades: listado, búsqueda, creación, edición y estado lógico.
- [x] Logos de marcas: carga, firma/MIME/tamaño, reemplazo, eliminación y lectura controlada.
- [x] Productos: búsqueda, filtros, paginación, precios, costo, mínimo y estado lógico.
- [x] Existencia fuera del CRUD de productos y costo promedio protegido con inventario.
- [x] Imágenes de productos con referencia segura, validación, reemplazo y eliminación.
- [x] Clientes y proveedores con CRUD lógico, filtros, validaciones y paginación.
- [x] Consumidor final protegido contra modificación y desactivación.

### Compras e inventario

- [x] Compras en borrador con encabezado y líneas editables.
- [x] Totales definitivos calculados en backend.
- [x] Confirmación transaccional, aumento de existencia y costo promedio ponderado.
- [x] Anulación controlada y reversión segura de inventario.
- [x] Existencias, inventario bajo y movimientos consultables.
- [x] Ajustes positivos y negativos con motivo, usuario y trazabilidad.
- [x] Prevención de inventario negativo y referencias de movimientos.

### Ventas, pagos, facturación y caja

- [x] Preparación de ventas con cliente y detalle editable.
- [x] Validación backend de existencia, unidades, descuentos, impuestos y configuración.
- [x] Pagos en efectivo, tarjeta, transferencia y combinados; monto recibido y cambio.
- [x] Confirmación transaccional de venta, pagos, inventario, caja y bitácora.
- [x] Costo histórico, factura numerada y comprobante imprimible.
- [x] Consulta y anulación con restauración de inventario y compensación de efectivo.
- [x] Alcance propio de ventas por defecto y supervisión global mediante permiso independiente.
- [x] Apertura de caja, una caja abierta por usuario, ingresos y egresos.
- [x] Movimientos de ventas/anulaciones, monto esperado, conteo, cierre y diferencia.
- [x] Supervisión administrativa de cierres por responsable, fecha y resultado mediante permiso independiente.
- [x] Integración con `control_caja_activo` y estado operativo de ventas.

### Dashboard, reportes y bitácora

- [x] Dashboard básico según permisos, indicadores diarios y ventas recientes.
- [x] Tres gráficos con filtros por período y vendedor.
- [x] Ocho reportes: ventas por fechas, detalle de ventas, compras por proveedor, inventario, stock bajo, más vendidos, ventas por vendedor y utilidad bruta.
- [x] Filtros parametrizados, paginación y agregados que excluyen anulaciones por defecto.
- [x] Exportación XLSX hasta 10 000 filas y prevención de formula injection.
- [x] Bitácora de solo lectura con filtros, entidad, usuario, IP, resultado y datos saneados.

### Configuración, respaldos y catálogo público

- [x] Settings con whitelist visible/editable y validación de claves autorizadas.
- [x] `jwt_session_epoch` oculto y no editable desde Settings.
- [x] Creación, consulta y descarga controlada de respaldos privados.
- [x] SHA-256, retención, preflight, respaldo preventivo y restauración con mantenimiento.
- [x] Invalidación global de sesiones y recuperación manual documentada.
- [x] Catálogo público sin JWT con búsqueda, categorías, marcas, paginación e imágenes.
- [x] Proyección sin costos, existencias exactas, proveedores ni datos administrativos.
- [x] Placeholder, navegación pública, diseño adaptable y headers de imagen controlados.

### Pruebas y documentación

- [x] Pruebas backend de autenticación, permisos, sesión, imágenes, catálogo público, compras, inventario, ventas, caja, dashboard, reportes y respaldos.
- [x] Pruebas frontend de utilidades críticas existentes.
- [x] Scripts de check, lint y build.
- [x] Requerimientos, reglas, modelo de datos, API, arquitectura, estándares, implementación, pruebas y recuperación documentados.
- [x] README de preparación, configuración y ejecución.

## Validación manual final

- [~] Comparar la base de defensa con `database/schema.sql`, incluidas `marcas.imagen_referencia`, `productos.imagen_referencia`, `respaldos` y `jwt_session_epoch`.
- [~] Crear una base temporal desde `schema.sql` y `seed.sql` y comprobar FK y restricciones.
- [~] Ejecutar los scripts demo en una base temporal y conservar sus resultados finales.
- [~] Probar Administrador, Vendedor y Consulta con la matriz real de permisos.
- [~] Ensayar compra, ajuste, caja, venta, pago combinado, anulación y cierre.
- [~] Abrir una exportación XLSX real y revisar el comprobante impreso.
- [~] Revisar `/` (catálogo público) y pantallas administrativas en 360, 480, 768 px y escritorio, con teclado y foco visible.
- [~] Ensayar respaldo/restauración solo contra una base temporal siguiendo `docs/09-recuperacion-desastres.md`.
- [~] Confirmar que un JWT previo es rechazado después de restaurar o rotar el epoch.
- [~] Preparar capturas, dataset estable, respaldo ensayado y guion de demostración.

## Mejoras futuras / no bloqueantes

- [ ] Ampliar pruebas automatizadas de interfaz y flujos integrados con una base temporal.
- [ ] Incorporar limitación global o por IP adicional al bloqueo por cuenta.
- [ ] Optimizar recursos gráficos y bundles si el despliegue lo requiere.
- [ ] Evaluar una versión explícita del esquema y verificaciones posrestauración más extensas.
- [ ] Evaluar la columna reservada `configuracion.imagen_referencia`; actualmente no participa en Settings.

## Trazabilidad académica resumida

| Requisito | Evidencia principal |
|---|---|
| Autenticación y sesiones | Módulo `auth`, `authenticate` y servicio `sessionEpoch` |
| Roles y permisos | Módulo `access`, `requirePermission` y rutas protegidas frontend |
| Usuarios | Módulo `users` |
| Catálogos y productos | Módulos `categories`, `brands`, `units` y `products` |
| Clientes y proveedores | Módulos `clients` y `suppliers` |
| Compras | Módulo `purchases` |
| Inventario y ajustes | Módulo `inventory` |
| Ventas, pagos y facturación | Módulo `sales` |
| Caja | Módulo `cash` |
| Dashboard | Módulo `dashboard` |
| Ocho reportes y XLSX | Módulo `reports` |
| Bitácora | Módulo `audit` |
| Configuración | Módulo `settings` |
| Respaldos y recuperación | Módulo `backups`, `sessionEpoch` y guía de recuperación |
| Catálogo público | Módulo `publicCatalog` y ruta `/` (`/catalog` como alias) |
| Persistencia y demo | `schema.sql`, `seed.sql`, `demo-reset.sql` y `demo-sales.sql` |
| Pruebas | Archivos `*.test.js` y `docs/08-pruebas.md` |
