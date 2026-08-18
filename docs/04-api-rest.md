# API REST de Liquorix

Este documento describe la API implementada actualmente por el backend. La fuente de verdad son `backend/src/app.js`, sus routers, controladores, validaciones, servicios y middlewares.

## 1. Convenciones generales

- Base URL: `/api/v1`.
- Cuerpo y respuestas: JSON.
- Salvo health y login, los endpoints requieren `Authorization: Bearer <JWT>`.
- Los identificadores de path son enteros positivos.
- Los listados paginados usan normalmente `page=1` y `limit=20`; `limit` admite de 1 a 100.
- Fechas de filtros: `YYYY-MM-DD`. Las fechas de compra y venta: `YYYY-MM-DD HH:mm:ss`.
- Los campos monetarios enviados son números JSON, con hasta dos decimales; las cantidades admiten hasta tres.

Respuesta exitosa habitual:

```json
{
  "success": true,
  "data": {}
}
```

Error controlado:

```json
{
  "success": false,
  "message": "Descripción pública del error"
}
```

Los mensajes dependen del caso. Los errores internos se sanean como `Error interno del servidor`; no se exponen SQL ni trazas.

| Código | Uso actual |
| --- | --- |
| `200` | Consulta, edición, confirmación, anulación o cierre correcto. |
| `201` | Recurso, borrador, línea, ajuste o movimiento creado. |
| `400` | Body, parámetro, cálculo o regla de entrada inválidos. |
| `401` | JWT ausente, inválido o expirado; usuario inexistente, inactivo o bloqueado. |
| `403` | El usuario vigente no posee el permiso o intenta consultar recursos de otro usuario. |
| `404` | Ruta o entidad no encontrada. |
| `409` | Conflicto de unicidad, estado, concurrencia o regla operativa. |
| `500` | Error interno o configuración/dato almacenado inconsistente. |
| `503` | Health no puede comunicarse con MariaDB. |

`authenticate` verifica firma y expiración del JWT, exige un `sub`, nombre y roles estructuralmente válidos y vuelve a consultar al usuario. Rechaza con `401 No autorizado` a usuarios inexistentes, inactivos o con bloqueo vigente. La identidad y los roles se reconstruyen desde la base; no se confía en roles controlados por el cliente. `requirePermission` consulta en cada solicitud los permisos efectivos de roles activos y responde `403 Acceso denegado` cuando falta el permiso.

Los listados paginados responden con la colección nombrada y:

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "total_pages": 0
  }
}
```

## 2. Health

| Método | Endpoint | JWT/permiso | Descripción |
| --- | --- | --- | --- |
| GET | `/health` | Público | Comprueba API y conexión a MariaDB. |

No recibe parámetros. Respuesta `200`:

```json
{
  "success": true,
  "data": { "status": "ok", "database": "ok" }
}
```

Si la consulta `SELECT 1` falla, responde `503` con un mensaje público saneado.

## 3. Autenticación

| Método | Endpoint | JWT/permiso | Descripción |
| --- | --- | --- | --- |
| POST | `/auth/login` | Público | Inicia sesión. |
| GET | `/auth/me` | JWT | Devuelve la identidad vigente reconstruida por `authenticate`. |

### `POST /auth/login`

Body exacto utilizado:

```json
{
  "nombre_usuario": "administrador",
  "password": "PASSWORD_NO_REAL"
}
```

Ambos campos son obligatorios; `nombre_usuario` admite hasta 80 caracteres. Un usuario inexistente, contraseña incorrecta, usuario inactivo o bloqueo vigente devuelve el mismo `401 Credenciales inválidas`. Los fallos incrementan intentos y pueden bloquear temporalmente. Respuesta `200`:

```json
{
  "success": true,
  "data": {
    "token": "<JWT>",
    "user": {
      "id_usuario": 1,
      "nombre": "Nombre",
      "apellido": "Apellido",
      "nombre_usuario": "administrador",
      "correo": null,
      "roles": ["Administrador"],
      "permisos": ["dashboard.ver"]
    }
  }
}
```

Nunca se devuelve `password_hash`. `/auth/me` responde `{ "user": { "id_usuario", "nombre_usuario", "roles" } }`.

## 4. Usuarios

| Método | Endpoint | Permiso | Descripción |
| --- | --- | --- | --- |
| GET | `/users` | `usuarios.ver` | Lista usuarios. |
| GET | `/users/:id` | `usuarios.ver` | Obtiene un usuario. |
| POST | `/users` | `usuarios.crear` | Crea un usuario con un rol. |
| PUT | `/users/:id` | `usuarios.editar` | Reemplaza el perfil editable. |
| PATCH | `/users/:id/status` | `usuarios.desactivar` | Activa o inactiva. |
| PUT | `/users/:id/role` | `usuarios.editar` | Reemplaza su único rol. |

Filtros de `GET /users`: `page`, `limit`, `search`, `status=activo|inactivo`, `role=<id_rol>`. Los filtros desconocidos se rechazan. Responde `{ users, pagination }` y cada usuario contiene un solo objeto `role`; nunca contiene hash.

Creación:

```json
{
  "nombre": "Ana",
  "apellido": "Pérez",
  "nombre_usuario": "ana",
  "correo": "ana@example.test",
  "password": "PASSWORD_DE_12_O_MAS",
  "id_rol": 2
}
```

La contraseña debe tener al menos 12 caracteres y como máximo 72 bytes UTF-8; se almacena con bcrypt. Nombre de usuario y correo, cuando existe, son únicos. El `PUT` exige `nombre`, `apellido`, `nombre_usuario` y `correo` opcional, pero no acepta password ni rol. Estado: `{ "estado": "activo" }` o `inactivo`. Rol: `{ "id_rol": 2 }`.

No se puede desactivar el usuario propio, retirar el propio rol Administrador ni dejar el sistema sin un Administrador activo. Un usuario debe tener exactamente un rol válido. Creación responde `201`; el resto `200`; ausencias producen `404` y duplicados/protecciones `409`.

## 5. Roles y permisos

| Método | Endpoint | Permiso | Descripción |
| --- | --- | --- | --- |
| GET | `/roles` | `roles.ver` | Lista roles con sus permisos. |
| GET | `/roles/:id` | `roles.ver` | Detalla rol y permisos. |
| PUT | `/roles/:id/permissions` | `roles.administrar` | Reemplaza todos los permisos de un rol editable. |
| GET | `/permissions` | `roles.ver` | Lista el catálogo de permisos. |

No hay creación, edición general ni eliminación de roles/permisos. Reemplazo:

```json
{ "permission_ids": [17, 21, 31] }
```

El array es obligatorio, sin duplicados, y cada id debe existir; `[]` elimina todos los permisos. Solo `Vendedor` y `Consulta` admiten reemplazo. Los permisos de `Administrador` están protegidos (`409`). Respuesta:

```json
{
  "success": true,
  "data": { "role": { "id_rol": 2, "nombre": "Vendedor", "permissions": [] } }
}
```

## 6. Categorías

| Método | Endpoint | Permiso | Descripción |
| --- | --- | --- | --- |
| GET | `/categories` | `productos.ver` | Lista categorías. |
| GET | `/categories/:id` | `productos.ver` | Obtiene una categoría. |
| POST | `/categories` | `productos.crear` | Crea una categoría. |
| PUT | `/categories/:id` | `productos.editar` | Reemplaza nombre y descripción. |
| PATCH | `/categories/:id/status` | `productos.desactivar` | Cambia estado. |

Listado: `page`, `limit`, `search`, `status=activo|inactivo`. `search` busca
coincidencias únicamente en `nombre`. Body de creación/edición:

```json
{ "nombre": "Whisky", "descripcion": "Bebidas de whisky" }
```

`nombre` es obligatorio, único y de hasta 100 caracteres; descripción opcional hasta 255. Estado: `{ "estado": "inactivo" }`. La colección responde como `{ categories, pagination }`, detalle y mutaciones como `{ category }`; creación usa `201`, duplicado `409`, ausencia `404`.

## 7. Marcas

| Método | Endpoint | Permiso | Descripción |
| --- | --- | --- | --- |
| GET | `/brands` | `productos.ver` | Lista marcas. |
| GET | `/brands/:id` | `productos.ver` | Obtiene una marca. |
| POST | `/brands` | `productos.crear` | Crea una marca. |
| PUT | `/brands/:id` | `productos.editar` | Reemplaza nombre y descripción. |
| PATCH | `/brands/:id/status` | `productos.desactivar` | Cambia estado. |

Filtros y paginación coinciden con categorías. En marcas, `search` también busca
coincidencias únicamente en `nombre`. Body:

```json
{ "nombre": "Marca ejemplo", "descripcion": null }
```

Nombre obligatorio y único, máximo 100; descripción opcional, máximo 255; estado `activo|inactivo`. Respuestas: `{ brands, pagination }` o `{ brand }`.

## 8. Unidades de medida

| Método | Endpoint | Permiso | Descripción |
| --- | --- | --- | --- |
| GET | `/units` | `productos.ver` | Lista unidades. |
| GET | `/units/:id` | `productos.ver` | Obtiene una unidad. |
| POST | `/units` | `productos.crear` | Crea una unidad. |
| PUT | `/units/:id` | `productos.editar` | Reemplaza sus datos. |
| PATCH | `/units/:id/status` | `productos.desactivar` | Cambia estado. |

Filtros: `page`, `limit`, `search` (máximo 80) y `status`. `search` busca
coincidencias en `nombre` o `abreviatura`. Body:

```json
{ "nombre": "Botella", "abreviatura": "bot", "permite_decimales": false }
```

Nombre (80) y abreviatura (20) son obligatorios y únicos; `permite_decimales` es booleano y por defecto `false`. Respuestas: `{ units, pagination }` o `{ unit }`.

## 9. Productos

| Método | Endpoint | Permiso | Descripción |
| --- | --- | --- | --- |
| GET | `/products` | `productos.ver` | Lista productos. |
| GET | `/products/:id` | `productos.ver` | Obtiene un producto. |
| POST | `/products` | `productos.crear` | Crea un producto. |
| PUT | `/products/:id` | `productos.editar` | Reemplaza sus datos editables. |
| PATCH | `/products/:id/status` | `productos.desactivar` | Cambia estado. |

Filtros: `page`, `limit`, `search`, `status`, `id_categoria`, `id_marca`. `search` cubre nombre, código y código de barras. Body de creación y `PUT`:

```json
{
  "codigo": "PROD-001",
  "codigo_barras": null,
  "nombre": "Producto ejemplo",
  "descripcion": null,
  "id_categoria": 1,
  "id_marca": 1,
  "id_unidad": 1,
  "costo_promedio": 0,
  "precio_venta": 100,
  "existencia_minima": 5,
  "porcentaje_impuesto": 0
}
```

Categoría, marca y unidad deben existir y estar activas. Código y código de barras opcional son únicos. Precio de venta debe ser mayor que cero. `existencia` está prohibida en este CRUD: solo cambia mediante compras, ventas, anulaciones o ajustes.

Política de costo: `POST` acepta `costo_promedio` no negativo y usa `0.00` si se omite, siempre con existencia inicial cero. En `PUT` es opcional: omitirlo conserva el valor vigente; con existencia cero puede corregirse, y con existencia positiva solo se admite un valor monetariamente equivalente al actual. Durante la operación, confirmar una compra es la fuente normal que lo recalcula ponderadamente. Los ajustes y las anulaciones no lo cambian. `porcentaje_impuesto` se conserva como dato del producto, pero no interviene en la política fiscal vigente: compras y ventas usan `impuesto_activo` y `tasa_impuesto` globales; `descuento_maximo` aplica exclusivamente a las líneas de venta.

Respuesta de listado: `{ products, pagination }`; mutaciones/detalle: `{ product }`. Estado: `{ "estado": "inactivo" }`.

## 10. Clientes

| Método | Endpoint | Permiso | Descripción |
| --- | --- | --- | --- |
| GET | `/clients` | `clientes.ver` | Lista clientes. |
| GET | `/clients/:id` | `clientes.ver` | Obtiene un cliente. |
| POST | `/clients` | `clientes.crear` | Crea un cliente ordinario. |
| PUT | `/clients/:id` | `clientes.editar` | Reemplaza sus datos. |
| PATCH | `/clients/:id/status` | `clientes.editar` | Cambia estado. |

Filtros: `page`, `limit`, `search` y `status`. Body:

```json
{
  "nombre": "Cliente ejemplo",
  "identificacion": "ID-001",
  "telefono": null,
  "correo": null,
  "direccion": null
}
```

Nombre obligatorio; identificación y correo son opcionales y la identificación es única cuando existe. `es_consumidor_final` está prohibido en el body. El cliente marcado como “Consumidor final” debe existir activo y no puede editarse ni desactivarse. Estado: `{ "estado": "activo" }`. Respuestas: `{ clients, pagination }` o `{ client }`.

## 11. Proveedores

| Método | Endpoint | Permiso | Descripción |
| --- | --- | --- | --- |
| GET | `/suppliers` | `proveedores.ver` | Lista proveedores. |
| GET | `/suppliers/:id` | `proveedores.ver` | Obtiene un proveedor. |
| POST | `/suppliers` | `proveedores.crear` | Crea un proveedor. |
| PUT | `/suppliers/:id` | `proveedores.editar` | Reemplaza sus datos. |
| PATCH | `/suppliers/:id/status` | `proveedores.editar` | Cambia estado. |

Filtros: `page`, `limit`, `search`, `status`. Body:

```json
{
  "nombre": "Proveedor ejemplo",
  "identificacion_fiscal": "FISCAL-001",
  "contacto": null,
  "telefono": null,
  "correo": null,
  "direccion": null
}
```

Nombre obligatorio; identificación fiscal opcional y única; correo opcional con formato válido. Estado: `{ "estado": "inactivo" }`. Respuestas: `{ suppliers, pagination }` o `{ supplier }`.

## 12. Compras

| Método | Endpoint | Permiso | Descripción |
| --- | --- | --- | --- |
| GET | `/purchases` | `compras.ver` | Lista compras. |
| GET | `/purchases/:id` | `compras.ver` | Devuelve encabezado y líneas. |
| POST | `/purchases` | `compras.crear` | Crea un borrador. |
| PUT | `/purchases/:id` | `compras.crear` | Reemplaza encabezado de un borrador. |
| POST | `/purchases/:id/items` | `compras.crear` | Agrega una línea. |
| PUT | `/purchases/:id/items/:itemId` | `compras.crear` | Reemplaza una línea. |
| DELETE | `/purchases/:id/items/:itemId` | `compras.crear` | Elimina una línea. |
| POST | `/purchases/:id/confirm` | `compras.confirmar` | Recibe la compra. |
| POST | `/purchases/:id/cancel` | `compras.anular` | Anula una compra recibida. |

Estados reales: `borrador`, `recibida`, `anulada`. Listado: `page`, `limit`, `status`, `supplier`, `date_from`, `date_to`; responde `{ purchases, pagination }`.

Encabezado para crear o editar:

```json
{
  "numero_compra": "COMP-001",
  "numero_documento_proveedor": null,
  "id_proveedor": 1,
  "fecha_compra": "2026-08-15 10:30:00",
  "observacion": null
}
```

`numero_compra` es único y el proveedor debe estar activo. Subtotal, descuento total, impuesto total, total, usuario y estado son rechazados porque los controla el backend. Solo un borrador puede editar encabezado o líneas.

Línea para `POST` y `PUT`:

```json
{
  "id_producto": 1,
  "cantidad": 2,
  "costo_unitario": 50,
  "descuento": 5
}
```

Cantidad debe ser mayor que cero; costo y descuento son no negativos. No se admite el mismo producto dos veces. La unidad debe permitir fracciones cuando la cantidad no es entera. El cliente no puede enviar `subtotal` ni `impuesto`.

Política de cálculo, aplicada al agregar/editar y nuevamente al confirmar:

```text
subtotal = cantidad × costo_unitario
descuento <= subtotal
base = subtotal - descuento
impuesto = impuesto_activo ? redondear(base × tasa_impuesto / 100) : 0
total = subtotal - descuento + impuesto
```

Los importes se redondean a centavos con la aritmética entera del backend. El descuento de compra es un importe monetario concedido por el proveedor y no está limitado por `descuento_maximo`, cuya política comercial aplica exclusivamente a ventas.

`POST /purchases/:id/confirm` no recibe body funcional. Exige proveedor activo y al menos una línea, vuelve a validar productos, unidades, descuentos y configuración; aumenta existencia, recalcula `costo_promedio` ponderado, registra un movimiento por línea, recalcula totales y cambia a `recibida` en una transacción.

Anulación:

```json
{ "motivo": "Documento registrado por error" }
```

Solo aplica a `recibida`. Exige existencia suficiente para restar todas las cantidades, crea movimientos inversos y cambia a `anulada`. No modifica `productos.costo_promedio`, no altera costos históricos y no se bloquea solo por movimientos posteriores. Errores frecuentes: `404` compra/línea/producto; `400` body, configuración o línea inválida; `409` duplicado, estado no editable o existencia insuficiente. Todas las mutaciones devuelven `{ purchase }`; creación de compra/línea usa `201`.

## 13. Ventas

| Método | Endpoint | Permiso | Descripción |
| --- | --- | --- | --- |
| GET | `/sales` | `ventas.ver` | Lista ventas. |
| GET | `/sales/payment-methods` | `ventas.crear` | Lista métodos de pago activos disponibles para confirmar. |
| GET | `/sales/:id` | `ventas.ver` | Devuelve encabezado, líneas y pagos. |
| POST | `/sales` | `ventas.crear` | Crea una venta en preparación. |
| PUT | `/sales/:id` | `ventas.crear` | Reemplaza encabezado en preparación. |
| POST | `/sales/:id/items` | `ventas.crear` | Agrega una línea. |
| PUT | `/sales/:id/items/:itemId` | `ventas.crear` | Reemplaza una línea. |
| DELETE | `/sales/:id/items/:itemId` | `ventas.crear` | Elimina una línea. |
| POST | `/sales/:id/confirm` | `ventas.crear` | Confirma, factura y cobra. |
| POST | `/sales/:id/cancel` | `ventas.anular` | Anula administrativamente una venta completada. |

Estados: `preparacion`, `completada`, `anulada`. Filtros: `page`, `limit`, `status`, `client`, `seller`, `date_from`, `date_to`; respuesta `{ sales, pagination }`.

`GET /sales/payment-methods` responde `{ payment_methods }`, ordenados por
`id_metodo_pago`, con `id_metodo_pago`, `nombre`, `requiere_referencia`,
`es_efectivo` y `estado`. Solo devuelve registros activos y sirve para construir
la confirmación; el backend vuelve a validar cada método dentro de la transacción.

`GET /sales/:id` siempre incluye `items` y `payments`. Una preparación o venta sin
pagos devuelve `payments: []`. Cada pago conserva `id_pago`, `monto`, `referencia`,
`monto_recibido`, `cambio`, `creado_en` y un objeto `method` con
`id_metodo_pago`, `nombre`, `requiere_referencia` y `es_efectivo`. La consulta es
exclusivamente informativa y no modifica ni recalcula pagos históricos.

Encabezado:

```json
{
  "numero_venta": "VEN-001",
  "id_cliente": null,
  "fecha_venta": "2026-08-15 11:00:00"
}
```

`numero_venta` es único. `id_cliente` omitido o `null` selecciona al “Consumidor final” activo. Factura, vendedor, caja, totales, estado y datos de anulación son controlados por el backend.

Línea:

```json
{ "id_producto": 1, "cantidad": 2, "descuento": 0 }
```

El producto debe estar activo, no puede repetirse y su unidad debe aceptar la cantidad. El backend toma `precio_unitario` del producto al agregar o cambiar el producto, conserva `costo_unitario_historico`, y calcula subtotal e impuesto. El cliente no puede enviar precio, costo histórico, subtotal ni impuesto. `descuento` es un importe monetario, pero no puede superar `subtotal × descuento_maximo / 100`; `descuento_maximo` es un porcentaje global entre 0 y 100 y la configuración vigente se reaplica al confirmar.

Confirmación con pagos:

```json
{
  "pagos": [
    {
      "id_metodo_pago": 1,
      "monto": 100,
      "referencia": null,
      "monto_recibido": 120
    }
  ]
}
```

No se repite método. La suma de `monto` debe coincidir exactamente con el total. Un total positivo exige pagos; total cero exige array vacío. Métodos deben existir y estar activos. Los que lo indiquen exigen referencia. `monto_recibido` solo corresponde a efectivo, es obligatorio en efectivo y debe cubrir su monto; el cambio es `monto_recibido - monto`.

La confirmación vuelve a validar cliente, productos, existencia, unidades, descuentos, configuración y pagos; registra costo vigente como costo histórico, reduce inventario y crea movimientos. Genera `numero_factura` como `<serie_comprobante>-<siguiente_numero_comprobante>` e incrementa la secuencia. Si `control_caja_activo=true`, el vendedor debe tener exactamente una caja abierta; el efectivo aplicado crea una entrada en esa caja. Todo se confirma en una transacción y el estado pasa a `completada`.

Anulación:

```json
{ "motivo": "Venta anulada con autorización" }
```

Solo `completada`, motivo obligatorio hasta 500 caracteres. Restaura existencias con movimientos inversos; no modifica `costo_promedio`; conserva líneas, costos y pagos históricos. Calcula la compensación solo sobre métodos marcados como efectivo. La caja histórica original no se reabre ni modifica: la salida se registra en la única caja abierta del usuario anulador. Si hay efectivo y este no tiene exactamente una caja abierta, responde `409`; una venta sin efectivo puede anularse sin caja. El permiso `ventas.anular` no restringe la venta al vendedor original. Cambia a `anulada` transaccionalmente.

Todas las mutaciones devuelven `{ sale }`; creación de venta/línea usa `201`. Son relevantes `400` por contratos/cálculos/pagos, `404` por venta/línea/producto y `409` por estado, stock, caja, numeración o inconsistencias históricas.

## 14. Caja

| Método | Endpoint | Permiso | Descripción |
| --- | --- | --- | --- |
| POST | `/cash/open` | `caja.abrir` | Abre la caja propia. |
| GET | `/cash/current` | `caja.movimientos` | Obtiene la caja abierta propia. |
| GET | `/cash` | `caja.movimientos` | Lista historial propio. |
| GET | `/cash/:id` | `caja.movimientos` | Detalla caja propia y movimientos. |
| POST | `/cash/:id/movements` | `caja.movimientos` | Registra ingreso o egreso manual propio. |
| POST | `/cash/:id/close` | `caja.cerrar` | Cierra la caja propia. |

Apertura:

```json
{ "monto_apertura": 500, "observacion": null }
```

Solo puede existir una caja abierta por usuario. Usuario, fechas, cierre, esperado, contado, diferencia y estado son controlados por backend. Responde `201 { cash }`.

Listado: `page`, `limit`, `status=abierta|cerrada`, `user`, `date_from`, `date_to`. Solo permite omitir `user` o usar el id propio; otro usuario produce `403`. Responde `{ cash, pagination }`. Detalle incluye `usuario` y `movements`; una caja ajena se trata como no encontrada.

Movimiento manual:

```json
{ "tipo_movimiento": "ingreso", "monto": 100, "concepto": "Fondo adicional" }
```

`tipo_movimiento` es `ingreso|egreso`, monto mayor que cero y concepto obligatorio. Backend determina naturaleza, usuario, caja y efecto en efectivo. Una caja cerrada es inmutable (`409`). Responde `201 { movement }`.

Cierre:

```json
{ "monto_contado": 590, "observacion": "Cierre del turno" }
```

`monto_esperado = monto_apertura + entradas efectivas - salidas efectivas`; `diferencia = monto_contado - monto_esperado`. El cierre fija fecha, importes y estado `cerrada` en transacción. Responde `200 { cash }`.

## 15. Inventario

| Método | Endpoint | Permiso | Descripción |
| --- | --- | --- | --- |
| GET | `/inventory` | `inventario.ver` | Consulta existencias. |
| GET | `/inventory/low-stock` | `inventario.ver` | Lista productos activos bajo mínimo. |
| GET | `/inventory/movements` | `inventario.ver` | Lista movimientos. |
| POST | `/inventory/adjustments` | `inventario.ajustar` | Registra ajuste transaccional. |

`GET /inventory` acepta `status=activo|inactivo|todos` y por defecto `activo`; responde `{ inventory }`. Low-stock no recibe filtros y responde `{ products }`.

Movimientos: `page`, `limit`, `nature=entrada|salida`, `type`, `reference_type`, `product`, `user`, `reference_id`, `date_from`, `date_to`; responde `{ movements, pagination }`.

Ajuste:

```json
{
  "id_producto": 1,
  "naturaleza": "salida",
  "cantidad": 1,
  "motivo": "Corrección de conteo físico"
}
```

Producto activo, naturaleza `entrada|salida`, cantidad positiva y motivo obligatorio hasta 500. Una unidad no decimal exige cantidad entera. Una salida no puede dejar existencia negativa. El ajuste cambia únicamente existencia: no modifica costo promedio. Crea `ajustes_inventario`, un movimiento enlazado mediante `id_ajuste` y bitácora, todo en una transacción. Responde `201 { adjustment }`.

## 16. Bitácora

| Método | Endpoint | Permiso | Descripción |
| --- | --- | --- | --- |
| GET | `/audit` | `bitacora.ver` | Lista eventos sanitizados. |
| GET | `/audit/:id` | `bitacora.ver` | Obtiene un evento sanitizado. |

Filtros admitidos exclusivamente: `page`, `limit`, `user`, `module`, `action`, `entity`, `entity_id`, `result`, `date_from`, `date_to`. Responde `{ events, pagination }`; detalle responde `{ event }`.

```text
GET /api/v1/audit?module=ventas&result=exitoso&page=1&limit=20
```

Es un módulo de solo lectura: no existen POST, PUT, PATCH ni DELETE. Antes de responder sanitiza recursivamente claves y valores sensibles, limita profundidad/tamaño y protege contraseñas, hashes, secretos, tokens, autorización y credenciales aunque aparezcan dentro de JSON histórico.

## 17. Configuración

| Método | Endpoint | Permiso | Descripción |
| --- | --- | --- | --- |
| GET | `/settings` | `configuracion.ver` | Lista las siete claves públicas. |
| PUT | `/settings/:key` | `configuracion.editar` | Actualiza una clave editable. |

Claves visibles, siempre devueltas en este orden:

1. `nombre_negocio`
2. `impuesto_activo`
3. `tasa_impuesto`
4. `descuento_maximo`
5. `control_caja_activo`
6. `serie_comprobante`
7. `siguiente_numero_comprobante`

`GET` responde `{ settings: [{ clave, valor, tipo_dato, descripcion, es_critica, actualizado_en }] }`. Si falta cualquiera, responde `500` por configuración incompleta.

Body exacto de `PUT`:

```json
{ "valor": "Mi licorería" }
```

No se permiten campos adicionales. Claves editables y tipos:

| Clave | Valor admitido |
| --- | --- |
| `nombre_negocio` | Texto obligatorio, máximo 150. |
| `impuesto_activo` | String exacto `"true"` o `"false"`. |
| `tasa_impuesto` | Número JSON de `0` a `100`, máximo dos decimales. |
| `descuento_maximo` | Número JSON de `0` a `100`, máximo dos decimales; porcentaje máximo por línea de venta. |
| `control_caja_activo` | String exacto `"true"` o `"false"`. |
| `serie_comprobante` | Texto de 1 a 20, solo letras, números y guiones; una serie histórica no puede reutilizarse como cambio conflictivo. |

`siguiente_numero_comprobante` es visible pero de solo lectura y responde `409` al intentar modificarlo. `descuento_maximo` es editable con `configuracion.editar`, se audita como los demás cambios críticos y solo limita descuentos concedidos al cliente en ventas. Una clave fuera de las siete visibles responde `404`. Respuesta correcta: `{ "setting": { "clave": "nombre_negocio", "valor": "Mi licorería" } }` junto con sus demás metadatos.

## 18. Alcance implementado

La API montada contiene 75 combinaciones método/path en los 17 módulos anteriores. Actualmente no existen routers de reportes, dashboard, respaldos ni restauraciones, aunque el seed reserve permisos para evoluciones futuras. No deben asumirse endpoints para esos módulos hasta que exista implementación real.
