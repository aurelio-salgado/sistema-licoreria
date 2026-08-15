# Modelo de datos relacional

## Sistema web de control de inventario y facturación para una licorería

## 1. Información del documento

| Campo | Valor |
|---|---|
| Documento | Especificación formal del modelo de datos relacional |
| Versión | 1.0 |
| Estado | Propuesta para validación previa a implementación |
| Proyecto | Sistema web de control de inventario y facturación para una licorería |
| Ámbito | Una sola sucursal |
| Motor objetivo | MariaDB/MySQL mediante XAMPP, InnoDB, `utf8mb4` |
| Documentos fuente | `docs/01-requerimientos.md` y `docs/02-reglas-negocio.md` |

## 2. Propósito

Este documento especifica el modelo relacional que servirá de base para elaborar posteriormente `database/schema.sql`, `database/seed.sql`, el diagrama entidad-relación, los repositorios del backend y las validaciones de datos. Define entidades, atributos, claves, relaciones, restricciones, índices y límites transaccionales sin incluir SQL ejecutable, código ni rutas de API.

## 3. Alcance

El modelo cubre autenticación; usuarios, roles y permisos; catálogos; productos; clientes; proveedores; compras; inventario; ventas; facturación interna; métodos de pago; caja; bitácora; configuración; respaldos y restauraciones para una sola sucursal.

El dashboard y los reportes se obtendrán mediante consultas sobre las tablas operativas y no requieren tablas propias en esta etapa. Quedan fuera la operación multisucursal, facturación fiscal electrónica, crédito, comercio electrónico, lotes, vencimientos, pasarelas de pago y almacenamiento de archivos binarios de respaldo dentro de la base de datos.

## 4. Convenciones de nombres

- Tablas y columnas en `snake_case`, con nombres internos en español.
- Claves primarias principales con el formato `id_entidad` y tipo sugerido `BIGINT UNSIGNED`.
- Claves foráneas con el mismo nombre de la clave primaria referenciada.
- Fechas de creación y modificación denominadas `creado_en` y `actualizado_en`.
- Fechas operativas representadas con `DATETIME`.
- Dinero representado con `DECIMAL(12,2)` y cantidades con `DECIMAL(12,3)`.
- Indicadores lógicos representados con `BOOLEAN` o `TINYINT(1)`.
- Estados y códigos internos escritos en minúsculas y sin espacios; su mecanismo definitivo de restricción queda pendiente entre valores controlados o tablas catálogo.
- Los campos de texto indican longitudes sugeridas, sujetas a verificación antes de generar el esquema.
- `Nulo: No` indica obligatoriedad en almacenamiento; `Nulo: Sí` permite ausencia justificada.

## 5. Criterios de modelado

1. Todas las tablas usarán InnoDB y codificación `utf8mb4`.
2. Las relaciones se protegerán mediante claves foráneas y acciones que no eliminen historia en cascada.
3. Los importes y cantidades evitarán `FLOAT`; los cálculos definitivos se efectuarán en el backend y se persistirán con precisión decimal.
4. Compras, ventas, anulaciones, caja e inventario se actualizarán dentro de transacciones.
5. Los datos históricos de costo, precio, descuento, impuesto y subtotal se copiarán a los detalles de operaciones confirmadas.
6. Los registros maestros con historia se desactivarán lógicamente; las operaciones confirmadas y movimientos serán inmutables desde la aplicación.
7. `productos.existencia` será un saldo materializado para consulta eficiente y deberá conciliarse con `movimientos_inventario`.
8. Los pares `tipo_referencia` e `id_referencia` permitirán rastrear distintos orígenes sin incorporar tablas fuera del alcance; su coherencia se validará transaccionalmente en el backend.
9. No se almacenarán contraseñas en texto plano, tokens de sesión ni datos completos de tarjetas.
10. Los respaldos almacenarán metadatos; el archivo permanecerá fuera de directorios públicos y fuera de la base de datos.

## 6. Catálogo de entidades

| N.º | Entidad | Finalidad principal |
|---:|---|---|
| 1 | `usuarios` | Identidad, credenciales protegidas, estado y bloqueo. |
| 2 | `roles` | Agrupación de responsabilidades de acceso. |
| 3 | `permisos` | Acciones autorizables por módulo. |
| 4 | `usuario_roles` | Asignación muchos a muchos entre usuarios y roles. |
| 5 | `rol_permisos` | Asignación muchos a muchos entre roles y permisos. |
| 6 | `categorias` | Clasificación principal de productos. |
| 7 | `marcas` | Marca comercial de productos. |
| 8 | `unidades_medida` | Unidad principal y capacidad decimal del producto. |
| 9 | `productos` | Catálogo comercial y saldo actual de inventario. |
| 10 | `clientes` | Identificación mínima del comprador. |
| 11 | `proveedores` | Información comercial y de contacto del abastecedor. |
| 12 | `compras` | Encabezado y totales históricos de adquisiciones. |
| 13 | `detalle_compras` | Productos y valores históricos de cada compra. |
| 14 | `ventas` | Encabezado, facturación y totales históricos de ventas. |
| 15 | `detalle_ventas` | Productos, precios y costos históricos de cada venta. |
| 16 | `metodos_pago` | Catálogo de medios de pago aceptados. |
| 17 | `pagos_venta` | Pagos simples o combinados asociados a ventas. |
| 18 | `movimientos_inventario` | Historial inmutable de entradas y salidas. |
| 19 | `cajas` | Sesiones de apertura y cierre por usuario. |
| 20 | `movimientos_caja` | Movimientos monetarios y su efecto sobre efectivo. |
| 21 | `bitacora` | Auditoría de acciones críticas. |
| 22 | `configuracion` | Parámetros configurables de la única sucursal. |
| 23 | `respaldos` | Metadatos y resultado de respaldos o restauraciones. |

## 7. Definición detallada de tablas

### 7.1 `usuarios`

**Propósito:** Almacenar identidades, credenciales protegidas y condiciones de acceso.

**Reglas relacionadas:** RN-AUT-001 a RN-AUT-004; RN-USU-001 a RN-USU-005.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_usuario` | BIGINT UNSIGNED | No | PK | Autogenerado, positivo | Identificador del usuario. |
| `nombre` | VARCHAR(100) | No | — | No vacío | Nombre del usuario. |
| `apellido` | VARCHAR(100) | No | — | No vacío | Apellido del usuario. |
| `nombre_usuario` | VARCHAR(80) | No | UQ | Único, no vacío | Nombre utilizado para autenticación. |
| `correo` | VARCHAR(150) | Sí | UQ | Único cuando exista, formato válido | Correo del usuario. |
| `password_hash` | VARCHAR(255) | No | — | Hash bcrypt, nunca texto plano | Credencial protegida. |
| `estado` | VARCHAR(20) | No | IDX | `activo` o `inactivo` | Estado lógico. |
| `intentos_fallidos` | INT UNSIGNED | No | — | Valor inicial cero | Contador de intentos consecutivos. |
| `bloqueado_hasta` | DATETIME | Sí | IDX | Posterior al intento que genera bloqueo | Fin del bloqueo temporal. |
| `ultimo_acceso` | DATETIME | Sí | — | — | Última autenticación válida. |
| `creado_en` | DATETIME | No | — | Fecha de creación | Auditoría temporal. |
| `actualizado_en` | DATETIME | No | — | Fecha de última modificación | Auditoría temporal. |

- **Clave primaria:** `id_usuario`.
- **Claves foráneas:** ninguna.
- **Restricciones únicas:** `nombre_usuario`; `correo` cuando no sea nulo.
- **Índices recomendados:** `nombre_usuario`, `correo`, `estado`, `bloqueado_hasta`.
- **Reglas de integridad:** nunca persistir texto plano; impedir dejar el sistema sin un Administrador activo mediante validación transaccional con `usuario_roles`.
- **Política de eliminación o desactivación:** desactivación lógica; no eliminar si existe historia relacionada.

### 7.2 `roles`

**Propósito:** Definir los roles de control de acceso.

**Reglas relacionadas:** RN-ROL-001; RN-ROL-005; RN-USU-004.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_rol` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador del rol. |
| `nombre` | VARCHAR(80) | No | UQ | Único, no vacío | Nombre del rol. |
| `descripcion` | VARCHAR(255) | Sí | — | — | Explicación funcional. |
| `es_sistema` | BOOLEAN | No | — | Valor inicial falso | Indica rol protegido de configuración inicial. |
| `estado` | VARCHAR(20) | No | IDX | `activo` o `inactivo` | Disponibilidad del rol. |
| `creado_en` | DATETIME | No | — | — | Fecha de creación. |
| `actualizado_en` | DATETIME | No | — | — | Fecha de modificación. |

- **Clave primaria:** `id_rol`.
- **Claves foráneas:** ninguna.
- **Restricciones únicas:** `nombre`.
- **Índices recomendados:** `nombre`, `estado`.
- **Reglas de integridad:** deben existir Administrador, Vendedor y Consulta; los roles de sistema no deben perder su identidad aprobada.
- **Política de eliminación o desactivación:** desactivación lógica; un rol referenciado no se elimina físicamente.

### 7.3 `permisos`

**Propósito:** Catalogar acciones autorizables por módulo.

**Reglas relacionadas:** RN-ROL-002 a RN-ROL-005.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_permiso` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador del permiso. |
| `codigo` | VARCHAR(100) | No | UQ | Único, estable | Código usado en autorización. |
| `nombre` | VARCHAR(120) | No | — | No vacío | Nombre legible. |
| `modulo` | VARCHAR(80) | No | IDX | Módulo aprobado | Agrupación funcional. |
| `descripcion` | VARCHAR(255) | Sí | — | — | Alcance de la acción. |
| `creado_en` | DATETIME | No | — | — | Fecha de creación. |

- **Clave primaria:** `id_permiso`.
- **Claves foráneas:** ninguna.
- **Restricciones únicas:** `codigo`.
- **Índices recomendados:** `codigo`, `modulo`.
- **Reglas de integridad:** los códigos deben ser estables; descuentos, anulaciones, ajustes, respaldos y restauraciones tendrán permisos explícitos.
- **Política de eliminación o desactivación:** no eliminar permisos asignados; cualquier retiro se realiza mediante `rol_permisos` hasta definir una política de estado.

### 7.4 `usuario_roles`

**Propósito:** Modelar la relación muchos a muchos entre usuarios y roles, aunque inicialmente se asigne un solo rol operativo.

**Reglas relacionadas:** RN-USU-004; RN-USU-005; RN-ROL-001; RN-ROL-005.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_usuario` | BIGINT UNSIGNED | No | PK, FK | Usuario existente | Usuario asignado. |
| `id_rol` | BIGINT UNSIGNED | No | PK, FK | Rol existente y activo al asignar | Rol asignado. |
| `asignado_por` | BIGINT UNSIGNED | Sí | FK | Usuario autorizador; nulo solo en carga inicial | Responsable de la asignación. |
| `asignado_en` | DATETIME | No | — | — | Fecha de asignación. |

- **Clave primaria:** compuesta por `id_usuario`, `id_rol`.
- **Claves foráneas:** `id_usuario` y `asignado_por` → `usuarios.id_usuario`; `id_rol` → `roles.id_rol`.
- **Restricciones únicas:** la clave compuesta impide asignaciones duplicadas.
- **Índices recomendados:** índice inverso por `id_rol`, `id_usuario`; índice por `asignado_por`.
- **Reglas de integridad:** impedir retirar la última asignación activa de Administrador; validar nuevas sesiones con asignaciones vigentes.
- **Política de eliminación o desactivación:** no borrar asignaciones que deban auditarse sin registrar antes el cambio en bitácora; la estrategia histórica definitiva queda pendiente.

### 7.5 `rol_permisos`

**Propósito:** Modelar la relación muchos a muchos entre roles y permisos.

**Reglas relacionadas:** RN-ROL-002; RN-ROL-003; RN-ROL-005.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_rol` | BIGINT UNSIGNED | No | PK, FK | Rol existente | Rol autorizado. |
| `id_permiso` | BIGINT UNSIGNED | No | PK, FK | Permiso existente | Permiso concedido. |
| `concedido_en` | DATETIME | No | — | — | Fecha de concesión. |

- **Clave primaria:** compuesta por `id_rol`, `id_permiso`.
- **Claves foráneas:** `id_rol` → `roles.id_rol`; `id_permiso` → `permisos.id_permiso`.
- **Restricciones únicas:** la clave compuesta impide concesiones duplicadas.
- **Índices recomendados:** índice inverso por `id_permiso`, `id_rol`.
- **Reglas de integridad:** la autorización efectiva debe verificarse en el backend y aplicarse de forma controlada en nuevas sesiones.
- **Política de eliminación o desactivación:** retirar una relación no elimina roles, permisos ni operaciones históricas; el cambio se audita.

### 7.6 `categorias`

**Propósito:** Clasificar productos por categoría.

**Reglas relacionadas:** RN-CAT-001 a RN-CAT-003.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_categoria` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador. |
| `nombre` | VARCHAR(100) | No | UQ | Único según normalización aprobada | Nombre de categoría. |
| `descripcion` | VARCHAR(255) | Sí | — | — | Descripción. |
| `estado` | VARCHAR(20) | No | IDX | `activo` o `inactivo` | Estado lógico. |
| `creado_en` | DATETIME | No | — | — | Creación. |
| `actualizado_en` | DATETIME | No | — | — | Modificación. |

- **Clave primaria:** `id_categoria`.
- **Claves foráneas:** ninguna.
- **Restricciones únicas:** `nombre` bajo el criterio de comparación aprobado.
- **Índices recomendados:** `nombre`, `estado`.
- **Reglas de integridad:** una categoría inactiva no se asigna a productos nuevos.
- **Política de eliminación o desactivación:** desactivación lógica; conservar si está referenciada.

### 7.7 `marcas`

**Propósito:** Catalogar marcas comerciales de productos.

**Reglas relacionadas:** RN-CAT-002; RN-CAT-003.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_marca` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador. |
| `nombre` | VARCHAR(100) | No | UQ | No vacío | Nombre de marca. |
| `descripcion` | VARCHAR(255) | Sí | — | — | Descripción. |
| `estado` | VARCHAR(20) | No | IDX | `activo` o `inactivo` | Estado lógico. |
| `creado_en` | DATETIME | No | — | — | Creación. |
| `actualizado_en` | DATETIME | No | — | — | Modificación. |

- **Clave primaria:** `id_marca`.
- **Claves foráneas:** ninguna.
- **Restricciones únicas:** se recomienda `nombre`, sujeto al criterio definitivo de normalización.
- **Índices recomendados:** `nombre`, `estado`.
- **Reglas de integridad:** una marca inactiva no se asigna en registros nuevos.
- **Política de eliminación o desactivación:** desactivación lógica; conservar relaciones históricas.

### 7.8 `unidades_medida`

**Propósito:** Definir la unidad principal de cada producto y si admite cantidades fraccionarias.

**Reglas relacionadas:** RN-CAT-002; RN-CAT-003; RN-PRO-003.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_unidad` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador. |
| `nombre` | VARCHAR(80) | No | UQ | No vacío | Nombre de unidad. |
| `abreviatura` | VARCHAR(20) | No | UQ | No vacía | Representación corta. |
| `permite_decimales` | BOOLEAN | No | — | — | Autoriza cantidades con fracción. |
| `estado` | VARCHAR(20) | No | IDX | `activo` o `inactivo` | Estado lógico. |
| `creado_en` | DATETIME | No | — | — | Creación. |
| `actualizado_en` | DATETIME | No | — | — | Modificación. |

- **Clave primaria:** `id_unidad`.
- **Claves foráneas:** ninguna.
- **Restricciones únicas:** `nombre` y `abreviatura`.
- **Índices recomendados:** `nombre`, `estado`.
- **Reglas de integridad:** si no permite decimales, las cantidades operativas deberán ser enteras aunque se almacenen con escala decimal.
- **Política de eliminación o desactivación:** desactivación lógica; conservar si está asociada a productos.

### 7.9 `productos`

**Propósito:** Almacenar bebidas y productos complementarios autorizados, sus valores vigentes y saldo actual.

**Reglas relacionadas:** RN-PRO-001 a RN-PRO-007; RN-INV-001; RN-INV-005; RN-CON-002.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_producto` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador. |
| `codigo` | VARCHAR(60) | No | UQ | Único, no vacío | Código interno. |
| `codigo_barras` | VARCHAR(80) | Sí | UQ | Único cuando exista | Código de barras. |
| `nombre` | VARCHAR(150) | No | IDX | No vacío | Nombre comercial. |
| `descripcion` | TEXT | Sí | — | — | Descripción. |
| `id_categoria` | BIGINT UNSIGNED | No | FK | Categoría existente | Clasificación. |
| `id_marca` | BIGINT UNSIGNED | No | FK | Marca existente | Marca. |
| `id_unidad` | BIGINT UNSIGNED | No | FK | Unidad existente | Unidad principal. |
| `costo_promedio` | DECIMAL(12,2) | No | — | Mayor o igual que cero | Costo vigente. |
| `precio_venta` | DECIMAL(12,2) | No | — | Mayor que cero | Precio vigente. |
| `existencia` | DECIMAL(12,3) | No | — | Mayor o igual que cero | Saldo materializado. |
| `existencia_minima` | DECIMAL(12,3) | No | — | Mayor o igual que cero | Umbral de alerta. |
| `porcentaje_impuesto` | DECIMAL(5,2) | No | — | Dentro del rango aprobado | Tasa aplicable a nuevas operaciones. |
| `estado` | VARCHAR(20) | No | IDX | `activo` o `inactivo` | Estado lógico. |
| `creado_en` | DATETIME | No | — | — | Creación. |
| `actualizado_en` | DATETIME | No | — | — | Modificación. |

- **Clave primaria:** `id_producto`.
- **Claves foráneas:** `id_categoria` → `categorias`; `id_marca` → `marcas`; `id_unidad` → `unidades_medida`.
- **Restricciones únicas:** `codigo`; `codigo_barras` cuando no sea nulo.
- **Índices recomendados:** `codigo`, `codigo_barras`, `nombre`, `estado`, `id_categoria`, `id_marca`.
- **Reglas de integridad:** valores no negativos; precio positivo; una unidad principal; `existencia` solo cambia junto con un movimiento confirmado. `costo_promedio` puede establecerse inicialmente o corregirse administrativamente mientras `existencia = 0`; omitirlo al editar conserva el valor vigente y, con existencia positiva, el CRUD no puede alterarlo. Una compra recibida constituye la fuente normal de actualización y recalcula el costo promedio ponderado; anulaciones y ajustes no lo modifican.
- **Política de eliminación o desactivación:** desactivación lógica; productos con historia no se eliminan.

El modelo actual no conserva `costo_promedio_anterior` ni un kardex valorizado. Por ello, una anulación de compra no intentará reconstruir algebraicamente la valoración ni alterará costos históricos de ventas. Los snapshots de costo o un kardex valorizado quedan como evolución futura y requerirán una decisión y ampliación de modelo expresas.

### 7.10 `clientes`

**Propósito:** Registrar los datos mínimos del cliente y mantener “Consumidor final”.

**Reglas relacionadas:** RN-CLI-001 a RN-CLI-004.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_cliente` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador. |
| `nombre` | VARCHAR(150) | No | IDX | No vacío | Nombre o razón social. |
| `identificacion` | VARCHAR(50) | Sí | UQ | Única cuando exista | Identificación autorizada. |
| `telefono` | VARCHAR(30) | Sí | — | — | Contacto telefónico. |
| `correo` | VARCHAR(150) | Sí | — | Formato válido | Correo. |
| `direccion` | VARCHAR(255) | Sí | — | — | Dirección. |
| `es_consumidor_final` | BOOLEAN | No | — | Solo un registro verdadero | Protege cliente predeterminado. |
| `estado` | VARCHAR(20) | No | IDX | `activo` o `inactivo` | Estado lógico. |
| `creado_en` | DATETIME | No | — | — | Creación. |
| `actualizado_en` | DATETIME | No | — | — | Modificación. |

- **Clave primaria:** `id_cliente`.
- **Claves foráneas:** ninguna.
- **Restricciones únicas:** `identificacion` cuando exista; un único cliente marcado como consumidor final mediante control de integridad compatible con el motor.
- **Índices recomendados:** `nombre`, `identificacion`, `estado`.
- **Reglas de integridad:** debe existir un “Consumidor final” activo; solo recopilar datos aprobados.
- **Política de eliminación o desactivación:** desactivación lógica; “Consumidor final” no se elimina ni desactiva.

### 7.11 `proveedores`

**Propósito:** Mantener información comercial y de contacto de proveedores.

**Reglas relacionadas:** RN-PRV-001 a RN-PRV-003.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_proveedor` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador. |
| `nombre` | VARCHAR(150) | No | IDX | No vacío | Nombre comercial o razón social. |
| `identificacion_fiscal` | VARCHAR(50) | Sí | UQ | Única cuando exista | Identificación fiscal. |
| `contacto` | VARCHAR(150) | Sí | — | — | Persona de contacto. |
| `telefono` | VARCHAR(30) | Sí | — | — | Teléfono. |
| `correo` | VARCHAR(150) | Sí | — | Formato válido | Correo. |
| `direccion` | VARCHAR(255) | Sí | — | — | Dirección. |
| `estado` | VARCHAR(20) | No | IDX | `activo` o `inactivo` | Estado lógico. |
| `creado_en` | DATETIME | No | — | — | Creación. |
| `actualizado_en` | DATETIME | No | — | — | Modificación. |

- **Clave primaria:** `id_proveedor`.
- **Claves foráneas:** ninguna.
- **Restricciones únicas:** `identificacion_fiscal` cuando exista.
- **Índices recomendados:** `nombre`, `identificacion_fiscal`, `estado`.
- **Reglas de integridad:** las compras nuevas requieren proveedor activo.
- **Política de eliminación o desactivación:** desactivación lógica; conservar proveedores con compras históricas.

### 7.12 `compras`

**Propósito:** Conservar encabezado, estado y totales de cada compra.

**Reglas relacionadas:** RN-COM-001 a RN-COM-007; RN-CON-002.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_compra` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador. |
| `numero_compra` | VARCHAR(50) | No | UQ | Único | Número interno. |
| `numero_documento_proveedor` | VARCHAR(80) | Sí | IDX | — | Documento externo. |
| `id_proveedor` | BIGINT UNSIGNED | No | FK | Proveedor activo al crear | Proveedor. |
| `id_usuario` | BIGINT UNSIGNED | No | FK | Usuario autorizado | Responsable. |
| `fecha_compra` | DATETIME | No | IDX | — | Fecha operativa. |
| `subtotal` | DECIMAL(12,2) | No | — | Mayor o igual que cero | Subtotal histórico. |
| `descuento` | DECIMAL(12,2) | No | — | Mayor o igual que cero | Descuento histórico. |
| `impuesto` | DECIMAL(12,2) | No | — | Mayor o igual que cero | Impuesto histórico. |
| `total` | DECIMAL(12,2) | No | — | Mayor o igual que cero | Total definitivo. |
| `estado` | VARCHAR(20) | No | IDX | `borrador`, `recibida` o `anulada` | Estado de compra. |
| `observacion` | TEXT | Sí | — | — | Nota o motivo de anulación. |
| `creado_en` | DATETIME | No | — | — | Creación. |
| `actualizado_en` | DATETIME | No | — | — | Modificación. |

- **Clave primaria:** `id_compra`.
- **Claves foráneas:** `id_proveedor` → `proveedores`; `id_usuario` → `usuarios`.
- **Restricciones únicas:** `numero_compra`.
- **Índices recomendados:** `numero_compra`, `fecha_compra`, `estado`, compuesto `id_proveedor, fecha_compra`.
- **Reglas de integridad:** totales calculados en backend; una compra recibida no vuelve a borrador; anulación exige permiso, motivo y existencias suficientes.
- **Política de eliminación o desactivación:** borradores podrán descartarse según política futura; compras recibidas o anuladas nunca se eliminan físicamente.

### 7.13 `detalle_compras`

**Propósito:** Conservar productos, cantidades y valores históricos de la compra.

**Reglas relacionadas:** RN-COM-002 a RN-COM-004; RN-CON-002.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_detalle_compra` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador. |
| `id_compra` | BIGINT UNSIGNED | No | FK | Compra existente | Encabezado. |
| `id_producto` | BIGINT UNSIGNED | No | FK | Producto existente y activo al agregar | Producto. |
| `cantidad` | DECIMAL(12,3) | No | — | Mayor que cero | Cantidad adquirida. |
| `costo_unitario` | DECIMAL(12,2) | No | — | Mayor o igual que cero | Costo histórico unitario. |
| `descuento` | DECIMAL(12,2) | No | — | Mayor o igual que cero | Descuento histórico de línea. |
| `impuesto` | DECIMAL(12,2) | No | — | Mayor o igual que cero | Impuesto histórico de línea. |
| `subtotal` | DECIMAL(12,2) | No | — | Mayor o igual que cero | Subtotal histórico de línea. |
| `creado_en` | DATETIME | No | — | — | Fecha de creación. |

- **Clave primaria:** `id_detalle_compra`.
- **Claves foráneas:** `id_compra` → `compras`; `id_producto` → `productos`.
- **Restricciones únicas:** se recomienda impedir líneas duplicadas por `id_compra, id_producto`, salvo decisión de permitirlas.
- **Índices recomendados:** `id_compra`, `id_producto`.
- **Reglas de integridad:** una compra confirmable contiene al menos una línea; los valores no dependen del costo actual del producto. El detalle conserva cantidad y costo unitario de compra, pero no el costo promedio anterior del producto.
- **Política de eliminación o desactivación:** editable solo mientras la compra sea borrador; inmutable y no eliminable después de recibida o anulada.

### 7.14 `ventas`

**Propósito:** Conservar encabezado, facturación, caja, estado y totales de ventas.

**Reglas relacionadas:** RN-VEN-001 a RN-VEN-008; RN-FAC-001 a RN-FAC-004; RN-CAJ-001; RN-CON-002.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_venta` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador. |
| `numero_venta` | VARCHAR(50) | No | UQ | Único | Número interno. |
| `numero_factura` | VARCHAR(50) | Sí | UQ | Único al completar, no reutilizable | Número de comprobante. |
| `id_cliente` | BIGINT UNSIGNED | No | FK | Cliente activo al crear | Cliente. |
| `id_usuario` | BIGINT UNSIGNED | No | FK | Usuario autorizado | Vendedor. |
| `id_caja` | BIGINT UNSIGNED | Sí | FK | Obligatoria si control de caja está activo | Sesión de caja. |
| `fecha_venta` | DATETIME | No | IDX | — | Fecha operativa. |
| `subtotal` | DECIMAL(12,2) | No | — | Mayor o igual que cero | Subtotal histórico. |
| `descuento` | DECIMAL(12,2) | No | — | Mayor o igual que cero | Descuento autorizado. |
| `impuesto` | DECIMAL(12,2) | No | — | Mayor o igual que cero | Impuesto histórico. |
| `total` | DECIMAL(12,2) | No | — | Mayor o igual que cero | Total definitivo. |
| `estado` | VARCHAR(20) | No | IDX | `preparacion`, `completada` o `anulada` | Estado. |
| `motivo_anulacion` | VARCHAR(500) | Sí | — | Obligatorio si anulada | Motivo. |
| `anulada_por` | BIGINT UNSIGNED | Sí | FK | Obligatorio si anulada | Usuario anulador. |
| `anulada_en` | DATETIME | Sí | — | Obligatorio si anulada | Fecha de anulación. |
| `creado_en` | DATETIME | No | — | — | Creación. |

- **Clave primaria:** `id_venta`.
- **Claves foráneas:** `id_cliente` → `clientes`; `id_usuario` y `anulada_por` → `usuarios`; `id_caja` → `cajas`.
- **Restricciones únicas:** `numero_venta`; `numero_factura` cuando exista.
- **Índices recomendados:** `numero_factura`, `fecha_venta`, `estado`, compuesto `id_usuario, fecha_venta`, `id_cliente`, `id_caja`.
- **Reglas de integridad:** una completada requiere detalle, pagos exactos, existencias y número de factura; una anulada conserva números y no se reconfirma.
- **Política de eliminación o desactivación:** preparaciones podrán descartarse según política futura; completadas y anuladas no se editan ni eliminan.

### 7.15 `detalle_ventas`

**Propósito:** Conservar cantidades, precios, costos e importes históricos de cada venta.

**Reglas relacionadas:** RN-VEN-002 a RN-VEN-006; RN-REP-005.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_detalle_venta` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador. |
| `id_venta` | BIGINT UNSIGNED | No | FK | Venta existente | Encabezado. |
| `id_producto` | BIGINT UNSIGNED | No | FK | Producto activo al agregar | Producto. |
| `cantidad` | DECIMAL(12,3) | No | — | Mayor que cero | Cantidad vendida. |
| `costo_unitario_historico` | DECIMAL(12,2) | No | — | Mayor o igual que cero | Base histórica de utilidad. |
| `precio_unitario` | DECIMAL(12,2) | No | — | Mayor que cero | Precio histórico. |
| `descuento` | DECIMAL(12,2) | No | — | Mayor o igual que cero | Descuento de línea. |
| `impuesto` | DECIMAL(12,2) | No | — | Mayor o igual que cero | Impuesto de línea. |
| `subtotal` | DECIMAL(12,2) | No | — | Mayor o igual que cero | Subtotal de línea. |
| `creado_en` | DATETIME | No | — | — | Creación. |

- **Clave primaria:** `id_detalle_venta`.
- **Claves foráneas:** `id_venta` → `ventas`; `id_producto` → `productos`.
- **Restricciones únicas:** se recomienda impedir líneas duplicadas por `id_venta, id_producto`, salvo decisión contraria.
- **Índices recomendados:** `id_venta`, `id_producto`.
- **Reglas de integridad:** al completar debe existir al menos una línea; precio y costo histórico quedan inmutables.
- **Política de eliminación o desactivación:** editable solo en preparación; no eliminar ni editar tras completar o anular.

### 7.16 `metodos_pago`

**Propósito:** Definir medios de pago y si exigen referencia.

**Reglas relacionadas:** RN-PAG-001; RN-PAG-004.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_metodo_pago` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador. |
| `nombre` | VARCHAR(80) | No | UQ | Único | Nombre. |
| `requiere_referencia` | BOOLEAN | No | — | — | Exige referencia en pago. |
| `es_efectivo` | BOOLEAN | No | — | Solo efectivo verdadero inicialmente | Determina cambio y caja. |
| `estado` | VARCHAR(20) | No | IDX | `activo` o `inactivo` | Estado lógico. |
| `creado_en` | DATETIME | No | — | — | Creación. |
| `actualizado_en` | DATETIME | No | — | — | Modificación. |

- **Clave primaria:** `id_metodo_pago`.
- **Claves foráneas:** ninguna.
- **Restricciones únicas:** `nombre`.
- **Índices recomendados:** `nombre`, `estado`.
- **Reglas de integridad:** deben existir Efectivo, Tarjeta y Transferencia; solo los activos se usan en pagos nuevos.
- **Política de eliminación o desactivación:** desactivación lógica; conservar métodos con pagos históricos.

### 7.17 `pagos_venta`

**Propósito:** Registrar uno o varios pagos por venta y el cambio correspondiente al efectivo.

**Reglas relacionadas:** RN-PAG-002 a RN-PAG-005; RN-VEN-006.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_pago` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador. |
| `id_venta` | BIGINT UNSIGNED | No | FK | Venta existente | Venta pagada. |
| `id_metodo_pago` | BIGINT UNSIGNED | No | FK | Método activo al registrar | Método. |
| `monto` | DECIMAL(12,2) | No | — | Mayor que cero | Importe aplicado al total. |
| `referencia` | VARCHAR(120) | Sí | — | Obligatoria si el método la exige | Referencia externa no sensible. |
| `monto_recibido` | DECIMAL(12,2) | Sí | — | Solo para efectivo; mayor o igual que monto | Efectivo entregado. |
| `cambio` | DECIMAL(12,2) | No | — | Mayor o igual que cero; solo efectivo | Cambio entregado. |
| `creado_en` | DATETIME | No | — | — | Fecha del pago. |

- **Clave primaria:** `id_pago`.
- **Claves foráneas:** `id_venta` → `ventas`; `id_metodo_pago` → `metodos_pago`.
- **Restricciones únicas:** ninguna general; la referencia podrá requerir unicidad según el método, decisión pendiente.
- **Índices recomendados:** `id_venta`, `id_metodo_pago`, `referencia` cuando se use para conciliación.
- **Reglas de integridad:** suma aplicada igual al total; cambio solo sobre efectivo; no almacenar datos completos de tarjeta; conservar pagos de ventas anuladas.
- **Política de eliminación o desactivación:** no eliminar pagos de ventas completadas o anuladas.

### 7.18 `movimientos_inventario`

**Propósito:** Registrar de forma inmutable todo cambio confirmado de existencias.

**Reglas relacionadas:** RN-INV-001 a RN-INV-005; RN-COM-004; RN-COM-007; RN-VEN-006; RN-VEN-008.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_movimiento_inventario` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador. |
| `id_producto` | BIGINT UNSIGNED | No | FK | Producto existente | Producto afectado. |
| `tipo_movimiento` | VARCHAR(40) | No | IDX | Tipo controlado | Compra, venta, anulación o ajuste. |
| `naturaleza` | VARCHAR(10) | No | — | `entrada` o `salida` | Sentido del movimiento. |
| `cantidad` | DECIMAL(12,3) | No | — | Mayor que cero | Magnitud absoluta. |
| `existencia_anterior` | DECIMAL(12,3) | No | — | Mayor o igual que cero | Saldo previo. |
| `existencia_posterior` | DECIMAL(12,3) | No | — | Mayor o igual que cero | Saldo resultante. |
| `tipo_referencia` | VARCHAR(40) | No | IDX | Tipo controlado | Entidad de origen. |
| `id_referencia` | BIGINT UNSIGNED | No | IDX | Positivo | Identificador de origen. |
| `motivo` | VARCHAR(500) | Sí | — | Obligatorio para ajustes y anulaciones | Justificación. |
| `id_usuario` | BIGINT UNSIGNED | No | FK | Usuario responsable | Actor. |
| `fecha_movimiento` | DATETIME | No | IDX | — | Fecha operativa. |

- **Clave primaria:** `id_movimiento_inventario`.
- **Claves foráneas:** `id_producto` → `productos`; `id_usuario` → `usuarios`. El origen polimórfico se valida en el servicio transaccional.
- **Restricciones únicas:** se evaluará una clave de idempotencia por operación y producto durante el diseño técnico.
- **Índices recomendados:** compuesto `id_producto, fecha_movimiento`; `tipo_referencia, id_referencia`; `tipo_movimiento`.
- **Reglas de integridad:** saldos coherentes con naturaleza y cantidad; saldo posterior nunca negativo; todo movimiento corresponde a una operación confirmada.
- **Política de eliminación o desactivación:** inmutable; no editar ni eliminar, corregir mediante movimiento inverso o ajuste.

### 7.19 `cajas`

**Propósito:** Representar una sesión de caja abierta y cerrada por usuario.

**Reglas relacionadas:** RN-CAJ-001 a RN-CAJ-006.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_caja` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador de sesión. |
| `id_usuario` | BIGINT UNSIGNED | No | FK | Usuario activo | Responsable. |
| `fecha_apertura` | DATETIME | No | IDX | — | Apertura. |
| `monto_apertura` | DECIMAL(12,2) | No | — | Mayor o igual que cero | Fondo inicial. |
| `fecha_cierre` | DATETIME | Sí | IDX | No anterior a apertura | Cierre. |
| `monto_cierre` | DECIMAL(12,2) | Sí | — | Mayor o igual que cero | Monto declarado al cerrar. |
| `monto_esperado` | DECIMAL(12,2) | Sí | — | — | Efectivo calculado. |
| `monto_contado` | DECIMAL(12,2) | Sí | — | Mayor o igual que cero | Efectivo contado. |
| `diferencia` | DECIMAL(12,2) | Sí | — | Puede ser positiva, cero o negativa | Diferencia de cierre. |
| `estado` | VARCHAR(20) | No | IDX | `abierta` o `cerrada` | Estado. |
| `observacion` | VARCHAR(500) | Sí | — | — | Nota de apertura o cierre. |
| `creado_en` | DATETIME | No | — | — | Creación. |
| `actualizado_en` | DATETIME | No | — | — | Modificación. |

- **Clave primaria:** `id_caja`.
- **Claves foráneas:** `id_usuario` → `usuarios`.
- **Restricciones únicas:** una sola caja abierta por usuario, garantizada mediante mecanismo compatible con MariaDB/MySQL y validación transaccional.
- **Índices recomendados:** `id_usuario, estado`, `fecha_apertura`, `fecha_cierre`.
- **Reglas de integridad:** campos de cierre obligatorios solo al cerrar; una cerrada no recibe movimientos.
- **Política de eliminación o desactivación:** sesiones con movimientos o cerradas no se eliminan ni reabren.

### 7.20 `movimientos_caja`

**Propósito:** Registrar ventas, ingresos, egresos, devoluciones o anulaciones y distinguir su efecto en efectivo.

**Reglas relacionadas:** RN-CAJ-004 a RN-CAJ-006; RN-VEN-006; RN-PAG-004.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_movimiento_caja` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador. |
| `id_caja` | BIGINT UNSIGNED | No | FK | Caja abierta al registrar | Caja. |
| `id_venta` | BIGINT UNSIGNED | Sí | FK | Obligatoria para venta o anulación asociada | Venta origen. |
| `id_usuario` | BIGINT UNSIGNED | No | FK | Usuario responsable | Actor. |
| `tipo_movimiento` | VARCHAR(30) | No | IDX | `venta`, `ingreso`, `egreso`, `devolucion` o `anulacion` | Tipo. |
| `naturaleza` | VARCHAR(10) | No | — | `entrada` o `salida` | Sentido monetario. |
| `afecta_efectivo` | BOOLEAN | No | IDX | — | Distingue efectivo de otros medios. |
| `monto` | DECIMAL(12,2) | No | — | Mayor que cero | Importe. |
| `concepto` | VARCHAR(255) | No | — | No vacío | Justificación. |
| `fecha_movimiento` | DATETIME | No | IDX | — | Fecha operativa. |
| `creado_en` | DATETIME | No | — | — | Registro. |

- **Clave primaria:** `id_movimiento_caja`.
- **Claves foráneas:** `id_caja` → `cajas`; `id_venta` → `ventas`; `id_usuario` → `usuarios`.
- **Restricciones únicas:** se definirá control de idempotencia para efectos de una venta o anulación.
- **Índices recomendados:** `id_caja, fecha_movimiento`, `id_venta`, `tipo_movimiento`, `afecta_efectivo`.
- **Reglas de integridad:** una caja cerrada no acepta movimientos; ingresos y egresos requieren concepto; solo movimientos de efectivo integran el efectivo esperado.
- **Política de eliminación o desactivación:** inmutable después de registrarse; correcciones mediante movimiento compensatorio.

### 7.21 `bitacora`

**Propósito:** Conservar evidencia consultable de acciones críticas y sus resultados.

**Reglas relacionadas:** RN-BIT-001 a RN-BIT-004; RN-BKP-005.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_bitacora` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador. |
| `id_usuario` | BIGINT UNSIGNED | Sí | FK | Nulo para actor no autenticado o sistema | Usuario. |
| `modulo` | VARCHAR(80) | No | IDX | Módulo controlado | Área funcional. |
| `accion` | VARCHAR(100) | No | IDX | Acción controlada | Evento. |
| `entidad` | VARCHAR(80) | Sí | IDX | — | Tipo de registro afectado. |
| `id_entidad` | BIGINT UNSIGNED | Sí | IDX | — | Identificador afectado. |
| `datos_anteriores` | LONGTEXT | Sí | — | JSON válido cuando exista, saneado | Estado anterior. |
| `datos_nuevos` | LONGTEXT | Sí | — | JSON válido cuando exista, saneado | Estado posterior. |
| `direccion_ip` | VARCHAR(45) | Sí | — | IPv4 o IPv6 | Origen de red. |
| `resultado` | VARCHAR(30) | No | IDX | Resultado controlado | Éxito o fallo. |
| `fecha_evento` | DATETIME | No | IDX | — | Fecha del evento. |

- **Clave primaria:** `id_bitacora`.
- **Claves foráneas:** `id_usuario` → `usuarios`; se permite nulo para intentos fallidos sin identidad válida y procesos del sistema.
- **Restricciones únicas:** ninguna.
- **Índices recomendados:** `fecha_evento`, `id_usuario, fecha_evento`, `modulo, accion`, `entidad, id_entidad`, `resultado`.
- **Reglas de integridad:** sanear datos para excluir contraseñas, hashes, tokens, datos completos de tarjeta y rutas sensibles.
- **Política de eliminación o desactivación:** inmutable desde la aplicación; retención administrativa pendiente.

### 7.22 `configuracion`

**Propósito:** Almacenar parámetros configurables de la única sucursal mediante clave y valor.

**Reglas relacionadas:** RN-CON-001 a RN-CON-005; RN-AUT-003; RN-CAJ-001.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_configuracion` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador. |
| `clave` | VARCHAR(120) | No | UQ | Única, estable | Nombre del parámetro. |
| `valor` | TEXT | No | — | Compatible con tipo declarado | Valor serializado. |
| `tipo_dato` | VARCHAR(30) | No | — | Tipo controlado | Texto, decimal, entero, lógico o JSON. |
| `descripcion` | VARCHAR(255) | Sí | — | — | Finalidad. |
| `es_critica` | BOOLEAN | No | IDX | — | Exige permiso reforzado. |
| `id_usuario_actualizacion` | BIGINT UNSIGNED | Sí | FK | Usuario autorizado; nulo en carga inicial | Último responsable. |
| `creado_en` | DATETIME | No | — | — | Creación. |
| `actualizado_en` | DATETIME | No | — | — | Modificación. |

- **Clave primaria:** `id_configuracion`.
- **Claves foráneas:** `id_usuario_actualizacion` → `usuarios`.
- **Restricciones únicas:** `clave`.
- **Índices recomendados:** `clave`, `es_critica`.
- **Reglas de integridad:** validar tipo y rango; incluir datos del negocio, impuesto, descuentos, numeración, seguridad y control de caja; cambios solo prospectivos.
- **Política de eliminación o desactivación:** no eliminar claves requeridas; cambios críticos se auditan y la estrategia de historial de valores queda pendiente.

### 7.23 `respaldos`

**Propósito:** Registrar metadatos y resultados de respaldos y restauraciones sin almacenar el archivo binario.

**Reglas relacionadas:** RN-BKP-001 a RN-BKP-006.

| Campo | Tipo sugerido | Nulo | Clave | Restricciones | Descripción |
|---|---|---:|---|---|---|
| `id_respaldo` | BIGINT UNSIGNED | No | PK | Autogenerado | Identificador. |
| `nombre_archivo` | VARCHAR(255) | No | IDX | Nombre seguro | Archivo generado o seleccionado. |
| `ruta_segura` | VARCHAR(500) | No | — | Fuera de carpetas públicas; no exponer | Ruta interna. |
| `tamano_bytes` | BIGINT UNSIGNED | Sí | — | Mayor o igual que cero | Tamaño del archivo. |
| `tipo` | VARCHAR(30) | No | IDX | `manual`, `preventivo` o tipo aprobado | Clasificación. |
| `operacion` | VARCHAR(20) | No | IDX | `respaldo` o `restauracion` | Proceso ejecutado. |
| `estado` | VARCHAR(30) | No | IDX | Estado controlado | En proceso, exitoso o fallido. |
| `id_usuario` | BIGINT UNSIGNED | No | FK | Usuario con permiso | Responsable. |
| `mensaje_resultado` | TEXT | Sí | — | Sin rutas o secretos expuestos al cliente | Resultado técnico saneado. |
| `fecha_operacion` | DATETIME | No | IDX | — | Fecha del proceso. |
| `creado_en` | DATETIME | No | — | — | Registro. |

- **Clave primaria:** `id_respaldo`.
- **Claves foráneas:** `id_usuario` → `usuarios`.
- **Restricciones únicas:** se recomienda identificar de manera única cada archivo gestionado mediante nombre y fecha o un identificador seguro.
- **Índices recomendados:** `fecha_operacion`, `estado`, `operacion`, `id_usuario, fecha_operacion`, `nombre_archivo`.
- **Reglas de integridad:** restaurar solo archivos validados; crear respaldo preventivo; registrar éxito o fallo; nunca enviar `ruta_segura` al frontend.
- **Política de eliminación o desactivación:** conservar metadatos según política de retención; eliminar archivos solo mediante procedimiento autorizado y sin borrar evidencia requerida.

## 8. Relaciones y cardinalidades

| Relación | Cardinalidad | Regla relacional |
|---|---|---|
| `usuarios` — `roles` | N:M mediante `usuario_roles` | Un usuario puede asociarse a varios roles y un rol a varios usuarios. |
| `roles` — `permisos` | N:M mediante `rol_permisos` | Un rol reúne varios permisos y un permiso puede pertenecer a varios roles. |
| `categorias` — `productos` | 1:N | Cada producto tiene una categoría; una categoría clasifica varios productos. |
| `marcas` — `productos` | 1:N | Cada producto tiene una marca; una marca agrupa varios productos. |
| `unidades_medida` — `productos` | 1:N | Cada producto tiene una unidad principal. |
| `proveedores` — `compras` | 1:N | Cada compra pertenece a un proveedor. |
| `compras` — `detalle_compras` | 1:N | Una compra confirmable contiene una o más líneas. |
| `productos` — `detalle_compras` | 1:N | Un producto puede aparecer en muchas compras. |
| `clientes` — `ventas` | 1:N | Cada venta pertenece a un cliente, incluido Consumidor final. |
| `usuarios` — `ventas` | 1:N | Cada venta registra un vendedor. |
| `cajas` — `ventas` | 1:N | Una caja agrupa ventas; la relación es obligatoria cuando el control está activo. |
| `ventas` — `detalle_ventas` | 1:N | Una venta confirmable contiene una o más líneas. |
| `productos` — `detalle_ventas` | 1:N | Un producto puede aparecer en muchas ventas. |
| `ventas` — `pagos_venta` | 1:N | Una venta completada contiene uno o varios pagos. |
| `metodos_pago` — `pagos_venta` | 1:N | Cada pago utiliza un método. |
| `productos` — `movimientos_inventario` | 1:N | Cada movimiento afecta un producto. |
| `usuarios` — `movimientos_inventario` | 1:N | Cada movimiento registra un responsable. |
| `usuarios` — `cajas` | 1:N | Un usuario puede tener varias sesiones históricas, solo una abierta. |
| `cajas` — `movimientos_caja` | 1:N | Cada movimiento pertenece a una caja. |
| `ventas` — `movimientos_caja` | 1:N opcional | Una venta puede originar movimientos de cobro o anulación. |
| `usuarios` — `bitacora` | 1:N opcional | Un evento puede asociarse a un usuario; se admite ausencia para eventos no autenticados. |
| `usuarios` — `respaldos` | 1:N | Cada proceso de respaldo o restauración registra responsable. |

## 9. Reglas de integridad

1. Todas las claves foráneas deberán referenciar registros existentes; no se usarán eliminaciones en cascada que borren historia.
2. `nombre_usuario`, códigos de permiso y producto, números de compra y venta, y números de factura serán únicos.
3. Correo de usuario, código de barras e identificaciones serán únicos cuando no sean nulos.
4. Cantidades operativas serán positivas; existencias y mínimos nunca serán negativos.
5. Precios serán positivos; costos, descuentos, impuestos y totales no serán negativos.
6. Una unidad que no permita decimales solo admitirá cantidades enteras.
7. Compras recibidas, ventas completadas y sus anulaciones no regresarán a estados editables.
8. Una compra o venta solo se confirmará con al menos una línea válida.
9. La suma neta de pagos deberá ser exactamente igual al total de la venta; el cambio solo corresponde a efectivo.
10. Los saldos anterior y posterior de cada movimiento deben coincidir con naturaleza y cantidad.
11. `productos.existencia` y el saldo de movimientos confirmados deberán permanecer conciliados.
12. Una caja cerrada no recibe movimientos y un usuario no mantiene dos cajas abiertas.
13. Una venta anulada conserva su numeración, pagos, detalles y trazabilidad.
14. Una compra no se anula cuando la reversión produzca inventario negativo.
15. La bitácora y los mensajes persistidos se sanearán antes de almacenar información.
16. Los cambios de configuración no recalcularán documentos históricos.

## 10. Estrategia de estados y eliminación lógica

| Grupo | Estados propuestos | Estrategia |
|---|---|---|
| Usuarios, roles y catálogos | `activo`, `inactivo` | Desactivación lógica; conservar referencias. |
| Productos, clientes y proveedores | `activo`, `inactivo` | No disponibles para operaciones nuevas cuando estén inactivos; visibles históricamente. |
| Compras | `borrador`, `recibida`, `anulada` | Solo borrador editable; recibida y anulada inmutables. |
| Ventas | `preparacion`, `completada`, `anulada` | Solo preparación editable; completada y anulada inmutables. |
| Cajas | `abierta`, `cerrada` | La cerrada no se reabre ni recibe movimientos. |
| Respaldos | Estado operativo controlado | Conservar resultados exitosos y fallidos según retención aprobada. |
| Movimientos y bitácora | Sin eliminación funcional | Registros inmutables; correcciones mediante eventos compensatorios. |

La eliminación física se reservará, si se aprueba, para borradores sin relaciones y datos técnicos sujetos a una política formal. No se aplicará a compras o ventas confirmadas, movimientos, pagos, cajas cerradas, comprobantes ni bitácora.

## 11. Índices recomendados

Los índices se seleccionan según búsquedas, filtros, relaciones y reportes previstos:

| Tabla | Índice recomendado | Justificación |
|---|---|---|
| `usuarios` | único `nombre_usuario`; único nullable `correo` | Autenticación y validación de duplicados. |
| `productos` | únicos `codigo`, `codigo_barras`; índice `nombre` | Búsqueda operativa y punto de venta. |
| `compras` | `fecha_compra`, `estado`, `id_proveedor, fecha_compra`, único `numero_compra` | Filtros por fecha, estado y proveedor. |
| `ventas` | `fecha_venta`, `estado`, `id_usuario, fecha_venta`, único `numero_factura` | Filtros por fecha, estado, vendedor y comprobante. |
| `movimientos_inventario` | `id_producto, fecha_movimiento` | Kardex y trazabilidad por producto y fecha. |
| `cajas` | `id_usuario, estado`, `fecha_apertura` | Control de caja abierta e historial. |
| `movimientos_caja` | `id_caja, fecha_movimiento`, `id_venta` | Cierre, historial y anulación. |
| `bitacora` | `fecha_evento`, `id_usuario, fecha_evento`, `modulo, accion` | Consulta de auditoría. |
| `respaldos` | `fecha_operacion`, `estado`, `id_usuario, fecha_operacion` | Historial y seguimiento. |

Las claves foráneas tendrán índices cuando no queden cubiertas por una clave primaria o índice compuesto. Antes de crear índices adicionales se comprobarán las consultas reales y los planes de ejecución para evitar costo de escritura innecesario.

## 12. Transacciones críticas

### 12.1 Confirmar compra

1. Bloquear y validar el borrador, proveedor activo y detalle.
2. Recalcular importes en el backend.
3. Cambiar la compra a `recibida`.
4. Actualizar existencias y costo conforme a la política aprobada.
5. Crear un movimiento de inventario por producto con saldos anterior y posterior.
6. Registrar bitácora y confirmar todo; ante error, revertir todo.

### 12.2 Anular compra

1. Validar estado, permiso y motivo.
2. Bloquear productos y comprobar que la reversión no genere negativos.
3. Crear movimientos inversos y actualizar existencias.
4. Cambiar la compra a `anulada` y conservar detalle e importes.
5. Registrar bitácora y confirmar todo o revertirlo.

### 12.3 Confirmar venta

1. Validar preparación, cliente, vendedor, caja cuando aplique, detalle y existencias bloqueadas.
2. Recalcular precios, descuentos, impuestos y total.
3. Copiar precio y costo histórico al detalle.
4. Validar y registrar pagos simples o combinados y cambio en efectivo.
5. Asignar números únicos, cambiar estado y reducir existencias.
6. Crear movimientos de inventario y caja, registrar bitácora y confirmar todo o revertirlo.

### 12.4 Anular venta

1. Validar venta completada, permiso y motivo.
2. Restaurar existencias y generar movimientos inversos.
3. Registrar el efecto compensatorio en caja sin borrar pagos originales.
4. Cambiar a `anulada`, guardar responsable y fecha, conservar numeración.
5. Registrar bitácora y confirmar todo o revertirlo.

### 12.5 Ajustar inventario

1. Validar permiso, producto y motivo.
2. Bloquear el saldo actual y comprobar el resultado no negativo.
3. Actualizar existencia y crear movimiento con ambos saldos.
4. Registrar bitácora y confirmar todo o revertirlo.

### 12.6 Abrir caja

1. Validar usuario activo, permiso, monto no negativo y ausencia de otra caja abierta.
2. Crear la sesión abierta y registrar bitácora dentro de una transacción.

### 12.7 Cerrar caja

1. Bloquear la caja abierta e impedir nuevos movimientos concurrentes.
2. Calcular efectivo esperado solo con movimientos que afectan efectivo.
3. Registrar monto contado, diferencia, fecha y estado cerrado.
4. Registrar bitácora y confirmar todo o revertirlo.

### 12.8 Restaurar respaldo

1. Validar permiso, confirmación, archivo, integridad y compatibilidad.
2. Impedir operaciones transaccionales incompatibles.
3. Crear y verificar un respaldo preventivo con sus metadatos.
4. Ejecutar la restauración mediante el mecanismo del servidor.
5. Verificar consistencia, registrar resultado exitoso o fallido y liberar el bloqueo operativo.

La restauración es una operación de infraestructura que puede requerir límites transaccionales distintos a una transacción SQL única; el procedimiento deberá garantizar recuperación al respaldo preventivo si falla.

## 13. Datos iniciales requeridos

1. **Roles:** Administrador, Vendedor y Consulta, marcados como roles del sistema y activos.
2. **Permisos mínimos:** autenticación; consulta y gestión de usuarios; roles y permisos; catálogos; productos; clientes; proveedores; compras; inventario; ventas; facturación; pagos; caja; dashboard; reportes; bitácora; respaldos; restauraciones y configuración. La matriz exacta queda pendiente.
3. **Métodos de pago:** Efectivo (`es_efectivo` verdadero), Tarjeta y Transferencia; la exigencia de referencia se definirá formalmente.
4. **Unidades de medida:** al menos unidad y las unidades comerciales aprobadas antes de la carga; cada una indicará si permite decimales.
5. **Cliente:** un único cliente activo “Consumidor final”, marcado mediante `es_consumidor_final`.
6. **Configuración inicial:** datos del negocio, parámetros de impuesto y descuento pendientes, numeración inicial pendiente, bloqueo de autenticación y activación del control de caja.
7. **Usuario administrador inicial:** identidad administrativa activa con asignación al rol Administrador; su contraseña real no se documentará y el dato inicial contendrá únicamente un hash bcrypt generado de forma segura durante el despliegue.

## 14. Diagrama entidad-relación textual

```text
USUARIOS 1 ---- N USUARIO_ROLES N ---- 1 ROLES
ROLES 1 ---- N ROL_PERMISOS N ---- 1 PERMISOS

CATEGORIAS 1 ---- N PRODUCTOS
MARCAS 1 ---- N PRODUCTOS
UNIDADES_MEDIDA 1 ---- N PRODUCTOS

PROVEEDORES 1 ---- N COMPRAS
USUARIOS 1 ---- N COMPRAS
COMPRAS 1 ---- N DETALLE_COMPRAS N ---- 1 PRODUCTOS

CLIENTES 1 ---- N VENTAS
USUARIOS 1 ---- N VENTAS
CAJAS 1 ---- N VENTAS
VENTAS 1 ---- N DETALLE_VENTAS N ---- 1 PRODUCTOS
VENTAS 1 ---- N PAGOS_VENTA N ---- 1 METODOS_PAGO

PRODUCTOS 1 ---- N MOVIMIENTOS_INVENTARIO
USUARIOS 1 ---- N MOVIMIENTOS_INVENTARIO

USUARIOS 1 ---- N CAJAS
CAJAS 1 ---- N MOVIMIENTOS_CAJA
VENTAS 1 ---- N MOVIMIENTOS_CAJA

USUARIOS 1 ---- N BITACORA
USUARIOS 1 ---- N RESPALDOS
USUARIOS 1 ---- N CONFIGURACION
```

Las relaciones desde `ventas` hacia `cajas`, desde `ventas` hacia `movimientos_caja`, desde `usuarios` hacia `bitacora` y desde `usuarios` hacia `configuracion` admiten ausencia en los casos expresamente definidos. El diagrama muestra la relación lógica principal y no reemplaza las reglas de nulabilidad de cada tabla.

## 15. Decisiones pendientes

1. Tasa inicial de impuesto, rangos válidos y reglas de redondeo.
2. Tipos, límites y rangos de descuentos.
3. Datos obligatorios y normalización de clientes y proveedores.
4. Formato, serie y numeración inicial de ventas, compras y comprobantes.
5. Política de retención, ubicación, cifrado, validación y eliminación de archivos de respaldo.
6. Uso de `ENUM`, restricciones `CHECK` o tablas catálogo para estados, tipos de movimientos y resultados.
7. Criterio de comparación de valores únicos respecto de mayúsculas, espacios y acentos.
8. Reglas de unicidad para documentos de proveedor, referencias de pago y líneas repetidas de detalle.
9. Política de conservación histórica de cambios en `usuario_roles`, `rol_permisos` y `configuracion` sin agregar tablas fuera del alcance actual.
10. Límite de intentos fallidos, duración del bloqueo y parámetros de seguridad.
11. Métodos de pago que exigirán referencia y formato de esta.
12. Mecanismo técnico para garantizar una sola caja abierta por usuario en MariaDB/MySQL.
13. Tipos exactos de ajustes, referencias y movimientos de inventario y caja.
14. Tratamiento exacto en caja para pagos no efectivos, anulaciones y devoluciones.
15. Política para descartar físicamente borradores sin relaciones, si se permite.
16. Retención de bitácora y nivel de detalle de los datos anteriores y nuevos.
17. Procedimiento de exclusión operativa y recuperación ante una restauración fallida.

## 16. Criterios de validación del modelo

1. Están definidas las 23 tablas obligatorias y ninguna entidad adicional sin justificación.
2. Cada tabla identifica propósito, reglas relacionadas, campos, clave primaria, claves foráneas, restricciones únicas, índices, integridad y política de eliminación.
3. Las claves primarias y foráneas tienen tipos compatibles y nombres coherentes.
4. Las cardinalidades documentadas coinciden con las claves foráneas y nulabilidad propuestas.
5. Los valores monetarios y cantidades utilizan la precisión establecida y no existe uso de `FLOAT`.
6. Las pruebas del esquema futuro rechazan duplicados obligatorios, referencias inexistentes, importes inválidos e inventario negativo.
7. Los flujos de compra, venta, anulación, inventario y caja demuestran atomicidad mediante fallos controlados.
8. Una conciliación de inventario reproduce `productos.existencia` a partir de movimientos confirmados.
9. Las operaciones históricas conservan costos, precios, descuentos, impuestos, pagos, numeración y responsables después de cambios de configuración.
10. Los roles iniciales, métodos de pago, Consumidor final, configuración y Administrador inicial pueden cargarse sin credenciales reales.
11. La bitácora y los respaldos no exponen secretos, datos completos de tarjetas ni rutas internas al frontend.
12. Los índices responden a consultas previstas y se revisan con planes de ejecución antes de agregar otros.
13. La estructura futura puede crearse íntegramente con InnoDB y `utf8mb4` en la versión objetivo de MariaDB/MySQL de XAMPP.
14. No existen eliminaciones en cascada capaces de borrar información histórica.
15. Todas las decisiones pendientes quedan resueltas o documentadas como supuestos aprobados antes de generar el esquema definitivo.
