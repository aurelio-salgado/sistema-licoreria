# Arquitectura de LIQUORIX

## 1. Visión general

LIQUORIX es una aplicación web de una sola sucursal organizada en tres niveles:

- un frontend construido con React y Vite;
- una API REST construida con Node.js y Express;
- una base de datos MariaDB/MySQL accedida mediante `mysql2`.

El navegador no accede directamente a MariaDB. Las pantallas consumen la API bajo
`/api/v1`, normalmente mediante JSON. Las descargas XLSX, los respaldos SQL y las
imágenes controladas son las excepciones binarias expresamente definidas por sus
endpoints.

```text
React
  -> API REST
  -> routes
  -> middleware
  -> controller
  -> service
  -> repository
  -> MariaDB
```

[DIAGRAMA PENDIENTE: diagrama de componentes que muestre navegador React, API Express, almacenamiento privado de imágenes y respaldos, procesos mysql/mysqldump y MariaDB, indicando que solo Express accede a la base y a los archivos privados]

## 2. Responsabilidad de las capas del backend

- **Routes:** declaran método y URI, instalan autenticación y permiso requerido y delegan al controlador. Las rutas públicas se mantienen explícitamente separadas.
- **Middleware:** autentica JWT, aplica permisos efectivos, controla mantenimiento, procesa JSON o multipart y dirige errores al manejador central.
- **Controllers:** reciben datos HTTP, invocan validaciones o servicios y producen la respuesta HTTP. No contienen consultas SQL ni cálculos definitivos de negocio.
- **Services:** aplican reglas de negocio y coordinan repositorios, cálculos, transacciones, archivos y bitácora.
- **Repositories:** encapsulan consultas SQL parametrizadas y reciben el pool o la conexión transaccional correspondiente.
- **Validations:** aceptan únicamente parámetros y campos aprobados, normalizan valores y generan errores de cliente antes de mutar datos.

`src/app.js` compone middlewares y módulos; `src/server.js` inicia el servicio. La configuración de entorno y el pool se concentran en `src/config`. Los errores de rutas inexistentes y los errores de aplicación terminan en middlewares centrales, que evitan entregar SQL o detalles internos al cliente.

[DIAGRAMA PENDIENTE: diagrama de secuencia de una mutación autenticada desde una página React hasta route, authenticate, requirePermission, controller, service, repository, transacción MariaDB, bitácora y respuesta JSON]

## 3. Estructura modular del backend

`backend/src/modules` contiene módulos para `access`, `audit`, `auth`, `backups`, `brands`, `cash`, `categories`, `clients`, `dashboard`, `health`, `inventory`, `products`, `publicCatalog`, `purchases`, `reports`, `sales`, `settings`, `suppliers`, `units` y `users`. Cada módulo usa solamente las capas que necesita, pero conserva la separación entre transporte, negocio y persistencia.

Los servicios compartidos incluyen el coordinador de operaciones y mantenimiento y el servicio `sessionEpoch`. Las tablas relacionadas se describen en `docs/03-modelo-datos.md`; a nivel general:

- seguridad usa `usuarios`, `roles`, `permisos`, `usuario_roles` y `rol_permisos`;
- catálogos y directorios usan categorías, marcas, unidades, productos, clientes y proveedores;
- compras y ventas conservan encabezados y detalles históricos;
- inventario y caja conservan movimientos y referencias a sus operaciones;
- configuración, bitácora y respaldos soportan administración y trazabilidad.

## 4. Persistencia, pool y transacciones

El acceso a MariaDB utiliza un pool `mysql2`. Las consultas reciben valores como parámetros; los filtros dinámicos se construyen desde listas cerradas y no mediante fragmentos arbitrarios enviados por el cliente.

Las operaciones de compra, venta, anulación, ajuste, cierre de caja, cambios críticos y restauración coordinan una conexión transaccional. El servicio inicia la transacción, bloquea o relee los registros necesarios, aplica todas las mutaciones y la bitácora y ejecuta `COMMIT` únicamente cuando el conjunto termina correctamente. Ante un error ejecuta `ROLLBACK` y libera la conexión en el bloque de finalización. Los cálculos definitivos de precios, descuentos, impuestos, existencias, costo promedio, caja y totales se realizan en el backend.

## 5. Organización del frontend

El frontend se distribuye por responsabilidad:

- `api/`: cliente HTTP central y funciones por módulo;
- `auth/`: contexto de autenticación y permisos;
- `routes/`: rutas públicas, autenticadas y protegidas por permiso;
- `layout/`: estructuras visuales pública y administrativa;
- `pages/`: pantallas asociadas a rutas;
- `components/`: formularios, tablas y piezas reutilizables;
- `utils/`: formato, almacenamiento de sesión y reglas auxiliares comprobables.

`App.jsx` declara las rutas. `ProtectedRoute` exige una sesión restaurada y `PermissionRoute` controla la visibilidad y navegación según los permisos recibidos. Esta protección mejora la experiencia, pero la autorización definitiva permanece en el backend.

Las llamadas pasan por `api/client.js`, que centraliza URL base, JSON, header `Authorization`, errores de red, descargas y respuestas no autorizadas. Las páginas muestran estados de carga, vacío, error y reintento; los formularios realizan una validación inmediata sin sustituir la validación del servidor.

## 6. Autenticación, sesión y autorización

El login compara la contraseña mediante bcrypt y emite un JWT con expiración. El token identifica al usuario, pero el backend no confía en roles o permisos enviados por el navegador ni en permisos históricos del token: `authenticate` verifica la firma, expiración y `session_epoch`, consulta al usuario vigente y reconstruye su identidad. `requirePermission` verifica el permiso efectivo en MariaDB, incluyendo el estado actual de usuario y rol. Por ello los cambios administrativos se reflejan en solicitudes posteriores sin exigir que el JWT transporte la autorización.

El frontend guarda la sesión actual en `localStorage` bajo una clave versionada. Al arrancar, recupera el token y llama `GET /auth/me`; solo conserva la sesión si el backend la revalida y actualiza roles y permisos con la identidad vigente. El evento `storage` sincroniza login o eliminación de sesión entre pestañas. Una respuesta global `401` elimina la sesión local y redirige a login. El logout llama al backend; si existe caja abierta, la regla de negocio impide cerrar la sesión voluntariamente.

`jwt_session_epoch` es un UUID persistido en `configuracion`, fuera de las listas públicas y editables de Settings. Login lo incorpora como claim `session_epoch` y autenticación lo compara con el valor actual. Rotarlo invalida todos los JWT anteriores sin publicar su valor.

## 7. Validaciones y errores

Las validaciones backend usan listas cerradas de campos, filtros, estados y rangos. Los repositorios vuelven a comprobar datos de persistencia relevantes, como estado activo, existencias y propiedad. Los errores se expresan mediante respuestas JSON consistentes y códigos HTTP; el manejador central oculta stack traces, consultas y errores internos. La bitácora sanea datos sensibles antes de exponerlos.

Helmet instala cabeceras defensivas, CORS usa el origen configurado y Morgan registra solicitudes según el entorno. Contraseñas, secretos, tokens, UUID del epoch y rutas privadas no deben aparecer en respuestas, bitácoras ni documentación de evidencia.

## 8. Imágenes y catálogo público

Las imágenes de productos se almacenan en `storage/products` y los logos en `storage/brands`; no se sirven esas carpetas como contenido estático. Los endpoints administrativos usan Multer con memoria, un archivo, máximo 2 MB y sin campos de texto. El servicio valida MIME y firma JPEG, PNG o WebP, genera una referencia UUID y actualiza referencia y bitácora transaccionalmente. Un reemplazo elimina el archivo anterior después del `COMMIT`; un fallo limpia el archivo nuevo.

`modules/publicCatalog` mantiene proyección, filtros y rutas propias sin JWT. Solo expone productos activos, precio, categoría, marca, imagen y disponibilidad booleana; no entrega costos, existencias exactas, proveedores ni datos administrativos. Las rutas de imagen validan UUID, extensión, resolución dentro del storage, archivo regular, tamaño y firma antes de responder con headers controlados. `/` utiliza un layout público y `/catalog` es un alias que redirige a la raíz.

## 9. Reportes

El módulo `reports` acepta ocho tipos cerrados y filtros validados. Los repositorios calculan resultados desde operaciones vigentes y costos históricos. La exportación XLSX reutiliza filtros, consulta y columnas del reporte JSON, ignora la paginación visual, limita el conjunto a 10 000 filas y neutraliza textos que podrían convertirse en fórmulas de hoja de cálculo.

## 10. Respaldos, mantenimiento y recuperación

`modules/backups` separa rutas, controlador, servicio, repositorio, validación y procesos externos. Los ejecutables y el almacenamiento son configuración privada. Los procesos usan `shell:false`, argumentos separados y un archivo temporal de opciones eliminado en `finally`.

Un coordinador en memoria impide comenzar una restauración si existen mutaciones incompatibles y, durante el import, activa mantenimiento con una lista explícita limitada al preflight CORS. Esta decisión corresponde al despliegue actual de una sola instancia Node. El pool se expone mediante una fachada que puede renovarse después del import.

Los respaldos usan `mysqldump --databases` después de validar `DB_NAME`, generan SQL autocontenido con `CREATE DATABASE IF NOT EXISTS` y `USE`, y nunca ejecutan `DROP DATABASE`. El SHA-256 se calcula sobre el archivo final. Una restauración válida crea primero un respaldo preventivo, importa, renueva el pool, verifica tablas esenciales y rota el epoch antes de salir correctamente de mantenimiento.

La inicialización ejecuta `npm --prefix backend run init-session-epoch`, que crea el epoch si falta y conserva uno existente. La recuperación manual utiliza `rotate-session-epoch`, rechaza argumentos, ejecuta rotación transaccional y no imprime el UUID. El procedimiento completo y el ensayo obligatorio en base temporal se encuentran en `docs/09-recuperacion-desastres.md`.

## 11. Decisiones de seguridad relevantes

- contraseñas almacenadas únicamente como hash bcrypt;
- JWT con expiración y epoch global revocable;
- autorización basada en permisos efectivos consultados por el backend;
- bloqueo temporal por intentos fallidos;
- consultas parametrizadas y validaciones de entrada;
- transacciones para preservar consistencia e historial;
- prohibición de inventario negativo;
- archivos privados fuera de carpetas públicas;
- cargas con tipo, firma, tamaño y nombre controlados;
- CORS, Helmet, errores centralizados y saneamiento de bitácora;
- secretos y credenciales obtenidos de variables de entorno.
