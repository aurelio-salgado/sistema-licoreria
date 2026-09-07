# Plan de pruebas

## Catálogo público

Las pruebas backend verifican acceso sin middleware JWT, proyección cerrada,
disponibilidad booleana, filtros, paginación y referencias de imagen controladas.
La lectura de archivos cubre UUID, traversal, inexistencia, tamaño, firma y MIME sin
usar MariaDB real.

La verificación frontend debe cubrir `/` sin sesión y con sesión, la redirección
de compatibilidad desde `/catalog`, `/login` y la protección de `/dashboard`; además del layout
público completo, cards con imagen y placeholder, búsqueda remota, categoría,
marca, paginación, agotados, teclado, texto alternativo y anchos 360, 480, 768 y
escritorio. La gestión administrativa cubre selección, preview, descarte, creación
seguida de upload, fallo parcial, reemplazo, eliminación y fallback. En backend se
prueban las tres firmas, MIME inconsistente, contenido falso, límite, UUID, traversal,
producto inexistente, rollback y limpieza; las rutas mantienen autenticación y
`productos.editar`, y Multer queda aislado con límites estrictos.

Las marcas cubren logo válido, reemplazo, eliminación, placeholder, referencia
pública mínima y selección remota desde cards con limpieza del filtro.

## Respaldos y restauración

Los procesos externos siempre se sustituyen por stubs en pruebas automáticas. Se
cubren filtros, confirmación, SHA-256, metadata pública, path traversal, concurrencia,
mantenimiento, emisión/comparación/rotación del epoch y no exposición en Settings.
El contrato de generación comprueba el modo nativo `--databases`, la ausencia de
`--add-drop-database`, el uso del nombre recibido, su validación estricta y que el
SHA-256 corresponde al SQL autocontenido final.
Una recuperación real solo se
prueba manualmente contra una base temporal aislada, nunca contra
`sistema_licoreria`.

El comando `rotate-session-epoch` se prueba con dobles, sin MariaDB real: éxito,
fallo, cierre del pool, rechazo de argumentos y ausencia del UUID en ambas salidas.
Las pruebas de `sessionEpoch` cubren UUID distinto, persistencia verificada,
transacción, rollback e idempotencia separada de `initialize()`.

La validación destructiva se ejecuta primero sobre
`sistema_licoreria_restore_test`: importar, verificar tablas y epoch sin mostrarlo,
rotar, iniciar el backend aislado y comprobar que un JWT anterior recibe `401`. Las
pruebas manuales satisfactorias y el procedimiento completo se conservan en
`docs/09-recuperacion-desastres.md`.
