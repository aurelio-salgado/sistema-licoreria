# Plan de pruebas

## Respaldos y restauración

Los procesos externos siempre se sustituyen por stubs en pruebas automáticas. Se
cubren filtros, confirmación, SHA-256, metadata pública, path traversal, concurrencia,
mantenimiento, emisión/comparación/rotación del epoch y no exposición en Settings.
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
