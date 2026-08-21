-- LIQUORIX - dataset definitivo de demostracion
-- IMPORTANTE: ejecutar primero en sistema_licoreria_restore_test y revisar el
-- resultado completo. El unico usuario conservado es el Administrador ID 1;
-- el script no contiene contrasenas, hashes ni credenciales demo.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 1. Huellas protegidas y preflight (solo lectura)
-- ---------------------------------------------------------------------------

SELECT SHA2(CONCAT_WS('|', id_usuario, nombre, apellido, nombre_usuario,
                      COALESCE(correo, ''), password_hash, estado), 256)
INTO @admin_fingerprint_before
FROM usuarios
WHERE id_usuario = 1 AND nombre_usuario = 'administrador' AND estado = 'activo';

SELECT valor INTO @session_epoch_before
FROM configuracion
WHERE clave = 'jwt_session_epoch';

SELECT SHA2(CONCAT_WS('|', id_respaldo, nombre_archivo, ruta_segura,
                      COALESCE(tamano_bytes, ''), tipo, operacion, estado,
                      id_usuario, COALESCE(mensaje_resultado, ''), fecha_operacion,
                      COALESCE(fecha_finalizacion, ''), COALESCE(checksum_sha256, ''),
                      COALESCE(formato_version, ''), archivo_disponible,
                      COALESCE(id_respaldo_origen, ''),
                      COALESCE(id_respaldo_preventivo, '')), 256)
INTO @backup_fingerprint_before
FROM respaldos
WHERE id_respaldo = 5
  AND nombre_archivo = 'liquorix_manual_20260821T025208Z_3f1f28ca-6d1a-4e65-a00e-a7cb4b492bb4.sql'
  AND estado = 'exitoso';

SELECT COUNT(*), COALESCE(SUM(CRC32(CONCAT_WS('|', id_rol, nombre,
       COALESCE(descripcion, ''), es_sistema, estado))), 0)
INTO @roles_count_before, @roles_crc_before FROM roles;
SELECT COUNT(*), COALESCE(SUM(CRC32(CONCAT_WS('|', id_permiso, codigo, nombre,
       modulo, COALESCE(descripcion, '')))), 0)
INTO @permissions_count_before, @permissions_crc_before FROM permisos;
SELECT COUNT(*), COALESCE(SUM(CRC32(CONCAT_WS('|', id_rol, id_permiso,
       concedido_en))), 0)
INTO @role_permissions_count_before, @role_permissions_crc_before FROM rol_permisos;
SELECT COUNT(*), COALESCE(SUM(CRC32(CONCAT_WS('|', id_configuracion, clave,
       valor, tipo_dato, COALESCE(descripcion, ''),
       es_critica))), 0)
INTO @configuration_count_before, @configuration_crc_before FROM configuracion;
SELECT COUNT(*) INTO @configuration_user_references_to_clear
FROM configuracion
WHERE id_usuario_actualizacion IS NOT NULL
  AND id_usuario_actualizacion <> 1;
SELECT COUNT(*), COALESCE(SUM(CRC32(CONCAT_WS('|', id_metodo_pago, nombre,
       requiere_referencia, es_efectivo, estado))), 0)
INTO @payment_methods_count_before, @payment_methods_crc_before FROM metodos_pago;

SELECT id_cliente INTO @consumer_id
FROM clientes
WHERE es_consumidor_final = TRUE AND nombre = 'Consumidor final' AND estado = 'activo'
ORDER BY id_cliente LIMIT 1;

SELECT valor INTO @tax_active FROM configuracion WHERE clave = 'impuesto_activo';
SELECT CAST(valor AS DECIMAL(5,2)) INTO @tax_rate
FROM configuracion WHERE clave = 'tasa_impuesto';
SELECT CAST(valor AS DECIMAL(5,2)) INTO @discount_max
FROM configuracion WHERE clave = 'descuento_maximo';

SELECT (
  DATABASE() = 'sistema_licoreria'
  AND @admin_fingerprint_before IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM usuario_roles ur
    INNER JOIN roles r ON r.id_rol = ur.id_rol
    WHERE ur.id_usuario = 1 AND r.nombre = 'Administrador' AND r.estado = 'activo'
  )
  AND NOT EXISTS (
    SELECT 1 FROM usuario_roles
    WHERE id_usuario = 1 AND asignado_por IS NOT NULL AND asignado_por <> 1
  )
  AND @session_epoch_before IS NOT NULL
  AND @session_epoch_before <> ''
  AND @backup_fingerprint_before IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM respaldos WHERE id_usuario <> 1)
  AND NOT EXISTS (
    SELECT 1
    FROM configuracion c
    LEFT JOIN usuarios u ON u.id_usuario = c.id_usuario_actualizacion
    WHERE c.id_usuario_actualizacion IS NOT NULL
      AND c.id_usuario_actualizacion <> 1
      AND u.id_usuario IS NULL
  )
  AND (SELECT COUNT(*) FROM metodos_pago
       WHERE nombre IN ('Efectivo', 'Tarjeta') AND estado = 'activo') = 2
  AND @consumer_id IS NOT NULL
  AND (SELECT COUNT(*) FROM clientes WHERE es_consumidor_final = TRUE) = 1
  AND (SELECT COUNT(*) FROM unidades_medida
       WHERE nombre IN ('Unidad', 'Caja', 'Paquete', 'Litro', 'Mililitro')) = 5
  AND @tax_active IN ('true', 'false')
  AND @tax_rate BETWEEN 0 AND 100
  AND @discount_max BETWEEN 0 AND 100
) INTO @preflight_ok;

SELECT 'preflight' AS validacion, @preflight_ok AS correcto,
       CASE WHEN @preflight_ok = 1 THEN 'Listo para transaccion'
            ELSE 'ABORTAR: revisar base, datos protegidos o referencias de usuarios'
       END AS detalle,
       @configuration_user_references_to_clear AS referencias_configuracion_a_normalizar;

START TRANSACTION;

-- La preparacion demo elimina usuarios de prueba. Cuando configuracion conserva
-- a uno de ellos solo como ultimo actualizador, se retira esa referencia sin
-- atribuir falsamente la accion al Administrador. Los valores funcionales y el
-- jwt_session_epoch permanecen intactos.
UPDATE configuracion
SET id_usuario_actualizacion = NULL
WHERE id_usuario_actualizacion IS NOT NULL
  AND id_usuario_actualizacion <> 1
  AND @preflight_ok = 1;

-- ---------------------------------------------------------------------------
-- 2. Limpieza segura. Todas las sentencias quedan anuladas si falla preflight.
-- ---------------------------------------------------------------------------

DELETE FROM movimientos_caja WHERE @preflight_ok = 1;
DELETE FROM pagos_venta WHERE @preflight_ok = 1;
DELETE FROM detalle_ventas WHERE @preflight_ok = 1;
DELETE FROM movimientos_inventario WHERE @preflight_ok = 1;
DELETE FROM ajustes_inventario WHERE @preflight_ok = 1;
DELETE FROM ventas WHERE @preflight_ok = 1;
DELETE FROM detalle_compras WHERE @preflight_ok = 1;
DELETE FROM compras WHERE @preflight_ok = 1;
DELETE FROM cajas WHERE @preflight_ok = 1;
DELETE FROM bitacora WHERE @preflight_ok = 1;
DELETE FROM productos WHERE @preflight_ok = 1;
DELETE FROM categorias WHERE @preflight_ok = 1;
DELETE FROM marcas WHERE @preflight_ok = 1;
DELETE FROM proveedores WHERE @preflight_ok = 1;
DELETE FROM clientes WHERE id_cliente <> @consumer_id AND @preflight_ok = 1;
DELETE FROM usuario_roles WHERE id_usuario <> 1 AND @preflight_ok = 1;
DELETE FROM usuarios WHERE id_usuario <> 1 AND @preflight_ok = 1;
DELETE FROM unidades_medida
WHERE nombre NOT IN ('Unidad', 'Caja', 'Paquete', 'Litro', 'Mililitro')
  AND @preflight_ok = 1;

-- ---------------------------------------------------------------------------
-- 3. Catalogos definitivos
-- ---------------------------------------------------------------------------

INSERT INTO categorias (nombre, descripcion, estado)
SELECT nombre, descripcion, 'activo'
FROM (
  SELECT 'Rones' nombre, 'Selección de rones para demostración.' descripcion
  UNION ALL SELECT 'Whiskies', 'Selección de whiskies para demostración.'
  UNION ALL SELECT 'Vodkas', 'Selección de vodkas para demostración.'
  UNION ALL SELECT 'Tequilas', 'Selección de tequilas para demostración.'
  UNION ALL SELECT 'Cervezas', 'Cervezas nacionales e importadas.'
  UNION ALL SELECT 'Vinos', 'Vinos seleccionados para demostración.'
  UNION ALL SELECT 'Licores', 'Licores y especialidades.'
  UNION ALL SELECT 'Bebidas sin alcohol', 'Bebidas complementarias sin alcohol.'
) demo_categories
WHERE @preflight_ok = 1;

INSERT INTO marcas (nombre, descripcion, imagen_referencia, estado)
SELECT nombre, 'Marca incluida en el catálogo demostrativo.', NULL, 'activo'
FROM (
  SELECT 'Flor de Caña' nombre UNION ALL SELECT 'Zacapa'
  UNION ALL SELECT 'Johnnie Walker' UNION ALL SELECT 'Buchanan''s'
  UNION ALL SELECT 'Chivas Regal' UNION ALL SELECT 'Jack Daniel''s'
  UNION ALL SELECT 'Absolut' UNION ALL SELECT 'Smirnoff'
  UNION ALL SELECT 'José Cuervo' UNION ALL SELECT 'Don Julio'
  UNION ALL SELECT 'Baileys' UNION ALL SELECT 'Jägermeister'
  UNION ALL SELECT 'Toña' UNION ALL SELECT 'Victoria Clásica'
  UNION ALL SELECT 'Heineken' UNION ALL SELECT 'Casillero del Diablo'
  UNION ALL SELECT 'Concha y Toro' UNION ALL SELECT 'Coca-Cola'
) demo_brands
WHERE @preflight_ok = 1;

INSERT INTO proveedores
  (nombre, identificacion_fiscal, contacto, telefono, correo, direccion, estado)
SELECT nombre, identificacion, contacto, telefono, correo, direccion, 'activo'
FROM (
  SELECT 'Distribuidora Central de Nicaragua' nombre, 'DEMO-RUC-001' identificacion,
         'Equipo comercial demo' contacto, '+505 0000-0001' telefono,
         'central@example.invalid' correo, 'Dirección ficticia, Managua' direccion
  UNION ALL SELECT 'Comercializadora del Pacífico', 'DEMO-RUC-002',
         'Equipo comercial demo', '+505 0000-0002', 'pacifico@example.invalid',
         'Dirección ficticia, Masaya'
  UNION ALL SELECT 'Distribuciones León', 'DEMO-RUC-003',
         'Equipo comercial demo', '+505 0000-0003', 'leon@example.invalid',
         'Dirección ficticia, León'
  UNION ALL SELECT 'Importadora Premium Nicaragua', 'DEMO-RUC-004',
         'Equipo comercial demo', '+505 0000-0004', 'premium@example.invalid',
         'Dirección ficticia, Managua'
) demo_suppliers
WHERE @preflight_ok = 1;

INSERT INTO clientes
  (nombre, identificacion, telefono, correo, direccion, es_consumidor_final, estado)
SELECT nombre, identificacion, telefono, correo, 'Dirección ficticia para demo', FALSE, 'activo'
FROM (
  SELECT 'Carlos Hernández' nombre, 'DEMO-CLI-001' identificacion,
         '+505 0000-0101' telefono, 'carlos.hernandez@example.invalid' correo
  UNION ALL SELECT 'María González', 'DEMO-CLI-002', '+505 0000-0102',
         'maria.gonzalez@example.invalid'
  UNION ALL SELECT 'José Martínez', 'DEMO-CLI-003', '+505 0000-0103',
         'jose.martinez@example.invalid'
  UNION ALL SELECT 'Ana López', 'DEMO-CLI-004', '+505 0000-0104',
         'ana.lopez@example.invalid'
  UNION ALL SELECT 'Roberto Castillo', 'DEMO-CLI-005', '+505 0000-0105',
         'roberto.castillo@example.invalid'
) demo_clients
WHERE @preflight_ok = 1;

-- ---------------------------------------------------------------------------
-- 4. Productos. Agua Mineral usa Coca-Cola como marca catalogal demo porque
--    productos.id_marca es obligatorio y no se aprobo una marca adicional.
-- ---------------------------------------------------------------------------

INSERT INTO productos
  (codigo, codigo_barras, nombre, descripcion, imagen_referencia,
   id_categoria, id_marca, id_unidad, costo_promedio, precio_venta,
   existencia, existencia_minima, porcentaje_impuesto, estado)
SELECT d.codigo, d.codigo_barras, d.nombre,
       'Producto demostrativo; costos y precios no representan valores comerciales oficiales.',
       NULL, c.id_categoria, m.id_marca, u.id_unidad, d.costo, d.precio,
       0.000, d.minimo, IF(@tax_active = 'true', @tax_rate, 0), 'activo'
FROM (
  SELECT 'RON-FDC-04' codigo, '9900000000001' codigo_barras, 'Flor de Caña 4 Extra Seco 750 ml' nombre, 'Rones' categoria, 'Flor de Caña' marca, 250.00 costo, 320.00 precio, 5.000 minimo
  UNION ALL SELECT 'RON-FDC-05','9900000000002','Flor de Caña 5 Años 750 ml','Rones','Flor de Caña',285.00,360.00,5.000
  UNION ALL SELECT 'RON-FDC-07','9900000000003','Flor de Caña 7 Gran Reserva 750 ml','Rones','Flor de Caña',350.00,450.00,4.000
  UNION ALL SELECT 'RON-FDC-12','9900000000004','Flor de Caña 12 Años 750 ml','Rones','Flor de Caña',620.00,780.00,3.000
  UNION ALL SELECT 'RON-FDC-18','9900000000005','Flor de Caña 18 Años 750 ml','Rones','Flor de Caña',1100.00,1390.00,2.000
  UNION ALL SELECT 'RON-ZAC-23','9900000000006','Zacapa 23 750 ml','Rones','Zacapa',1300.00,1590.00,2.000
  UNION ALL SELECT 'WHI-JWR-075','9900000000007','Johnnie Walker Red Label 750 ml','Whiskies','Johnnie Walker',520.00,650.00,4.000
  UNION ALL SELECT 'WHI-JWB-075','9900000000008','Johnnie Walker Black Label 750 ml','Whiskies','Johnnie Walker',980.00,1190.00,3.000
  UNION ALL SELECT 'WHI-BUC-12','9900000000009','Buchanan''s Deluxe 12 750 ml','Whiskies','Buchanan''s',1050.00,1280.00,3.000
  UNION ALL SELECT 'WHI-CHI-12','9900000000010','Chivas Regal 12 750 ml','Whiskies','Chivas Regal',930.00,1150.00,3.000
  UNION ALL SELECT 'WHI-JDO-075','9900000000011','Jack Daniel''s Old No. 7 750 ml','Whiskies','Jack Daniel''s',760.00,950.00,3.000
  UNION ALL SELECT 'VOD-ABS-075','9900000000012','Absolut Original 750 ml','Vodkas','Absolut',480.00,610.00,4.000
  UNION ALL SELECT 'VOD-SMI-021','9900000000013','Smirnoff No. 21 750 ml','Vodkas','Smirnoff',340.00,450.00,4.000
  UNION ALL SELECT 'TEQ-JCE-075','9900000000014','José Cuervo Especial 750 ml','Tequilas','José Cuervo',560.00,720.00,3.000
  UNION ALL SELECT 'TEQ-DJB-075','9900000000015','Don Julio Blanco 750 ml','Tequilas','Don Julio',1200.00,1490.00,2.000
  UNION ALL SELECT 'LIC-BAI-075','9900000000016','Baileys Original 750 ml','Licores','Baileys',650.00,820.00,3.000
  UNION ALL SELECT 'LIC-JAG-070','9900000000017','Jägermeister 700 ml','Licores','Jägermeister',690.00,860.00,3.000
  UNION ALL SELECT 'CER-TON-UND','9900000000018','Toña','Cervezas','Toña',30.00,42.00,24.000
  UNION ALL SELECT 'CER-VIC-UND','9900000000019','Victoria Clásica','Cervezas','Victoria Clásica',28.00,40.00,24.000
  UNION ALL SELECT 'CER-HEI-UND','9900000000020','Heineken','Cervezas','Heineken',42.00,58.00,18.000
  UNION ALL SELECT 'VIN-CDT-CAB','9900000000021','Casillero del Diablo Cabernet Sauvignon 750 ml','Vinos','Casillero del Diablo',390.00,520.00,3.000
  UNION ALL SELECT 'VIN-CDT-MER','9900000000022','Casillero del Diablo Merlot 750 ml','Vinos','Casillero del Diablo',390.00,520.00,3.000
  UNION ALL SELECT 'VIN-CYT-RES','9900000000023','Concha y Toro Reservado 750 ml','Vinos','Concha y Toro',280.00,390.00,3.000
  UNION ALL SELECT 'SAL-COC-2L','9900000000024','Coca-Cola 2 L','Bebidas sin alcohol','Coca-Cola',55.00,75.00,10.000
  UNION ALL SELECT 'SAL-AGU-060','9900000000025','Agua Mineral 600 ml','Bebidas sin alcohol','Coca-Cola',15.00,25.00,12.000
) d
INNER JOIN categorias c ON c.nombre = d.categoria
INNER JOIN marcas m ON m.nombre = d.marca
INNER JOIN unidades_medida u ON u.nombre = 'Unidad'
WHERE @preflight_ok = 1;

-- ---------------------------------------------------------------------------
-- 5. Seis compras: cinco recibidas y una recibida posteriormente anulada.
-- ---------------------------------------------------------------------------

INSERT INTO compras
  (numero_compra, numero_documento_proveedor, id_proveedor, id_usuario,
   fecha_compra, subtotal, descuento, impuesto, total, estado, observacion)
SELECT d.numero, d.documento, p.id_proveedor, 1,
       CURRENT_DATE - INTERVAL d.dias DAY + INTERVAL 9 HOUR,
       0.00, 0.00, 0.00, 0.00, d.estado, d.observacion
FROM (
  SELECT 'DEMO-COM-001' numero, 'DEMO-PRV-001' documento,
         'Distribuidora Central de Nicaragua' proveedor, 29 dias, 'recibida' estado, 'Compra demostrativa recibida.' observacion
  UNION ALL SELECT 'DEMO-COM-002','DEMO-PRV-002','Importadora Premium Nicaragua',27,'recibida','Compra demostrativa recibida.'
  UNION ALL SELECT 'DEMO-COM-003','DEMO-PRV-003','Comercializadora del Pacífico',25,'recibida','Compra demostrativa recibida.'
  UNION ALL SELECT 'DEMO-COM-004','DEMO-PRV-004','Distribuciones León',23,'recibida','Compra demostrativa recibida.'
  UNION ALL SELECT 'DEMO-COM-005','DEMO-PRV-005','Distribuidora Central de Nicaragua',21,'recibida','Compra demostrativa recibida.'
  UNION ALL SELECT 'DEMO-COM-006','DEMO-PRV-006','Comercializadora del Pacífico',20,'anulada','Compra demo.\n[ANULACIÓN] Anulación demostrativa de compra.'
) d
INNER JOIN proveedores p ON p.nombre = d.proveedor
WHERE @preflight_ok = 1;

INSERT INTO detalle_compras
  (id_compra, id_producto, cantidad, costo_unitario, descuento, impuesto, subtotal)
SELECT c.id_compra, p.id_producto, d.cantidad, p.costo_promedio, 0.00,
       IF(@tax_active = 'true', ROUND(d.cantidad * p.costo_promedio * @tax_rate / 100, 2), 0.00),
       ROUND(d.cantidad * p.costo_promedio, 2)
FROM (
  SELECT 'DEMO-COM-001' compra, 'RON-FDC-04' codigo, 12.000 cantidad
  UNION ALL SELECT 'DEMO-COM-001','RON-FDC-05',11.000
  UNION ALL SELECT 'DEMO-COM-001','RON-FDC-07',9.000
  UNION ALL SELECT 'DEMO-COM-001','RON-FDC-12',7.000
  UNION ALL SELECT 'DEMO-COM-001','RON-FDC-18',1.000
  UNION ALL SELECT 'DEMO-COM-001','RON-ZAC-23',5.000
  UNION ALL SELECT 'DEMO-COM-002','WHI-JWR-075',10.000
  UNION ALL SELECT 'DEMO-COM-002','WHI-JWB-075',7.000
  UNION ALL SELECT 'DEMO-COM-002','WHI-BUC-12',7.000
  UNION ALL SELECT 'DEMO-COM-002','WHI-CHI-12',8.000
  UNION ALL SELECT 'DEMO-COM-002','WHI-JDO-075',7.000
  UNION ALL SELECT 'DEMO-COM-003','VOD-ABS-075',11.000
  UNION ALL SELECT 'DEMO-COM-003','VOD-SMI-021',12.000
  UNION ALL SELECT 'DEMO-COM-003','TEQ-JCE-075',7.000
  UNION ALL SELECT 'DEMO-COM-003','TEQ-DJB-075',1.000
  UNION ALL SELECT 'DEMO-COM-003','LIC-BAI-075',7.000
  UNION ALL SELECT 'DEMO-COM-004','CER-TON-UND',54.000
  UNION ALL SELECT 'DEMO-COM-004','CER-VIC-UND',54.000
  UNION ALL SELECT 'DEMO-COM-004','CER-HEI-UND',38.000
  UNION ALL SELECT 'DEMO-COM-004','VIN-CDT-CAB',9.000
  UNION ALL SELECT 'DEMO-COM-004','VIN-CDT-MER',9.000
  UNION ALL SELECT 'DEMO-COM-005','VIN-CYT-RES',9.000
  UNION ALL SELECT 'DEMO-COM-005','SAL-COC-2L',25.000
  UNION ALL SELECT 'DEMO-COM-005','SAL-AGU-060',32.000
  UNION ALL SELECT 'DEMO-COM-006','RON-FDC-04',2.000
  UNION ALL SELECT 'DEMO-COM-006','WHI-JWR-075',2.000
  UNION ALL SELECT 'DEMO-COM-006','LIC-JAG-070',3.000
) d
INNER JOIN compras c ON c.numero_compra = d.compra
INNER JOIN productos p ON p.codigo = d.codigo
WHERE @preflight_ok = 1;

UPDATE compras c
INNER JOIN (
  SELECT id_compra, SUM(subtotal) subtotal, SUM(descuento) descuento,
         SUM(impuesto) impuesto, SUM(subtotal - descuento + impuesto) total
  FROM detalle_compras GROUP BY id_compra
) t ON t.id_compra = c.id_compra
SET c.subtotal = t.subtotal, c.descuento = t.descuento,
    c.impuesto = t.impuesto, c.total = t.total
WHERE @preflight_ok = 1;

INSERT INTO movimientos_inventario
  (id_producto, tipo_movimiento, naturaleza, cantidad, existencia_anterior,
   existencia_posterior, tipo_referencia, id_referencia, motivo,
   id_usuario, fecha_movimiento)
SELECT dc.id_producto, 'compra', 'entrada', dc.cantidad, 0.000, dc.cantidad,
       'compra', c.id_compra, 'Recepción de compra', 1,
       c.fecha_compra + INTERVAL 1 HOUR
FROM detalle_compras dc
INNER JOIN compras c ON c.id_compra = dc.id_compra AND c.estado = 'recibida'
WHERE @preflight_ok = 1;

INSERT INTO movimientos_inventario
  (id_producto, tipo_movimiento, naturaleza, cantidad, existencia_anterior,
   existencia_posterior, tipo_referencia, id_referencia, motivo,
   id_usuario, fecha_movimiento)
SELECT dc.id_producto, 'compra', 'entrada', dc.cantidad,
       COALESCE(base.existencia_base, 0), COALESCE(base.existencia_base, 0) + dc.cantidad,
       'compra', c.id_compra, 'Recepción de compra', 1,
       c.fecha_compra + INTERVAL 1 HOUR
FROM detalle_compras dc
INNER JOIN compras c ON c.id_compra = dc.id_compra AND c.estado = 'anulada'
LEFT JOIN (
  SELECT dc2.id_producto, SUM(dc2.cantidad) existencia_base
  FROM detalle_compras dc2
  INNER JOIN compras c2 ON c2.id_compra = dc2.id_compra AND c2.estado = 'recibida'
  GROUP BY dc2.id_producto
) base ON base.id_producto = dc.id_producto
WHERE @preflight_ok = 1;

INSERT INTO movimientos_inventario
  (id_producto, tipo_movimiento, naturaleza, cantidad, existencia_anterior,
   existencia_posterior, tipo_referencia, id_referencia, motivo,
   id_usuario, fecha_movimiento)
SELECT dc.id_producto, 'anulacion_compra', 'salida', dc.cantidad,
       COALESCE(base.existencia_base, 0) + dc.cantidad, COALESCE(base.existencia_base, 0),
       'compra', c.id_compra, 'Anulación de compra', 1,
       c.fecha_compra + INTERVAL 2 HOUR
FROM detalle_compras dc
INNER JOIN compras c ON c.id_compra = dc.id_compra AND c.estado = 'anulada'
LEFT JOIN (
  SELECT dc2.id_producto, SUM(dc2.cantidad) existencia_base
  FROM detalle_compras dc2
  INNER JOIN compras c2 ON c2.id_compra = dc2.id_compra AND c2.estado = 'recibida'
  GROUP BY dc2.id_producto
) base ON base.id_producto = dc.id_producto
WHERE @preflight_ok = 1;

UPDATE productos p
INNER JOIN (
  SELECT dc.id_producto, SUM(dc.cantidad) existencia
  FROM detalle_compras dc
  INNER JOIN compras c ON c.id_compra = dc.id_compra AND c.estado = 'recibida'
  GROUP BY dc.id_producto
) stock ON stock.id_producto = p.id_producto
SET p.existencia = stock.existencia
WHERE @preflight_ok = 1;

-- ---------------------------------------------------------------------------
-- 6. Actividad de ventas diferida
-- ---------------------------------------------------------------------------
-- Las tablas ventas, detalle_ventas, pagos_venta, cajas y movimientos_caja
-- permanecen vacias. La actividad comercial se cargara posteriormente mediante
-- database/demo-sales.sql, despues de crear y validar los vendedores reales.

-- ---------------------------------------------------------------------------
-- 7. Bitacora demo minima y legible.
-- ---------------------------------------------------------------------------

INSERT INTO bitacora
  (id_usuario, modulo, accion, entidad, id_entidad, datos_anteriores,
   datos_nuevos, direccion_ip, resultado, fecha_evento)
SELECT 1, 'sistema', 'cargar_dataset_demo', NULL, NULL, NULL,
       JSON_OBJECT('categorias', 8, 'marcas', 18, 'productos', 25,
                   'compras', 6, 'ventas', 0),
       '127.0.0.1', 'exitoso', NOW()
WHERE @preflight_ok = 1;

INSERT INTO bitacora
  (id_usuario, modulo, accion, entidad, id_entidad, datos_anteriores,
   datos_nuevos, direccion_ip, resultado, fecha_evento)
SELECT 1, 'compras', IF(c.estado = 'anulada', 'anular', 'confirmar'),
       'compras', c.id_compra, NULL,
       JSON_OBJECT('numero_compra', c.numero_compra, 'estado', c.estado,
                   'total', c.total),
       '127.0.0.1', 'exitoso', c.fecha_compra + INTERVAL 2 HOUR
FROM compras c WHERE @preflight_ok = 1;

-- ---------------------------------------------------------------------------
-- 8. Validaciones finales y decision atomica COMMIT/ROLLBACK.
-- ---------------------------------------------------------------------------

SELECT COUNT(*), COALESCE(SUM(CRC32(CONCAT_WS('|', id_rol, nombre,
       COALESCE(descripcion, ''), es_sistema, estado))), 0)
INTO @roles_count_after, @roles_crc_after FROM roles;
SELECT COUNT(*), COALESCE(SUM(CRC32(CONCAT_WS('|', id_permiso, codigo, nombre,
       modulo, COALESCE(descripcion, '')))), 0)
INTO @permissions_count_after, @permissions_crc_after FROM permisos;
SELECT COUNT(*), COALESCE(SUM(CRC32(CONCAT_WS('|', id_rol, id_permiso,
       concedido_en))), 0)
INTO @role_permissions_count_after, @role_permissions_crc_after FROM rol_permisos;
SELECT COUNT(*), COALESCE(SUM(CRC32(CONCAT_WS('|', id_configuracion, clave,
       valor, tipo_dato, COALESCE(descripcion, ''),
       es_critica))), 0)
INTO @configuration_count_after, @configuration_crc_after FROM configuracion;
SELECT COUNT(*), COALESCE(SUM(CRC32(CONCAT_WS('|', id_metodo_pago, nombre,
       requiere_referencia, es_efectivo, estado))), 0)
INTO @payment_methods_count_after, @payment_methods_crc_after FROM metodos_pago;

SELECT SHA2(CONCAT_WS('|', id_usuario, nombre, apellido, nombre_usuario,
                      COALESCE(correo, ''), password_hash, estado), 256)
INTO @admin_fingerprint_after FROM usuarios WHERE id_usuario = 1;
SELECT valor INTO @session_epoch_after
FROM configuracion WHERE clave = 'jwt_session_epoch';
SELECT SHA2(CONCAT_WS('|', id_respaldo, nombre_archivo, ruta_segura,
                      COALESCE(tamano_bytes, ''), tipo, operacion, estado,
                      id_usuario, COALESCE(mensaje_resultado, ''), fecha_operacion,
                      COALESCE(fecha_finalizacion, ''), COALESCE(checksum_sha256, ''),
                      COALESCE(formato_version, ''), archivo_disponible,
                      COALESCE(id_respaldo_origen, ''),
                      COALESCE(id_respaldo_preventivo, '')), 256)
INTO @backup_fingerprint_after FROM respaldos WHERE id_respaldo = 5;

SELECT (
  @preflight_ok = 1
  AND @admin_fingerprint_before = @admin_fingerprint_after
  AND @session_epoch_before = @session_epoch_after
  AND @backup_fingerprint_before = @backup_fingerprint_after
  AND @roles_count_before = @roles_count_after AND @roles_crc_before = @roles_crc_after
  AND @permissions_count_before = @permissions_count_after AND @permissions_crc_before = @permissions_crc_after
  AND @role_permissions_count_before = @role_permissions_count_after AND @role_permissions_crc_before = @role_permissions_crc_after
  AND @configuration_count_before = @configuration_count_after AND @configuration_crc_before = @configuration_crc_after
  AND NOT EXISTS (
    SELECT 1 FROM configuracion
    WHERE id_usuario_actualizacion IS NOT NULL
      AND id_usuario_actualizacion <> 1
  )
  AND @payment_methods_count_before = @payment_methods_count_after AND @payment_methods_crc_before = @payment_methods_crc_after
  AND (SELECT COUNT(*) FROM clientes WHERE es_consumidor_final = TRUE AND estado = 'activo') = 1
  AND (SELECT COUNT(*) FROM categorias) = 8
  AND (SELECT COUNT(*) FROM marcas) = 18
  AND (SELECT COUNT(*) FROM productos) = 25
  AND (SELECT COUNT(*) FROM productos WHERE imagen_referencia IS NOT NULL) = 0
  AND (SELECT COUNT(*) FROM marcas WHERE imagen_referencia IS NOT NULL) = 0
  AND (SELECT COUNT(*) FROM usuarios) = 1
  AND EXISTS (
    SELECT 1 FROM usuarios u
    INNER JOIN usuario_roles ur ON ur.id_usuario = u.id_usuario
    INNER JOIN roles r ON r.id_rol = ur.id_rol
    WHERE u.id_usuario = 1 AND u.nombre_usuario = 'administrador'
      AND u.estado = 'activo' AND r.nombre = 'Administrador' AND r.estado = 'activo'
  )
  AND (SELECT COUNT(*) FROM proveedores) = 4
  AND (SELECT COUNT(*) FROM clientes) = 6
  AND (SELECT COUNT(*) FROM compras) = 6
  AND (SELECT COUNT(*) FROM compras WHERE estado = 'recibida') = 5
  AND (SELECT COUNT(*) FROM compras WHERE estado = 'anulada') = 1
  AND (SELECT COUNT(*) FROM detalle_compras) = 27
  AND NOT EXISTS (SELECT 1 FROM compras c WHERE NOT EXISTS
       (SELECT 1 FROM detalle_compras dc WHERE dc.id_compra = c.id_compra))
  AND NOT EXISTS (
    SELECT 1 FROM compras c LEFT JOIN usuarios u ON u.id_usuario = c.id_usuario
    WHERE u.id_usuario IS NULL
  )
  AND NOT EXISTS (SELECT 1 FROM compras WHERE id_usuario <> 1)
  AND NOT EXISTS (SELECT 1 FROM movimientos_inventario WHERE id_usuario <> 1)
  AND NOT EXISTS (SELECT 1 FROM bitacora WHERE id_usuario IS NOT NULL AND id_usuario <> 1)
  AND (SELECT COUNT(*) FROM ventas) = 0
  AND (SELECT COUNT(*) FROM detalle_ventas) = 0
  AND (SELECT COUNT(*) FROM pagos_venta) = 0
  AND (SELECT COUNT(*) FROM cajas) = 0
  AND (SELECT COUNT(*) FROM movimientos_caja) = 0
  AND (SELECT COUNT(*) FROM ajustes_inventario) = 0
  AND (SELECT COUNT(*) FROM movimientos_inventario) = 30
  AND NOT EXISTS (
    SELECT 1 FROM movimientos_inventario
    WHERE tipo_referencia <> 'compra'
       OR tipo_movimiento NOT IN ('compra', 'anulacion_compra')
  )
  AND NOT EXISTS (
    SELECT 1 FROM detalle_compras dc
    INNER JOIN compras c ON c.id_compra = dc.id_compra
    LEFT JOIN movimientos_inventario mi
      ON mi.id_producto = dc.id_producto
     AND mi.id_referencia = dc.id_compra
     AND mi.tipo_referencia = 'compra'
    GROUP BY dc.id_detalle_compra, c.estado
    HAVING COUNT(mi.id_movimiento_inventario) <>
           CASE WHEN c.estado = 'anulada' THEN 2 ELSE 1 END
  )
  AND NOT EXISTS (SELECT 1 FROM productos WHERE existencia < 0)
  AND (SELECT COUNT(*) FROM productos WHERE existencia <= existencia_minima) = 3
  AND (SELECT existencia FROM productos WHERE codigo='RON-FDC-18') = 1.000
  AND (SELECT existencia FROM productos WHERE codigo='TEQ-DJB-075') = 1.000
  AND (SELECT existencia FROM productos WHERE codigo='LIC-JAG-070') = 0.000
  AND NOT EXISTS (
    SELECT 1 FROM productos p
    LEFT JOIN (
      SELECT id_producto,
             SUM(CASE WHEN naturaleza='entrada' THEN cantidad ELSE -cantidad END) saldo
      FROM movimientos_inventario GROUP BY id_producto
    ) m ON m.id_producto = p.id_producto
    WHERE p.existencia <> COALESCE(m.saldo, 0)
  )
) INTO @all_valid;

SELECT 'administrador intacto' validacion,
       @admin_fingerprint_before = @admin_fingerprint_after correcto
UNION ALL SELECT 'jwt_session_epoch intacto', @session_epoch_before = @session_epoch_after
UNION ALL SELECT 'respaldo 5 intacto', @backup_fingerprint_before = @backup_fingerprint_after
UNION ALL SELECT 'autor configuracion valido', (SELECT COUNT(*)=0 FROM configuracion WHERE id_usuario_actualizacion IS NOT NULL AND id_usuario_actualizacion<>1)
UNION ALL SELECT 'categorias', (SELECT COUNT(*) = 8 FROM categorias)
UNION ALL SELECT 'marcas', (SELECT COUNT(*) = 18 FROM marcas)
UNION ALL SELECT 'productos', (SELECT COUNT(*) = 25 FROM productos)
UNION ALL SELECT 'solo administrador', (SELECT COUNT(*)=1 AND SUM(id_usuario=1 AND nombre_usuario='administrador' AND estado='activo')=1 FROM usuarios)
UNION ALL SELECT 'compras 5+1', (SELECT COUNT(*)=6 AND SUM(estado='recibida')=5 AND SUM(estado='anulada')=1 FROM compras)
UNION ALL SELECT 'inventario conciliado', (SELECT COUNT(*)=30 FROM movimientos_inventario)
UNION ALL SELECT 'ventas vacias', (SELECT COUNT(*)=0 FROM ventas)
UNION ALL SELECT 'detalle ventas vacio', (SELECT COUNT(*)=0 FROM detalle_ventas)
UNION ALL SELECT 'pagos venta vacios', (SELECT COUNT(*)=0 FROM pagos_venta)
UNION ALL SELECT 'cajas vacias', (SELECT COUNT(*)=0 FROM cajas)
UNION ALL SELECT 'movimientos caja vacios', (SELECT COUNT(*)=0 FROM movimientos_caja)
UNION ALL SELECT 'stock bajo/agotado previsto', (SELECT COUNT(*)=3 FROM productos WHERE existencia<=existencia_minima)
UNION ALL SELECT 'validacion global', @all_valid;

-- MariaDB permite preparar COMMIT y ROLLBACK. La decision depende unicamente
-- de @all_valid: nunca se confirma un dataset que no supere las validaciones.
SET @demo_transaction_decision = IF(@all_valid = 1, 'COMMIT', 'ROLLBACK');
PREPARE demo_transaction_statement FROM @demo_transaction_decision;
EXECUTE demo_transaction_statement;
DEALLOCATE PREPARE demo_transaction_statement;

SELECT @demo_transaction_decision AS decision_final,
       CASE WHEN @all_valid = 1
            THEN 'Dataset demo confirmado'
            ELSE 'Dataset demo descartado; no se conservaron cambios'
       END AS resultado;
