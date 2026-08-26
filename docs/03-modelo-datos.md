# Modelo de datos implementado

## 1. Propósito y fuente de verdad

Este documento describe el modelo de persistencia actualmente implementado por LIQUORIX. La definición ejecutable se encuentra en `database/schema.sql`; los contratos del backend y las reglas de negocio determinan cómo se utilizan las tablas.

El alcance corresponde a una sola sucursal y utiliza MariaDB/MySQL, InnoDB, `utf8mb4`, claves primarias y foráneas, restricciones `CHECK`, índices y tipos `DECIMAL` para dinero y cantidades.

## 2. Convenciones estructurales

- Tablas y columnas en `snake_case`.
- PK numéricas `BIGINT UNSIGNED` autoincrementales, salvo tablas puente con PK compuesta.
- Relaciones históricas con `ON UPDATE RESTRICT` y `ON DELETE RESTRICT`; no hay cascadas que borren operaciones.
- Importes en `DECIMAL(12,2)` y cantidades en `DECIMAL(12,3)`.
- Fechas operativas en `DATETIME`.
- Estados cerrados controlados mediante `CHECK`.

## 3. Inventario de tablas

El esquema define 24 tablas:

| Grupo | Tabla | Propósito |
|---|---|---|
| Seguridad | `usuarios` | Identidad, hash, estado, intentos fallidos y bloqueo. |
| Seguridad | `roles` | Roles del sistema y estado. |
| Seguridad | `permisos` | Catálogo de permisos por código único. |
| Seguridad | `usuario_roles` | Asignación de usuarios a roles. |
| Seguridad | `rol_permisos` | Asignación de permisos a roles. |
| Catálogos | `categorias` | Categorías de productos. |
| Catálogos | `marcas` | Marcas y referencia opcional de logo. |
| Catálogos | `unidades_medida` | Unidades y control de decimales. |
| Productos | `productos` | Clasificación, precios, costo y existencias. |
| Directorio | `clientes` | Clientes y Consumidor final. |
| Directorio | `proveedores` | Proveedores y contacto. |
| Compras | `compras` | Encabezado, totales, proveedor, usuario y estado. |
| Compras | `detalle_compras` | Productos y valores de la compra. |
| Pagos | `metodos_pago` | Métodos y características operativas. |
| Caja | `cajas` | Apertura, cierre, valores y propietario. |
| Ventas | `ventas` | Cliente, vendedor, caja, totales, factura y anulación. |
| Ventas | `detalle_ventas` | Valores históricos por línea. |
| Ventas | `pagos_venta` | Distribución de pagos y cambio. |
| Inventario | `ajustes_inventario` | Ajustes explícitos con motivo y saldos. |
| Inventario | `movimientos_inventario` | Historial de entradas y salidas. |
| Caja | `movimientos_caja` | Movimientos manuales o vinculados a ventas. |
| Auditoría | `bitacora` | Eventos críticos, IP, resultado e instantáneas. |
| Configuración | `configuracion` | Parámetros tipados y responsable de actualización. |
| Recuperación | `respaldos` | Metadata, checksum y relaciones de restauración. |

## 4. Seguridad y autorización

### 4.1 `usuarios`

La PK es `id_usuario`. `nombre_usuario` es obligatorio y único; `correo` es opcional y único. `password_hash` contiene únicamente el hash bcrypt. El estado es `activo` o `inactivo`; `intentos_fallidos`, `bloqueado_hasta` y `ultimo_acceso` sostienen el control de acceso.

### 4.2 Roles y permisos

`roles.nombre` y `permisos.codigo` son únicos. `usuario_roles` relaciona `usuarios` con `roles` y conserva `asignado_por`, también FK a `usuarios`. `rol_permisos` relaciona `roles` con `permisos`. Ambas tablas puente tienen PK compuesta.

El esquema admite relaciones N:M; el servicio de usuarios actual administra un rol por usuario.

## 5. Catálogos, productos y directorios

### 5.1 `categorias`, `marcas` y `unidades_medida`

Categorías y marcas tienen nombre único y estado `activo` o `inactivo`. Las unidades tienen nombre y abreviatura únicos, booleano `permite_decimales` y el mismo conjunto de estados.

`marcas.imagen_referencia` almacena opcionalmente una referencia segura al archivo del logo, no el binario. Su `CHECK` admite el nombre controlado con extensión JPEG, PNG o WebP.

### 5.2 `productos`

Cada producto referencia obligatoriamente categoría, marca y unidad. `codigo` es único; `codigo_barras` es opcional y único.

Los campos principales son `costo_promedio DECIMAL(12,2)`, `precio_venta DECIMAL(12,2)`, `existencia DECIMAL(12,3)`, `existencia_minima DECIMAL(12,3)` y `porcentaje_impuesto DECIMAL(5,2)`. Costo, existencia, mínimo e impuesto no pueden ser negativos y el precio debe ser mayor que cero. El estado es `activo` o `inactivo`.

`productos.imagen_referencia` guarda opcionalmente una referencia segura al archivo, nunca el binario, con el mismo formato controlado que los logos.

### 5.3 `clientes` y `proveedores`

`clientes.identificacion` y `proveedores.identificacion_fiscal` son opcionales y únicos. Ambas tablas usan estados `activo` o `inactivo`.

`clientes.es_consumidor_final` identifica el cliente predeterminado. El seed crea ese registro y el backend impide modificarlo o desactivarlo. El esquema controla el booleano y el servicio completa la protección funcional.

## 6. Compras

`compras` referencia proveedor y usuario. `numero_compra` es único y los estados son `borrador`, `recibida` y `anulada`. Subtotal, descuento, impuesto y total son no negativos.

`detalle_compras` referencia compra y producto. Conserva cantidad, costo unitario, descuento, impuesto y subtotal; la cantidad es positiva y los importes no negativos.

```text
proveedores 1 ── N compras N ── 1 usuarios
compras     1 ── N detalle_compras N ── 1 productos
```

La confirmación y anulación usan transacciones del backend y sus efectos quedan en `movimientos_inventario`.

## 7. Inventario

La existencia actual reside en `productos.existencia`. Su `CHECK` y las validaciones transaccionales impiden valores negativos.

`ajustes_inventario` registra producto, usuario, naturaleza `entrada` o `salida`, cantidad, saldos anterior/posterior, motivo y fecha. Las cantidades son positivas y los saldos no negativos.

`movimientos_inventario` conserva producto, usuario, tipo, naturaleza, cantidad, saldos, tipo e ID de referencia, motivo y fecha. `id_referencia` identifica lógicamente la operación de origen; las FK directas son producto y usuario.

```text
productos 1 ── N ajustes_inventario N ── 1 usuarios
productos 1 ── N movimientos_inventario N ── 1 usuarios
```

## 8. Ventas, pagos y caja

### 8.1 Ventas

`ventas` referencia obligatoriamente cliente y usuario. `id_caja` es opcional según la configuración y el pago. `anulada_por` referencia opcionalmente al usuario anulador.

`numero_venta` es único; `numero_factura` es opcional durante preparación y único al asignarse. Los estados son `preparacion`, `completada` y `anulada`. Los totales son no negativos.

`detalle_ventas` referencia venta y producto y conserva costo unitario histórico, precio, cantidad, descuento, impuesto y subtotal. Cantidad y precio son positivos; los demás valores económicos no negativos.

### 8.2 Pagos

`metodos_pago` define nombre único, si requiere referencia, si es efectivo y estado `activo` o `inactivo`.

`pagos_venta` relaciona venta y método. El monto es positivo, el cambio no negativo y `monto_recibido`, cuando existe, debe cubrir el monto. Una venta puede tener varios pagos.

### 8.3 Caja

Cada registro de `cajas` pertenece a un usuario. Los estados son `abierta` y `cerrada`; la fecha de cierre no puede preceder a la apertura y los montos sujetos a `CHECK` no pueden ser negativos.

`movimientos_caja` referencia caja y usuario y puede referenciar una venta. Sus tipos son `venta`, `ingreso`, `egreso`, `devolucion` y `anulacion`; su naturaleza es `entrada` o `salida`. `afecta_efectivo` determina su participación en el cálculo y el monto es positivo.

```text
clientes 1 ── N ventas N ── 1 usuarios
cajas    1 ── N ventas
ventas   1 ── N detalle_ventas N ── 1 productos
ventas   1 ── N pagos_venta N ── 1 metodos_pago
cajas    1 ── N movimientos_caja N ── 1 usuarios
ventas   1 ── N movimientos_caja
```

El backend coordina venta, pagos, inventario, caja y bitácora en transacciones.

## 9. Bitácora

`bitacora` registra módulo, acción, entidad, ID de entidad, instantáneas anterior/nueva, IP, resultado y fecha. `id_usuario` es opcional y referencia a `usuarios` cuando existe.

La asociación con entidades auditadas es lógica mediante `entidad` e `id_entidad`; no existe una FK polimórfica. Los servicios sanean datos sensibles antes de exponerlos.

## 10. Configuración

`configuracion` usa `clave` única, `valor`, `tipo_dato`, descripción, `es_critica` y usuario de actualización. `id_usuario_actualizacion` referencia a `usuarios`.

La clave interna `jwt_session_epoch` se persiste aquí, pero no es visible ni editable desde Settings. Permite invalidar JWT anteriores después de una restauración o rotación.

`configuracion.imagen_referencia` existe en `schema.sql`, pero Settings no la lee, muestra ni actualiza. Es un campo reservado/no utilizado actualmente y no representa una función activa.

## 11. Respaldos

`respaldos` conserva metadata, no el dump dentro de la tabla: nombre, referencia privada, tamaño, tipo, operación, estado, usuario, mensaje, fechas, checksum SHA-256, formato y disponibilidad.

Las operaciones son `respaldo` y `restauracion`; los estados, `en_proceso`, `exitoso` y `fallido`. El checksum opcional tiene 64 caracteres hexadecimales y el tamaño no es negativo.

`id_usuario` identifica al responsable. `id_respaldo_origen` e `id_respaldo_preventivo` son autorrelaciones opcionales que trazan restauración y copia preventiva.

```text
usuarios  1 ── N respaldos
respaldos 1 ── N respaldos (origen)
respaldos 1 ── N respaldos (preventivo)
```

## 12. Relaciones consolidadas

| Origen | Destino | Cardinalidad | FK |
|---|---|---|---|
| `usuarios` | `roles` | N:M por `usuario_roles` | `id_usuario`, `id_rol` |
| `roles` | `permisos` | N:M por `rol_permisos` | `id_rol`, `id_permiso` |
| `productos` | `categorias`, `marcas`, `unidades_medida` | N:1 | `id_categoria`, `id_marca`, `id_unidad` |
| `compras` | `proveedores`, `usuarios` | N:1 | `id_proveedor`, `id_usuario` |
| `detalle_compras` | `compras`, `productos` | N:1 | `id_compra`, `id_producto` |
| `ventas` | `clientes`, `usuarios` | N:1 | `id_cliente`, `id_usuario` |
| `ventas` | `cajas` | N:0..1 | `id_caja` |
| `detalle_ventas` | `ventas`, `productos` | N:1 | `id_venta`, `id_producto` |
| `pagos_venta` | `ventas`, `metodos_pago` | N:1 | `id_venta`, `id_metodo_pago` |
| `ajustes_inventario` | `productos`, `usuarios` | N:1 | `id_producto`, `id_usuario` |
| `movimientos_inventario` | `productos`, `usuarios` | N:1 | `id_producto`, `id_usuario` |
| `cajas` | `usuarios` | N:1 | `id_usuario` |
| `movimientos_caja` | `cajas`, `usuarios`, `ventas` | N:1; venta opcional | `id_caja`, `id_usuario`, `id_venta` |
| `bitacora` | `usuarios` | N:0..1 | `id_usuario` |
| `configuracion` | `usuarios` | N:0..1 | `id_usuario_actualizacion` |
| `respaldos` | `usuarios` | N:1 | `id_usuario` |
| `respaldos` | `respaldos` | Autorrelación opcional | `id_respaldo_origen`, `id_respaldo_preventivo` |

## 13. Estados implementados

| Entidad | Valores |
|---|---|
| Usuarios, roles, catálogos, productos, clientes, proveedores y métodos | `activo`, `inactivo` |
| `compras` | `borrador`, `recibida`, `anulada` |
| `ventas` | `preparacion`, `completada`, `anulada` |
| `cajas` | `abierta`, `cerrada` |
| Naturaleza de inventario | `entrada`, `salida` |
| `movimientos_caja.tipo_movimiento` | `venta`, `ingreso`, `egreso`, `devolucion`, `anulacion` |
| `movimientos_caja.naturaleza` | `entrada`, `salida` |
| `respaldos.operacion` | `respaldo`, `restauracion` |
| `respaldos.estado` | `en_proceso`, `exitoso`, `fallido` |

## 14. Reglas de integridad relevantes

1. Las FK restrictivas conservan historia y evitan borrados en cascada.
2. Existencia y saldos de inventario no pueden ser negativos.
3. Las cantidades son positivas; el backend respeta además `permite_decimales`.
4. Compras, ventas, pagos, caja e inventario se validan transaccionalmente en backend.
5. Las ventas conservan costo histórico y sus pagos.
6. Consumidor final está identificado en persistencia y protegido por el servicio.
7. Productos y marcas guardan referencias de imagen controladas, no BLOB.
8. Las operaciones críticas se asocian lógicamente a `bitacora` sin secretos.
9. Los respaldos conservan checksum, disponibilidad, usuario y autorrelaciones.
10. `configuracion.imagen_referencia` permanece reservada y sin uso actual.

## 15. Alcance de verificación

Este documento coincide con `database/schema.sql` y los contratos observables del backend. Una instalación concreta de MariaDB debe compararse manualmente con el esquema antes de la demostración; no se afirma aquí que se hayan ejecutado migraciones en un servidor específico.
