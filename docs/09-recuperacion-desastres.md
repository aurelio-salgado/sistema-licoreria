# Recuperación manual ante desastres

Este documento es la fuente operativa principal para reconstruir LIQUORIX después
de una pérdida total de MariaDB. La recuperación manual es una actividad
administrativa excepcional y no equivale a la restauración controlada disponible
en la aplicación.

## Advertencia crítica

> **NUNCA ejecute `DROP DATABASE` sin verificar por separado el servidor, el
> puerto y el nombre exacto de la base objetivo.** Una conexión correcta al
> servidor equivocado también puede destruir información válida.

Toda prueba destructiva debe realizarse primero sobre la base aislada
`sistema_licoreria_restore_test`. Nunca se ensaya directamente sobre la base en
servicio. No incluya contraseñas en la línea de comandos, capturas, bitácoras o
documentos de evidencia; use el mecanismo seguro de credenciales aprobado para el
cliente `mysql`.

## Conceptos

- **Respaldo manual:** archivo solicitado expresamente por un usuario desde LIQUORIX.
- **Respaldo preventivo:** archivo creado antes de una restauración interna.
- **Restauración:** operación controlada por LIQUORIX, con confirmación,
  mantenimiento e invalidación de sesiones.
- **Recuperación manual:** reconstrucción administrativa de MariaDB ante pérdida
  total; no pasa por la API de LIQUORIX.

El respaldo preventivo no se denomina automático. La versión actual no genera
respaldos automáticos ni programados.

## Condiciones previas

1. Identifique al responsable autorizado y abra un registro administrativo del
   incidente.
2. Detenga el backend y confirme que no quedan instancias de LIQUORIX atendiendo
   solicitudes contra la base objetivo.
3. Localice una copia protegida del respaldo y conserve el original sin modificar.
4. Verifique que el archivo sea regular, no esté vacío, corresponda a LIQUORIX y
   coincida con el tamaño y SHA-256 conservados. No publique rutas internas ni el
   checksum completo en evidencias de acceso general.
5. Registre por separado el servidor, puerto y nombre de base esperados. Un segundo
   responsable debe validarlos cuando el procedimiento organizativo lo requiera.

## Ensayo obligatorio en base temporal

Antes de intervenir la base real:

1. Configure un entorno aislado cuyo `DB_NAME` sea exactamente
   `sistema_licoreria_restore_test`.
2. Compruebe desde el servidor MariaDB la identidad del host y puerto esperados.
3. Cree o recree únicamente `sistema_licoreria_restore_test` con `utf8mb4` y una
   colación compatible, o permita que el respaldo autocontenido la cree si no
   existe. El archivo selecciona por sí mismo la base configurada al generarlo.
4. Importe el archivo SQL con el cliente `mysql` y credenciales obtenidas de una
   configuración privada, nunca como argumentos visibles.
5. Ejecute las verificaciones de integridad indicadas más adelante.
6. Configure temporalmente el backend para esa base, ejecute la rotación del epoch
   y valide el arranque y los módulos críticos.
7. Detenga nuevamente el backend de prueba antes de continuar.

No reutilice el archivo `.env` de producción para el ensayo ni incorpore archivos
`.env` al repositorio.

## Importación del respaldo autocontenido con phpMyAdmin

1. Detenga el backend y confirme que el `DB_NAME` escrito dentro del respaldo
   corresponde exclusivamente al destino autorizado.
2. Ingrese a phpMyAdmin con una cuenta técnica que pueda crear esa base si no
   existe y administrar sus objetos. No use esas credenciales en LIQUORIX.
3. Desde la vista del servidor, sin seleccionar otra base, abra **Importar**,
   seleccione el archivo `.sql`, conserve el formato SQL y ejecute la importación.
   El propio archivo ejecuta `CREATE DATABASE IF NOT EXISTS` y `USE`.
4. Si la base ya existe y se requiere una reconstrucción totalmente limpia,
   elimínela previamente solo después de verificar de forma independiente host,
   puerto y nombre. Esa acción no forma parte del respaldo ni de LIQUORIX.
5. Confirme que phpMyAdmin no reportó errores y continúe con las verificaciones
   esenciales y la rotación del epoch descritas abajo. Si el archivo supera el
   límite de carga configurado en PHP, use el cliente `mysql` con el mismo control
   administrativo en lugar de fragmentar o editar el respaldo.

## Procedimiento sobre la base objetivo

1. **Detener el backend.** Manténgalo detenido hasta completar todas las
   verificaciones y la rotación de sesiones.
2. **Confirmar el destino.** Verifique por separado servidor, puerto y nombre exacto
   de la base configurada en `backend/.env`. No continúe si algún dato difiere de la
   autorización del incidente.
3. **Verificar nuevamente el respaldo.** Use la misma copia que superó el ensayo y
   vuelva a comprobar tamaño, integridad y compatibilidad.
4. **Preparar el destino.** Si la base no existe, el respaldo autocontenido la crea
   con el juego de caracteres y la colación registrados por MariaDB al generarlo, y
   luego la selecciona con `USE`. Si existe, `CREATE DATABASE IF NOT EXISTS` no la
   altera y las sentencias `DROP TABLE IF EXISTS` de `mysqldump` reemplazan las
   tablas incluidas; pueden permanecer objetos ajenos al respaldo. Para una
   recuperación total limpia, cualquier eliminación previa debe ser una decisión
   expresa del técnico, dirigida a un nombre literal verificado. El respaldo nunca
   ejecuta `DROP DATABASE`.
5. **Importar el SQL.** Ejecute el cliente `mysql` contra el nombre confirmado. No
   exponga credenciales en argumentos ni redirija errores a una ubicación pública.
6. **Verificar integridad básica.** Confirme como mínimo la existencia de
   `usuarios`, `roles`, `permisos`, `configuracion`, `respaldos` y `bitacora`, sus
   motores InnoDB, el usuario administrador requerido y las relaciones esenciales.
   Revise que la importación no haya informado errores.
7. **Comprobar el epoch sin mostrarlo.** Consulte únicamente un resultado booleano o
   conteo que confirme que existe exactamente una fila `jwt_session_epoch`, de tipo
   `uuid`, cuyo valor cumple el formato UUID v4. No seleccione ni copie la columna
   `valor` en consola, capturas o logs.
8. **Invalidar sesiones anteriores.** Con el backend aún detenido y
   `backend/.env` apuntando exclusivamente al destino confirmado, ejecute:

   ```text
   npm --prefix backend run rotate-session-epoch
   ```

   El comando no acepta argumentos de conexión ni UUID. Un resultado correcto solo
   muestra `Version global de sesiones rotada correctamente.`. Si termina con código
   distinto de cero, **no inicie el backend**; corrija la base o configuración y
   repita las verificaciones.
9. **Iniciar el backend.** Hágalo solo después de una importación válida y una
   rotación exitosa.
10. **Verificar invalidación.** Una solicitud autenticada con un token emitido antes
    de la recuperación debe recibir `401 No autorizado`. No conserve ni publique el
    token usado como evidencia.
11. **Iniciar sesión nuevamente.** Obtenga un JWT nuevo mediante el flujo normal.
12. **Comprobar operación.** Verifique salud del backend, autenticación, permisos,
    usuarios, productos, inventario, compras, ventas, caja, bitácora y consulta de
    respaldos. No ejecute mutaciones innecesarias sobre datos históricos.
13. **Cerrar el incidente.** Registre responsable, fechas, respaldo utilizado,
    verificaciones realizadas, resultado de rotación y resultado funcional. Nunca
    registre credenciales, JWT, UUID del epoch, rutas privadas o secretos.

## `init` no sustituye a `rotate`

`npm --prefix backend run init-session-epoch` crea el epoch únicamente cuando falta
y conserva uno existente. Es idempotente y se usa para inicialización. Después de
importar un respaldo que ya contiene el epoch anterior, ese comando **no invalida
sesiones**.

La recuperación manual debe usar siempre `rotate-session-epoch`. Este ejecuta el
servicio transaccional existente: genera un UUID nuevo, lo persiste, vuelve a leerlo,
confirma la transacción únicamente si coincide y revierte ante fallo. Ninguno de los
dos comandos muestra el UUID.

## Criterio de recuperación válida

La recuperación solo puede declararse terminada cuando la base supera las
verificaciones esenciales, la rotación finaliza con código cero, el backend inicia
sin errores, los JWT anteriores son rechazados y un inicio de sesión nuevo permite
consultar los módulos críticos. Cualquier fallo mantiene el sistema fuera de
servicio hasta ser investigado.
