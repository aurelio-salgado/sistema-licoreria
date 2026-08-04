# Instrucciones para Codex

## Propósito del proyecto

Desarrollar un sistema web de control de inventario y facturación para una licorería.

## Documentos que deben revisarse

Antes de realizar cualquier tarea, leer:

1. `PROJECT_CONTEXT.md`
2. `TASKS.md`
3. `AGENTS.md`
4. Los documentos relacionados dentro de `docs/`

## Tecnologías obligatorias

- Frontend: React con Vite.
- Backend: Node.js con Express.
- Base de datos: MariaDB/MySQL.
- Comunicación: API REST con JSON.
- Autenticación: JWT.
- Hash de contraseñas: bcrypt.
- Acceso a datos: mysql2.
- Control de acceso: roles y permisos.
- Control de versiones: Git.

No cambiar estas tecnologías sin autorización.

## Flujo de trabajo

Para cada tarea:

1. Revisar el código y la documentación relacionados.
2. Presentar un plan breve antes de modificar archivos.
3. Trabajar solamente en el alcance solicitado.
4. Realizar cambios pequeños y verificables.
5. Ejecutar pruebas, lint o verificaciones disponibles.
6. Mostrar los archivos creados o modificados.
7. Explicar cómo probar manualmente el resultado.
8. Informar errores, riesgos o tareas pendientes.

No continuar con otro módulo mientras existan errores pendientes.

## Restricciones

- No implementar todo el sistema en una sola tarea.
- No inventar requisitos.
- No eliminar código funcional sin justificarlo.
- No modificar archivos no relacionados con la tarea.
- No instalar dependencias innecesarias.
- No colocar contraseñas, tokens ni credenciales en el código.
- No subir archivos `.env` al repositorio.
- No registrar contraseñas o tokens en logs.
- No eliminar físicamente ventas, compras o movimientos históricos.
- No permitir inventario negativo.
- No confiar únicamente en validaciones del frontend.
- No calcular totales definitivos únicamente en React.

## Backend

- Organizar el código por módulos.
- Separar rutas, controladores, servicios, repositorios y validaciones.
- Utilizar consultas SQL parametrizadas.
- Utilizar un pool de conexiones.
- Manejar errores de forma centralizada.
- Validar las entradas en el servidor.
- Aplicar autenticación y autorización en el backend.
- Utilizar transacciones en compras, ventas, anulaciones, caja e inventario.
- No revelar consultas SQL ni errores internos al cliente.
- Calcular precios, descuentos, impuestos y totales en el backend.

## Frontend

- Organizar el código por funcionalidades.
- Utilizar componentes reutilizables.
- Separar páginas, componentes, servicios y validaciones.
- Centralizar las llamadas a la API.
- Mostrar estados de carga, éxito y error.
- Validar formularios.
- No almacenar secretos en variables públicas.
- No considerar las rutas protegidas de React como seguridad suficiente.

## Base de datos

- Utilizar InnoDB.
- Utilizar codificación `utf8mb4`.
- Utilizar claves primarias y foráneas.
- Utilizar `DECIMAL` para dinero y cantidades.
- No utilizar `FLOAT` para valores monetarios.
- Conservar el historial de operaciones.
- Utilizar estados para desactivación y anulación.
- Evitar eliminaciones en cascada que puedan borrar información histórica.
- Crear índices de acuerdo con las consultas reales.
- Actualizar la documentación cuando cambie el esquema.

## Seguridad

- Hash de contraseñas con bcrypt.
- Tokens con tiempo de expiración.
- Limitación de intentos de inicio de sesión.
- Configuración controlada de CORS.
- Uso de Helmet en Express.
- Uso de variables de entorno.
- Consultas parametrizadas.
- Autorización mediante roles y permisos.
- Bitácora para acciones críticas.
- No almacenar datos completos de tarjetas.
- No exponer los respaldos desde carpetas públicas.

## Convenciones

- Variables y funciones JavaScript: `camelCase`.
- Componentes React: `PascalCase`.
- Tablas y columnas: `snake_case`.
- Rutas REST: sustantivos en plural.
- Respuestas de API consistentes.
- Commits pequeños y descriptivos.
- Mantener un solo idioma en los nombres internos del código.

## Definición de tarea terminada

Una tarea se considera terminada únicamente cuando:

- El código ejecuta correctamente.
- Las validaciones principales funcionan.
- Los errores están controlados.
- Se probaron los casos principales.
- La documentación relacionada fue actualizada.
- Se explicó cómo verificar el resultado.