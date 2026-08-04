# Plan de tareas del proyecto

## Sprint 0 — Preparación y documentación

- [x] Instalar Node.js y npm.
- [x] Verificar MariaDB/MySQL de XAMPP.
- [x] Crear la estructura principal del proyecto.
- [x] Crear frontend con React y Vite.
- [x] Ejecutar el frontend correctamente.
- [x] Crear `AGENTS.md`.
- [x] Crear `PROJECT_CONTEXT.md`.
- [ ] Crear `TASKS.md`.
- [ ] Crear `README.md`.
- [ ] Crear `.gitignore`.
- [ ] Crear documentos base en `docs/`.
- [ ] Inicializar Git.
- [ ] Crear el primer commit.
- [ ] Ejecutar el primer análisis con Codex.

## Sprint 1 — Infraestructura del backend

- [ ] Inicializar proyecto Node.js en `backend`.
- [ ] Instalar Express.
- [ ] Instalar mysql2.
- [ ] Instalar dotenv.
- [ ] Instalar Helmet.
- [ ] Instalar CORS.
- [ ] Instalar Morgan o un sistema de logging.
- [ ] Configurar nodemon.
- [ ] Crear estructura modular.
- [ ] Crear archivo `app.js`.
- [ ] Crear archivo `server.js`.
- [ ] Crear manejo centralizado de errores.
- [ ] Crear endpoint `GET /api/v1/health`.
- [ ] Crear archivo `.env.example`.
- [ ] Crear conexión con MariaDB/MySQL.
- [ ] Probar comunicación entre frontend y backend.

## Sprint 2 — Base de datos

- [ ] Crear base de datos `sistema_licoreria`.
- [ ] Crear usuario limitado para la aplicación.
- [ ] Definir tablas definitivas.
- [ ] Crear `database/schema.sql`.
- [ ] Crear `database/seed.sql`.
- [ ] Crear claves primarias.
- [ ] Crear claves foráneas.
- [ ] Crear restricciones únicas.
- [ ] Crear índices.
- [ ] Crear roles iniciales.
- [ ] Crear permisos iniciales.
- [ ] Crear métodos de pago iniciales.
- [ ] Crear cliente “Consumidor final”.
- [ ] Probar creación completa de la base de datos.
- [ ] Documentar el modelo relacional.

## Sprint 3 — Autenticación

- [ ] Crear tabla y datos iniciales de usuarios.
- [ ] Crear hash de contraseñas con bcrypt.
- [ ] Implementar inicio de sesión.
- [ ] Implementar JWT.
- [ ] Implementar expiración de sesión.
- [ ] Implementar cierre de sesión.
- [ ] Implementar bloqueo temporal por intentos fallidos.
- [ ] Crear middleware de autenticación.
- [ ] Crear validaciones de credenciales.
- [ ] Crear interfaz de login.
- [ ] Probar accesos válidos e inválidos.

## Sprint 4 — Usuarios, roles y permisos

- [ ] CRUD de usuarios.
- [ ] Desactivación lógica de usuarios.
- [ ] Gestión de roles.
- [ ] Gestión de permisos.
- [ ] Asignación de roles.
- [ ] Asignación de permisos.
- [ ] Middleware de autorización.
- [ ] Protección de endpoints.
- [ ] Protección de rutas del frontend.
- [ ] Pruebas con Administrador.
- [ ] Pruebas con Vendedor.
- [ ] Pruebas con Consulta.

## Sprint 5 — Catálogos

### Categorías

- [ ] Listar categorías.
- [ ] Crear categoría.
- [ ] Editar categoría.
- [ ] Desactivar categoría.
- [ ] Validar nombre único.

### Marcas

- [ ] Listar marcas.
- [ ] Crear marca.
- [ ] Editar marca.
- [ ] Desactivar marca.

### Unidades de medida

- [ ] Listar unidades.
- [ ] Crear unidad.
- [ ] Editar unidad.
- [ ] Desactivar unidad.

### Productos

- [ ] Listar productos.
- [ ] Crear producto.
- [ ] Editar producto.
- [ ] Desactivar producto.
- [ ] Buscar por nombre.
- [ ] Buscar por código.
- [ ] Buscar por código de barras.
- [ ] Filtrar por categoría.
- [ ] Filtrar por marca.
- [ ] Implementar paginación.
- [ ] Validar precio.
- [ ] Validar costo.
- [ ] Validar existencia mínima.
- [ ] Impedir modificación directa de existencias.

### Clientes

- [ ] Listar clientes.
- [ ] Crear cliente.
- [ ] Editar cliente.
- [ ] Desactivar cliente.
- [ ] Usar cliente “Consumidor final”.

### Proveedores

- [ ] Listar proveedores.
- [ ] Crear proveedor.
- [ ] Editar proveedor.
- [ ] Desactivar proveedor.

## Sprint 6 — Compras e inventario

### Compras

- [ ] Crear compra en borrador.
- [ ] Agregar productos a la compra.
- [ ] Calcular subtotal.
- [ ] Calcular descuento.
- [ ] Calcular impuesto.
- [ ] Calcular total.
- [ ] Confirmar compra.
- [ ] Aumentar existencias.
- [ ] Registrar movimientos de inventario.
- [ ] Usar transacción de base de datos.
- [ ] Consultar compras.
- [ ] Filtrar compras por fecha.
- [ ] Filtrar compras por proveedor.
- [ ] Anular compra de forma controlada.

### Inventario

- [ ] Consultar existencias.
- [ ] Consultar movimientos.
- [ ] Registrar ajuste positivo.
- [ ] Registrar ajuste negativo.
- [ ] Solicitar motivo del ajuste.
- [ ] Impedir existencias negativas.
- [ ] Mostrar productos con inventario bajo.
- [ ] Validar consistencia de existencias.

## Sprint 7 — Ventas y facturación

- [ ] Crear punto de venta.
- [ ] Buscar productos.
- [ ] Agregar productos al carrito.
- [ ] Validar existencias.
- [ ] Calcular descuentos.
- [ ] Calcular impuestos.
- [ ] Calcular total en backend.
- [ ] Registrar método de pago.
- [ ] Registrar pago combinado.
- [ ] Calcular cambio.
- [ ] Confirmar venta mediante transacción.
- [ ] Reducir inventario.
- [ ] Registrar movimientos de inventario.
- [ ] Guardar costo histórico.
- [ ] Generar número de factura.
- [ ] Generar comprobante imprimible.
- [ ] Consultar ventas.
- [ ] Filtrar ventas.
- [ ] Anular venta.
- [ ] Restaurar inventario al anular.
- [ ] Registrar motivo de anulación.

## Sprint 8 — Caja

- [ ] Abrir caja.
- [ ] Registrar monto inicial.
- [ ] Impedir dos cajas abiertas por usuario.
- [ ] Registrar ingresos.
- [ ] Registrar egresos.
- [ ] Registrar ventas en caja.
- [ ] Calcular monto esperado.
- [ ] Registrar monto contado.
- [ ] Calcular diferencia.
- [ ] Cerrar caja.
- [ ] Consultar historial de cajas.
- [ ] Generar reporte de cierre.

## Sprint 9 — Dashboard y reportes

### Dashboard

- [ ] Mostrar ventas del día.
- [ ] Mostrar número de ventas.
- [ ] Mostrar productos con inventario bajo.
- [ ] Mostrar productos más vendidos.
- [ ] Mostrar ventas recientes.
- [ ] Crear gráfico de ventas por período.
- [ ] Crear gráfico de productos más vendidos.
- [ ] Crear gráfico de ventas por categoría.

### Reportes

- [ ] Reporte de ventas por rango de fechas.
- [ ] Reporte maestro-detalle de ventas.
- [ ] Reporte de compras por proveedor.
- [ ] Reporte de inventario actual.
- [ ] Reporte de productos con inventario bajo.
- [ ] Reporte de productos más vendidos.
- [ ] Reporte de ventas por vendedor.
- [ ] Reporte de utilidad bruta estimada.
- [ ] Exportar reportes a Excel.
- [ ] Implementar filtros parametrizados.

## Sprint 10 — Bitácora y respaldos

### Bitácora

- [ ] Registrar inicio de sesión.
- [ ] Registrar intentos fallidos.
- [ ] Registrar creación y modificación de usuarios.
- [ ] Registrar cambios de precios.
- [ ] Registrar ajustes de inventario.
- [ ] Registrar anulaciones.
- [ ] Registrar respaldos.
- [ ] Registrar restauraciones.
- [ ] Crear interfaz de consulta.

### Respaldos

- [ ] Crear respaldo desde el backend.
- [ ] Guardar respaldo fuera de carpetas públicas.
- [ ] Registrar información del respaldo.
- [ ] Validar permisos.
- [ ] Crear restauración controlada.
- [ ] Crear respaldo previo a una restauración.
- [ ] Registrar resultado de restauración.
- [ ] Probar recuperación de la base.

## Sprint 11 — Pruebas y calidad

- [ ] Pruebas de autenticación.
- [ ] Pruebas de autorización.
- [ ] Pruebas de validación.
- [ ] Pruebas de CRUD.
- [ ] Pruebas de compras.
- [ ] Pruebas de ventas.
- [ ] Pruebas de inventario.
- [ ] Pruebas de caja.
- [ ] Pruebas de reportes.
- [ ] Pruebas de respaldos.
- [ ] Pruebas de transacciones.
- [ ] Revisión de consultas parametrizadas.
- [ ] Revisión de exposición de secretos.
- [ ] Revisión de mensajes de error.
- [ ] Revisión de dependencias.

## Sprint 12 — Documentación y entrega

- [ ] Completar README.
- [ ] Manual técnico.
- [ ] Manual de usuario.
- [ ] Diccionario de datos.
- [ ] Documentación de la API.
- [ ] Diagrama entidad-relación.
- [ ] Diagrama de arquitectura.
- [ ] Evidencias de pruebas.
- [ ] Guía de instalación.
- [ ] Guía de respaldo y restauración.
- [ ] Preparar datos de demostración.
- [ ] Preparar presentación final.
- [ ] Revisar proyecto completo.