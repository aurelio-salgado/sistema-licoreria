# Plan de pruebas

## Respaldos y restauración

Los procesos externos siempre se sustituyen por stubs en pruebas automáticas. Se
cubren filtros, confirmación, SHA-256, metadata pública, path traversal, concurrencia,
mantenimiento, emisión/comparación/rotación del epoch y no exposición en Settings.
Una recuperación real solo se
prueba manualmente contra una base temporal aislada, nunca contra
`sistema_licoreria`.
