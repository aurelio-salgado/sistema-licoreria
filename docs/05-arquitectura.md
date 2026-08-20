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
