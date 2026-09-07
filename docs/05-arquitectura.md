# Arquitectura

## Respaldos y mantenimiento

`modules/backups` separa rutas, controlador, servicio, repositorio, validación y
procesos externos. Los ejecutables y el almacenamiento son configuración privada.
Un coordinador en memoria bloquea concurrencia y activa mantenimiento con whitelist
explícita limitada a preflight CORS; ninguna consulta de negocio toca MariaDB durante
el import. Esta solución se limita al despliegue actual de una sola instancia Node.

El pool se expone mediante una fachada compatible con los imports existentes y se
puede renovar después de un import. Los procesos usan `shell:false`, argumentos
separados y un archivo temporal de opciones eliminado en `finally`.

El servicio interno `sessionEpoch` mantiene un UUID en `configuracion`, fuera de las
whitelists de Settings. Login lo incluye como claim `session_epoch` y autenticación
lo compara con MariaDB. Tras importar se genera y verifica un UUID nuevo. Si el
import comienza y el epoch no puede rotarse, el coordinador conserva mantenimiento.
Una instalación inicial ejecuta `npm --prefix backend run init-session-epoch`; el
script usa `crypto.randomUUID()`, `INSERT IGNORE` y nunca imprime el valor.

## Catálogo público

`modules/publicCatalog` separa ruta, controlador, servicio, repositorio y validación
sin reutilizar la proyección administrativa de productos. La consulta pública no
usa JWT, aplica una whitelist de filtros y calcula únicamente disponibilidad
booleana. `/` posee layout público propio con la identidad visual existente y
permanece fuera de `ProtectedRoute` y `PublicOnlyRoute`; `/catalog` redirige a la
raíz como alias de compatibilidad. El área autenticada inicia en `/dashboard`.

Las imágenes se aíslan en `storage/products`; nunca se publica `storage` completo.
Una ruta controlada valida nombre UUID, resolución dentro de la carpeta, archivo
regular, límite y firma antes de responder. Solo los endpoints administrativos de
imagen usan `multer` con `memoryStorage`, un archivo, 2 MB y cero campos de texto.
El servicio valida nuevamente MIME y firma antes de escribir, genera UUID y actualiza
referencia y bitácora en transacción. Un reemplazo retira el archivo anterior solo
después del commit; una transacción fallida limpia el archivo nuevo.

Los logos de marca reutilizan esta validación y escritura segura con almacenamiento
separado en `storage/brands` y lectura pública controlada; no se publica el storage.

Los respaldos usan el modo nativo `mysqldump --databases` después de validar
`DB_NAME` como identificador compatible. Por ello el SQL contiene `CREATE DATABASE
IF NOT EXISTS` y `USE` para el destino configurado. No contiene `DROP DATABASE`;
la decisión de eliminar una base durante una recuperación sigue siendo externa y
administrativa. El SHA-256 se calcula después de completar el archivo temporal.

La recuperación manual no atraviesa el servicio de restauración. Para ese escenario,
`npm --prefix backend run rotate-session-epoch` invoca `sessionEpoch.rotate()` con la
conexión configurada, rechaza argumentos y cierra el pool. La actualización y su
verificación son transaccionales; un fallo produce código distinto de cero y un
mensaje genérico, sin exponer el UUID. El backend debe permanecer detenido durante
el procedimiento descrito en `docs/09-recuperacion-desastres.md`.
