# Reglas permanentes para Codex

## Raíz del proyecto

La raíz válida del repositorio es:

`C:\Users\Zbook\Desktop\sistema-licoreria`

## Estructura

- No crear carpetas duplicadas.
- No crear `docs/docs`.
- No renombrar carpetas existentes.
- No mover archivos sin autorización.
- Si un archivo ya existe, modificarlo directamente.
- No crear copias con nombres alternativos.
- Antes de escribir, verificar la ruta exacta del archivo objetivo.

## Lectura obligatoria

Antes de cada tarea, leer:

1. `AGENTS.md`
2. `PROJECT_CONTEXT.md`
3. `TASKS.md`
4. El documento relacionado dentro de `docs/`
5. Este archivo `CODEX_RULES.md`

## Alcance

- Modificar únicamente los archivos solicitados.
- No agregar funcionalidades no pedidas.
- No cambiar tecnologías.
- No instalar dependencias sin justificarlo.
- No modificar frontend, backend o base de datos si la tarea es documental.
- No modificar documentación si la tarea es exclusivamente de código, salvo que se solicite.

## Flujo de trabajo

Antes de modificar:

1. Confirmar el archivo objetivo.
2. Presentar un plan breve.
3. Confirmar qué archivos se modificarán.
4. Confirmar qué archivos no se tocarán.

Después de modificar:

1. Resumir los cambios.
2. Enumerar archivos modificados.
3. Explicar cómo verificar el resultado.
4. Informar riesgos, decisiones pendientes o limitaciones.
5. Confirmar que no se alteró la estructura del repositorio.

## Código

- Mantener arquitectura modular.
- No reescribir módulos completos sin necesidad.
- Realizar cambios pequeños.
- Usar consultas parametrizadas.
- No exponer secretos.
- No colocar credenciales reales.
- No subir archivos `.env`.
- Ejecutar pruebas, lint o verificaciones disponibles.
- No considerar una tarea terminada si existen errores.

## Documentación

- Mantener numeración consecutiva.
- Evitar requisitos o reglas duplicadas.
- Conservar el alcance aprobado.
- No inventar módulos.
- Mantener coherencia con `01-requerimientos.md`.
- No escribir código, SQL o endpoints en documentos que no correspondan.