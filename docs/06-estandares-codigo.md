# Estándares de código de LIQUORIX

## 1. Alcance

Este documento registra prácticas vigentes y observables. Cuando se indica una recomendación futura, no debe interpretarse como comportamiento ya implementado.

## 2. Convenciones de nombres y archivos

- Variables y funciones JavaScript usan `camelCase`.
- Componentes y páginas React usan `PascalCase` y extensión `.jsx`.
- Tablas y columnas SQL usan `snake_case` y nombres internos en español.
- Las rutas REST usan sustantivos plurales bajo `/api/v1`.
- Los módulos backend usan nombres funcionales en inglés y archivos con sufijos `.routes.js`, `.controller.js`, `.service.js`, `.repository.js` y `.validation.js`.
- Las pruebas se ubican junto a la unidad probada y terminan en `.test.js`.

## 3. Capas y módulos backend

Cada capa mantiene una responsabilidad principal:

- las rutas declaran contrato HTTP, autenticación, permiso y controlador;
- los controladores adaptan request/response y delegan la lógica;
- los servicios aplican reglas, cálculos y coordinación transaccional;
- los repositorios contienen SQL y acceso a persistencia;
- las validaciones aceptan únicamente entradas aprobadas;
- los middlewares resuelven preocupaciones transversales.

No se colocan consultas SQL en controladores ni cálculos definitivos de negocio en React. Los cambios deben limitarse al módulo relacionado y conservar contratos públicos salvo que el alcance autorice modificarlos.

## 4. API REST y respuestas

Los cuerpos ordinarios usan JSON. Las respuestas exitosas mantienen la forma general `{ "success": true, "data": ... }`; los errores usan un mensaje seguro y el código HTTP aplicable. Los listados paginados incluyen sus datos y un objeto de paginación. Los filtros desconocidos y los campos controlados por el servidor se rechazan.

Los endpoints de descarga e imagen son contratos binarios explícitos. No se exponen rutas físicas, SQL, stack traces ni mensajes originales de procesos externos.

## 5. Validación y manejo de errores

Toda entrada que pueda afectar comportamiento se valida en el backend: body, parámetros de ruta, query, estado, identificadores, fechas, cantidades y archivos. La validación frontend ofrece retroalimentación temprana, pero no constituye un control de seguridad.

Los errores asincrónicos se propagan al middleware central. Los servicios distinguen errores de validación, no autorizado, prohibido, no encontrado, conflicto y límites sin revelar detalles internos. Las mutaciones fallidas no deben dejar cambios parciales.

## 6. SQL, importes y transacciones

- Las consultas usan placeholders y parámetros de `mysql2`.
- Solo se construyen fragmentos dinámicos desde listas cerradas controladas por el servidor.
- Dinero y costos se almacenan como `DECIMAL`; no se usa `FLOAT` para importes.
- Cantidades usan la precisión definida en el esquema y respetan si la unidad admite decimales.
- Los cálculos monetarios definitivos se realizan en backend y se redondean a centavos según la regla del módulo.
- Compras, ventas, anulaciones, inventario, caja, cambios críticos y restauración aplican `COMMIT` solo al completar el conjunto; ante fallo ejecutan `ROLLBACK`.
- Los registros históricos no se eliminan físicamente desde los flujos operativos.

## 7. Seguridad, JWT y permisos

- Las contraseñas se convierten en hash bcrypt y nunca se devuelven.
- Los JWT poseen expiración y claim `session_epoch`.
- `authenticate` revalida usuario, bloqueo y epoch; no confía en roles o permisos controlados por el cliente.
- `requirePermission` consulta el permiso efectivo y el estado vigente del rol.
- Las rutas React protegidas controlan experiencia y navegación; el backend conserva la autoridad.
- Los intentos fallidos se limitan por cuenta y se registran sin revelar si el usuario existe.
- Los secretos y credenciales se leen desde variables de entorno y `.env` no se versiona.

## 8. Logging, bitácora y datos sensibles

Morgan registra solicitudes HTTP según el entorno. La bitácora registra acciones críticas con responsable, módulo, entidad, resultado e IP cuando corresponde. Antes de responder, los datos históricos se sanean de manera recursiva y limitada.

No deben registrarse contraseñas, hashes, JWT, encabezados de autorización, credenciales, secretos, UUID del epoch, rutas privadas completas ni datos completos de tarjetas. Los errores al cliente usan mensajes controlados.

## 9. Carga y lectura de imágenes

Los uploads usan `multipart/form-data` solamente en endpoints separados del CRUD JSON. Multer mantiene el archivo en memoria, acepta uno, impone 2 MB y no admite campos de texto. El servicio comprueba MIME y firma JPEG, PNG o WebP y genera un UUID en lugar de conservar el nombre del cliente.

Los paths se resuelven dentro del storage configurado. Las carpetas no se publican como estáticas; la lectura controlada vuelve a comprobar nombre, tamaño, archivo regular y firma. La persistencia de referencia, limpieza y reemplazo respetan el resultado de la transacción.

## 10. Prácticas frontend

- `api/` centraliza URL, JSON, autorización, descargas y errores de red.
- `auth/` conserva estado, restauración y comprobación de permisos.
- `routes/` separa acceso público, autenticado y autorizado.
- `pages/` coordinan la pantalla; `components/` contiene piezas reutilizables.
- `utils/` contiene formato y reglas auxiliares puras que pueden probarse.
- Los formularios muestran errores locales y de API; las páginas contemplan carga, vacío, error y reintento.
- La sesión se almacena bajo una clave versionada, se revalida con `/auth/me`, se sincroniza entre pestañas y se elimina ante logout o `401`.
- No se almacenan secretos en variables públicas de Vite.

## 11. Verificaciones vigentes

```text
npm --prefix backend run check
npm --prefix backend test
npm --prefix frontend run lint
npm --prefix frontend run build
git diff --check
```

`backend check` ejecuta solamente `node --check` sobre `src/app.js` y `src/server.js`; es una comprobación sintáctica limitada, no lint completo del backend. No existe un script oficial `backend lint`.

El frontend usa `oxlint` mediante `frontend lint`. El build de Vite valida la compilación de producción. La suite oficial backend usa `node:test`. Existen pruebas de algunas utilidades frontend, pero `frontend/package.json` no define un script oficial `test`.

## 12. Cambios y control de versiones

Las reglas del repositorio exigen cambios pequeños, relacionados con la tarea y verificables; no se deben mezclar módulos no solicitados. Los commits deben ser pequeños y descriptivos, sin incluir `.env`, secretos, salidas privadas ni credenciales. Antes de considerar terminado un cambio se ejecutan las verificaciones aplicables y se documentan riesgos o limitaciones.

## 13. Recomendaciones futuras

Estas recomendaciones no describen capacidades actuales:

- incorporar un script de lint backend que revise todo el código;
- definir un ejecutor oficial para las pruebas frontend existentes;
- ampliar pruebas de componentes e integración frontend-backend;
- ejecutar pruebas integradas contra una base MariaDB temporal aislada.
