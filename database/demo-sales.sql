-- LIQUORIX - actividad comercial demostrativa
--
-- NO ejecutar directamente en produccion sin validarlo antes sobre una copia.
-- Prueba recomendada:
--   1. Restaurar una copia reciente como sistema_licoreria_restore_test.
--   2. Copiar temporalmente este archivo fuera del repositorio.
--   3. Cambiar SOLO la comparacion DATABASE() del preflight de esa copia a
--      'sistema_licoreria_restore_test'.
--   4. Ejecutar la copia y comprobar que decision_final sea COMMIT.
--   5. Revisar las consultas de validacion y descartar la base temporal.
-- El archivo versionado solo autoriza sistema_licoreria y nunca borra actividad.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 1. Resolucion por claves naturales y preflight de solo lectura
-- ---------------------------------------------------------------------------

SELECT id_usuario INTO @carlos_id
FROM usuarios WHERE nombre_usuario = 'carlos.mendoza' AND estado = 'activo'
LIMIT 1;
SELECT id_usuario INTO @sofia_id
FROM usuarios WHERE nombre_usuario = 'sofia.rojas' AND estado = 'activo'
LIMIT 1;
SELECT id_usuario INTO @daniel_id
FROM usuarios WHERE nombre_usuario = 'daniel.lopez' AND estado = 'activo'
LIMIT 1;
SELECT MIN(u.id_usuario) INTO @admin_id
FROM usuarios u
INNER JOIN usuario_roles ur ON ur.id_usuario = u.id_usuario
INNER JOIN roles r ON r.id_rol = ur.id_rol
WHERE u.estado = 'activo' AND r.nombre = 'Administrador' AND r.estado = 'activo';

SELECT id_metodo_pago INTO @efectivo_id
FROM metodos_pago WHERE nombre = 'Efectivo' AND estado = 'activo' LIMIT 1;
SELECT id_metodo_pago INTO @tarjeta_id
FROM metodos_pago WHERE nombre = 'Tarjeta' AND estado = 'activo' LIMIT 1;
SELECT id_metodo_pago INTO @transferencia_id
FROM metodos_pago WHERE nombre = 'Transferencia' AND estado = 'activo' LIMIT 1;

SELECT valor INTO @tax_active FROM configuracion WHERE clave = 'impuesto_activo';
SELECT CAST(valor AS DECIMAL(5,2)) INTO @tax_rate
FROM configuracion WHERE clave = 'tasa_impuesto';
SELECT CAST(valor AS DECIMAL(5,2)) INTO @discount_max
FROM configuracion WHERE clave = 'descuento_maximo';
SELECT valor INTO @cash_control
FROM configuracion WHERE clave = 'control_caja_activo';
SELECT valor INTO @session_epoch
FROM configuracion WHERE clave = 'jwt_session_epoch';

DROP TEMPORARY TABLE IF EXISTS demo_sales_plan;
CREATE TEMPORARY TABLE demo_sales_plan (
  sale_no INT UNSIGNED NOT NULL PRIMARY KEY,
  seller_key VARCHAR(20) NOT NULL,
  day_offset INT UNSIGNED NOT NULL,
  sale_hour INT UNSIGNED NOT NULL,
  client_slot INT UNSIGNED NOT NULL,
  payment_kind VARCHAR(20) NOT NULL,
  cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  discounted BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE = InnoDB;

INSERT INTO demo_sales_plan
  (sale_no, seller_key, day_offset, sale_hour, client_slot, payment_kind, cancelled, discounted)
VALUES
  (1,'carlos',29,10,1,'cash',FALSE,FALSE),(2,'carlos',27,15,2,'cash',FALSE,FALSE),
  (3,'carlos',25,11,3,'cash',FALSE,FALSE),(4,'carlos',23,17,4,'cash',FALSE,FALSE),
  (5,'carlos',21,12,5,'cash',FALSE,TRUE),(6,'carlos',19,18,6,'cash',FALSE,FALSE),
  (7,'carlos',17,11,1,'cash',FALSE,FALSE),(8,'carlos',15,16,2,'cash',FALSE,FALSE),
  (9,'carlos',13,10,3,'card',FALSE,FALSE),(10,'carlos',11,14,4,'card',FALSE,FALSE),
  (11,'carlos',9,18,5,'card',FALSE,FALSE),(12,'carlos',7,12,6,'card',FALSE,FALSE),
  (13,'carlos',5,16,1,'card',FALSE,FALSE),(14,'carlos',3,13,2,'card',TRUE,FALSE),
  (15,'carlos',0,10,3,'transfer',FALSE,FALSE),(16,'carlos',0,17,4,'transfer',FALSE,FALSE),
  (17,'sofia',28,10,5,'cash',FALSE,FALSE),(18,'sofia',26,16,6,'cash',FALSE,TRUE),
  (19,'sofia',24,11,1,'cash',FALSE,FALSE),(20,'sofia',22,18,2,'cash',FALSE,FALSE),
  (21,'sofia',20,12,3,'cash',FALSE,FALSE),(22,'sofia',18,17,4,'cash',FALSE,FALSE),
  (23,'sofia',16,10,5,'cash',FALSE,FALSE),(24,'sofia',14,15,6,'cash',FALSE,FALSE),
  (25,'sofia',12,11,1,'card',FALSE,FALSE),(26,'sofia',10,16,2,'card',FALSE,FALSE),
  (27,'sofia',8,12,3,'card',FALSE,TRUE),(28,'sofia',6,18,4,'card',FALSE,FALSE),
  (29,'sofia',0,11,5,'card',FALSE,FALSE),(30,'sofia',0,18,6,'transfer',FALSE,FALSE);

DROP TEMPORARY TABLE IF EXISTS demo_detail_plan;
CREATE TEMPORARY TABLE demo_detail_plan (
  sale_no INT UNSIGNED NOT NULL,
  codigo VARCHAR(60) NOT NULL,
  cantidad DECIMAL(12,3) NOT NULL,
  discount_line BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (sale_no, codigo)
) ENGINE = InnoDB;

-- Una linea principal en cada venta: variedad sin consumir los tres productos
-- que deben conservarse como escenarios de stock bajo/agotado.
INSERT INTO demo_detail_plan (sale_no, codigo, cantidad, discount_line)
SELECT sale_no,
       CASE MOD(sale_no - 1, 10)
         WHEN 0 THEN 'RON-FDC-04' WHEN 1 THEN 'RON-FDC-05'
         WHEN 2 THEN 'RON-FDC-07' WHEN 3 THEN 'WHI-JWR-075'
         WHEN 4 THEN 'VOD-ABS-075' WHEN 5 THEN 'VOD-SMI-021'
         WHEN 6 THEN 'CER-TON-UND' WHEN 7 THEN 'CER-VIC-UND'
         WHEN 8 THEN 'CER-HEI-UND' ELSE 'SAL-COC-2L'
       END,
       CASE WHEN MOD(sale_no - 1, 10) IN (6,7,8) THEN 3.000
            WHEN MOD(sale_no - 1, 10) = 9 THEN 2.000 ELSE 1.000 END,
       discounted
FROM demo_sales_plan;

-- Una segunda linea en ventas pares aporta tequila, vinos, licor y whiskies.
INSERT INTO demo_detail_plan (sale_no, codigo, cantidad, discount_line)
SELECT sale_no,
       CASE MOD(sale_no / 2, 6)
         WHEN 0 THEN 'TEQ-JCE-075' WHEN 1 THEN 'VIN-CDT-CAB'
         WHEN 2 THEN 'VIN-CDT-MER' WHEN 3 THEN 'VIN-CYT-RES'
         WHEN 4 THEN 'LIC-BAI-075' ELSE 'WHI-CHI-12'
       END,
       1.000, FALSE
FROM demo_sales_plan WHERE MOD(sale_no, 2) = 0;

-- Agua en diez ventas: cantidades moderadas y utilidad para la categoria sin alcohol.
INSERT INTO demo_detail_plan (sale_no, codigo, cantidad, discount_line)
SELECT sale_no, 'SAL-AGU-060', 2.000, FALSE
FROM demo_sales_plan WHERE MOD(sale_no, 3) = 0;

SELECT (
  DATABASE() = 'sistema_licoreria'
  AND (SELECT COUNT(*) FROM demo_sales_plan) = 30
  AND (SELECT COUNT(*) FROM ventas) = 0
  AND (SELECT COUNT(*) FROM cajas) = 0
  AND (SELECT COUNT(*) FROM pagos_venta) = 0
  AND (SELECT COUNT(*) FROM movimientos_caja) = 0
  AND (SELECT COUNT(*) FROM detalle_ventas) = 0
  AND @carlos_id IS NOT NULL AND @sofia_id IS NOT NULL AND @daniel_id IS NOT NULL
  AND @admin_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM usuario_roles ur INNER JOIN roles r ON r.id_rol=ur.id_rol
              WHERE ur.id_usuario=@carlos_id AND r.nombre='Vendedor' AND r.estado='activo')
  AND EXISTS (SELECT 1 FROM usuario_roles ur INNER JOIN roles r ON r.id_rol=ur.id_rol
              WHERE ur.id_usuario=@sofia_id AND r.nombre='Vendedor' AND r.estado='activo')
  AND EXISTS (SELECT 1 FROM usuario_roles ur INNER JOIN roles r ON r.id_rol=ur.id_rol
              WHERE ur.id_usuario=@daniel_id AND r.nombre='Consulta' AND r.estado='activo')
  AND EXISTS (
    SELECT 1 FROM usuario_roles ur
    INNER JOIN rol_permisos rp ON rp.id_rol=ur.id_rol
    INNER JOIN permisos p ON p.id_permiso=rp.id_permiso
    WHERE ur.id_usuario=@admin_id AND p.codigo='ventas.anular'
  )
  AND @efectivo_id IS NOT NULL AND @tarjeta_id IS NOT NULL AND @transferencia_id IS NOT NULL
  AND (SELECT COUNT(*) FROM metodos_pago
       WHERE id_metodo_pago IN (@efectivo_id,@tarjeta_id,@transferencia_id)
         AND estado='activo') = 3
  AND (SELECT es_efectivo=TRUE AND requiere_referencia=FALSE
       FROM metodos_pago WHERE id_metodo_pago=@efectivo_id)
  AND (SELECT es_efectivo=FALSE AND requiere_referencia=TRUE
       FROM metodos_pago WHERE id_metodo_pago=@tarjeta_id)
  AND (SELECT es_efectivo=FALSE AND requiere_referencia=TRUE
       FROM metodos_pago WHERE id_metodo_pago=@transferencia_id)
  AND (SELECT COUNT(*) FROM productos) = 25
  AND (SELECT COUNT(DISTINCT codigo) FROM demo_detail_plan) = 17
  AND NOT EXISTS (SELECT 1 FROM demo_detail_plan d
                  LEFT JOIN productos p ON p.codigo=d.codigo AND p.estado='activo'
                  WHERE p.id_producto IS NULL)
  AND NOT EXISTS (SELECT 1 FROM productos WHERE existencia < 0)
  AND NOT EXISTS (
    SELECT 1 FROM demo_detail_plan d INNER JOIN productos p ON p.codigo=d.codigo
    GROUP BY d.codigo, p.existencia
    HAVING SUM(d.cantidad) > p.existencia
  )
  AND (SELECT existencia FROM productos WHERE codigo='RON-FDC-18') = 1.000
  AND (SELECT existencia FROM productos WHERE codigo='TEQ-DJB-075') = 1.000
  AND (SELECT existencia FROM productos WHERE codigo='LIC-JAG-070') = 0.000
  AND NOT EXISTS (SELECT 1 FROM demo_detail_plan
                  WHERE codigo IN ('RON-FDC-18','TEQ-DJB-075','LIC-JAG-070'))
  AND (SELECT COUNT(*) FROM clientes WHERE estado='activo') >= 6
  AND (SELECT COUNT(*) FROM clientes WHERE es_consumidor_final=TRUE AND estado='activo') = 1
  AND (SELECT COUNT(*) FROM configuracion
       WHERE clave IN ('impuesto_activo','tasa_impuesto','descuento_maximo',
                       'control_caja_activo','jwt_session_epoch')) = 5
  AND @tax_active IN ('true','false') AND @tax_rate BETWEEN 0 AND 100
  AND @discount_max BETWEEN 0 AND 100 AND @cash_control IN ('true','false')
  AND @session_epoch IS NOT NULL AND @session_epoch <> ''
  AND NOT EXISTS (
    SELECT 1 FROM productos p
    LEFT JOIN (
      SELECT id_producto,
             SUM(CASE WHEN naturaleza='entrada' THEN cantidad ELSE -cantidad END) saldo
      FROM movimientos_inventario GROUP BY id_producto
    ) m ON m.id_producto=p.id_producto
    WHERE p.existencia <> COALESCE(m.saldo,0)
  )
) INTO @preflight_ok;

SELECT 'preflight' validacion, @preflight_ok correcto,
       CASE WHEN @preflight_ok=1 THEN 'Listo para transaccion'
            ELSE 'ABORTAR: base, usuarios, roles, catalogos, configuracion o actividad previa incompatible'
       END detalle;

START TRANSACTION;

-- ---------------------------------------------------------------------------
-- 2. Cajas historicas (una por vendedor y dia con ventas)
-- ---------------------------------------------------------------------------

INSERT INTO cajas
  (id_usuario,fecha_apertura,monto_apertura,fecha_cierre,monto_cierre,
   monto_esperado,monto_contado,diferencia,estado,observacion)
SELECT DISTINCT
       IF(seller_key='carlos',@carlos_id,@sofia_id),
       CURRENT_DATE - INTERVAL day_offset DAY + INTERVAL 8 HOUR,
       1000.00,
       CURRENT_DATE - INTERVAL day_offset DAY + INTERVAL 20 HOUR,
       1000.00,1000.00,1000.00,0.00,'cerrada','Caja historica demostrativa.'
FROM demo_sales_plan WHERE @preflight_ok=1;

-- ---------------------------------------------------------------------------
-- 3. Ventas, detalle y calculos fiscales iguales al servicio actual
-- ---------------------------------------------------------------------------

INSERT INTO ventas
  (numero_venta,numero_factura,id_cliente,id_usuario,id_caja,fecha_venta,
   subtotal,descuento,impuesto,total,estado,motivo_anulacion,anulada_por,anulada_en)
SELECT CONCAT('DEMO-VEN-',LPAD(sp.sale_no,4,'0')),
       CONCAT('DEMO-FAC-',LPAD(sp.sale_no,4,'0')),
       cl.id_cliente,
       IF(sp.seller_key='carlos',@carlos_id,@sofia_id),
       IF(@cash_control='true',c.id_caja,NULL),
       CURRENT_DATE - INTERVAL sp.day_offset DAY + INTERVAL sp.sale_hour HOUR,
       0.00,0.00,0.00,0.00,
       IF(sp.cancelled,'anulada','completada'),
       IF(sp.cancelled,'Anulación demostrativa por corrección de operación',NULL),
       IF(sp.cancelled,@admin_id,NULL),
       IF(sp.cancelled,CURRENT_DATE - INTERVAL sp.day_offset DAY + INTERVAL (sp.sale_hour * 60 + 30) MINUTE,NULL)
FROM demo_sales_plan sp
INNER JOIN (
  SELECT id_cliente, ROW_NUMBER() OVER (
    ORDER BY es_consumidor_final DESC, id_cliente
  ) client_slot
  FROM clientes WHERE estado='activo'
) cl ON cl.client_slot=sp.client_slot
INNER JOIN cajas c
  ON c.id_usuario=IF(sp.seller_key='carlos',@carlos_id,@sofia_id)
 AND DATE(c.fecha_apertura)=CURRENT_DATE - INTERVAL sp.day_offset DAY
WHERE @preflight_ok=1;

INSERT INTO detalle_ventas
  (id_venta,id_producto,cantidad,costo_unitario_historico,precio_unitario,
   descuento,impuesto,subtotal)
SELECT v.id_venta,p.id_producto,dp.cantidad,p.costo_promedio,p.precio_venta,
       IF(dp.discount_line AND @discount_max>0,
          ROUND(dp.cantidad*p.precio_venta*LEAST(@discount_max,5)/100,2),0.00),
       IF(@tax_active='true',
          ROUND((dp.cantidad*p.precio_venta-
            IF(dp.discount_line AND @discount_max>0,
               ROUND(dp.cantidad*p.precio_venta*LEAST(@discount_max,5)/100,2),0.00)
          )*@tax_rate/100,2),0.00),
       ROUND(dp.cantidad*p.precio_venta,2)
FROM demo_detail_plan dp
INNER JOIN ventas v ON v.numero_venta=CONCAT('DEMO-VEN-',LPAD(dp.sale_no,4,'0'))
INNER JOIN productos p ON p.codigo=dp.codigo
WHERE @preflight_ok=1;

UPDATE ventas v
INNER JOIN (
  SELECT id_venta,SUM(subtotal) subtotal,SUM(descuento) descuento,
         SUM(impuesto) impuesto,SUM(subtotal-descuento+impuesto) total
  FROM detalle_ventas GROUP BY id_venta
) t ON t.id_venta=v.id_venta
SET v.subtotal=t.subtotal,v.descuento=t.descuento,
    v.impuesto=t.impuesto,v.total=t.total
WHERE @preflight_ok=1;

-- ---------------------------------------------------------------------------
-- 4. Pagos: 29 completadas = 16 efectivo, 10 tarjeta, 3 transferencia.
-- La anulada conserva su pago historico de tarjeta.
-- ---------------------------------------------------------------------------

INSERT INTO pagos_venta
  (id_venta,id_metodo_pago,monto,referencia,monto_recibido,cambio)
SELECT v.id_venta,
       CASE sp.payment_kind WHEN 'cash' THEN @efectivo_id
            WHEN 'card' THEN @tarjeta_id ELSE @transferencia_id END,
       v.total,
       CASE sp.payment_kind
         WHEN 'card' THEN CONCAT('DEMO-TAR-',LPAD(sp.sale_no,4,'0'))
         WHEN 'transfer' THEN CONCAT('DEMO-TRF-',LPAD(sp.sale_no,4,'0'))
         ELSE NULL END,
       IF(sp.payment_kind='cash',CEIL(v.total/100)*100,NULL),
       IF(sp.payment_kind='cash',CEIL(v.total/100)*100-v.total,0.00)
FROM demo_sales_plan sp
INNER JOIN ventas v ON v.numero_venta=CONCAT('DEMO-VEN-',LPAD(sp.sale_no,4,'0'))
WHERE @preflight_ok=1;

-- ---------------------------------------------------------------------------
-- 5. Inventario: eventos cronologicos de salida y compensacion de anulacion
-- ---------------------------------------------------------------------------

DROP TEMPORARY TABLE IF EXISTS demo_inventory_events;
CREATE TEMPORARY TABLE demo_inventory_events (
  event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_producto BIGINT UNSIGNED NOT NULL,
  id_venta BIGINT UNSIGNED NOT NULL,
  id_usuario BIGINT UNSIGNED NOT NULL,
  fecha_movimiento DATETIME NOT NULL,
  tipo_movimiento VARCHAR(40) NOT NULL,
  naturaleza VARCHAR(10) NOT NULL,
  cantidad DECIMAL(12,3) NOT NULL,
  signed_quantity DECIMAL(12,3) NOT NULL,
  motivo VARCHAR(500) NULL
) ENGINE = InnoDB;

INSERT INTO demo_inventory_events
  (id_producto,id_venta,id_usuario,fecha_movimiento,tipo_movimiento,
   naturaleza,cantidad,signed_quantity,motivo)
SELECT dv.id_producto,v.id_venta,v.id_usuario,v.fecha_venta,
       'venta','salida',dv.cantidad,-dv.cantidad,'Venta confirmada'
FROM detalle_ventas dv INNER JOIN ventas v ON v.id_venta=dv.id_venta
WHERE @preflight_ok=1;

INSERT INTO demo_inventory_events
  (id_producto,id_venta,id_usuario,fecha_movimiento,tipo_movimiento,
   naturaleza,cantidad,signed_quantity,motivo)
SELECT dv.id_producto,v.id_venta,@admin_id,v.anulada_en,
       'anulacion_venta','entrada',dv.cantidad,dv.cantidad,
       'Anulación demostrativa por corrección de operación'
FROM detalle_ventas dv INNER JOIN ventas v ON v.id_venta=dv.id_venta
WHERE v.estado='anulada' AND @preflight_ok=1;

INSERT INTO movimientos_inventario
  (id_producto,tipo_movimiento,naturaleza,cantidad,existencia_anterior,
   existencia_posterior,tipo_referencia,id_referencia,motivo,id_usuario,fecha_movimiento)
SELECT e.id_producto,e.tipo_movimiento,e.naturaleza,e.cantidad,
       p.existencia + COALESCE(SUM(e.signed_quantity) OVER (
         PARTITION BY e.id_producto ORDER BY e.fecha_movimiento,e.event_id
         ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0),
       p.existencia + SUM(e.signed_quantity) OVER (
         PARTITION BY e.id_producto ORDER BY e.fecha_movimiento,e.event_id
         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW),
       'venta',e.id_venta,e.motivo,e.id_usuario,e.fecha_movimiento
FROM demo_inventory_events e
INNER JOIN productos p ON p.id_producto=e.id_producto
WHERE @preflight_ok=1;

UPDATE productos p
INNER JOIN (
  SELECT id_producto,SUM(signed_quantity) stock_delta
  FROM demo_inventory_events GROUP BY id_producto
) d ON d.id_producto=p.id_producto
SET p.existencia=p.existencia+d.stock_delta
WHERE @preflight_ok=1;

-- ---------------------------------------------------------------------------
-- 6. Caja: el backend solo genera movimiento por efectivo cuando el control
--    de caja esta activo. Tarjeta y transferencia nunca afectan efectivo.
-- ---------------------------------------------------------------------------

INSERT INTO movimientos_caja
  (id_caja,id_venta,id_usuario,tipo_movimiento,naturaleza,afecta_efectivo,
   monto,concepto,fecha_movimiento)
SELECT v.id_caja,v.id_venta,v.id_usuario,'venta','entrada',TRUE,pv.monto,
       'Venta en efectivo',v.fecha_venta
FROM ventas v
INNER JOIN pagos_venta pv ON pv.id_venta=v.id_venta
INNER JOIN metodos_pago mp ON mp.id_metodo_pago=pv.id_metodo_pago
WHERE v.estado='completada' AND mp.es_efectivo=TRUE
  AND @cash_control='true' AND @preflight_ok=1;

UPDATE cajas c
LEFT JOIN (
  SELECT id_caja,SUM(CASE WHEN naturaleza='entrada' THEN monto ELSE -monto END) neto
  FROM movimientos_caja WHERE afecta_efectivo=TRUE GROUP BY id_caja
) m ON m.id_caja=c.id_caja
SET c.monto_esperado=c.monto_apertura+COALESCE(m.neto,0),
    c.monto_cierre=c.monto_apertura+COALESCE(m.neto,0),
    c.monto_contado=c.monto_apertura+COALESCE(m.neto,0),
    c.diferencia=0.00
WHERE @preflight_ok=1;

-- Una sola diferencia historica demostrativa de C$ -5.00.
UPDATE cajas c
INNER JOIN (SELECT MIN(id_caja) id_caja FROM cajas WHERE id_usuario=@sofia_id) x
  ON x.id_caja=c.id_caja
SET c.monto_contado=c.monto_esperado-5.00,
    c.monto_cierre=c.monto_esperado-5.00,
    c.diferencia=-5.00,
    c.observacion='Caja demo con diferencia historica controlada de C$ -5.00.'
WHERE @preflight_ok=1;

-- ---------------------------------------------------------------------------
-- 7. Bitacora minima: resumen de carga y anulacion critica
-- ---------------------------------------------------------------------------

INSERT INTO bitacora
  (id_usuario,modulo,accion,entidad,id_entidad,datos_anteriores,
   datos_nuevos,direccion_ip,resultado,fecha_evento)
SELECT @admin_id,'ventas','cargar_actividad_demo',NULL,NULL,NULL,
       JSON_OBJECT('ventas',30,'completadas',29,'anuladas',1),
       '127.0.0.1','exitoso',NOW()
WHERE @preflight_ok=1;

INSERT INTO bitacora
  (id_usuario,modulo,accion,entidad,id_entidad,datos_anteriores,
   datos_nuevos,direccion_ip,resultado,fecha_evento)
SELECT @admin_id,'ventas','anular','ventas',v.id_venta,
       JSON_OBJECT('estado','completada'),
       JSON_OBJECT('estado','anulada','motivo',v.motivo_anulacion),
       '127.0.0.1','exitoso',v.anulada_en
FROM ventas v WHERE v.estado='anulada' AND @preflight_ok=1;

-- ---------------------------------------------------------------------------
-- 8. Validaciones finales y decision atomica
-- ---------------------------------------------------------------------------

SELECT (
  @preflight_ok=1
  AND (SELECT COUNT(*) FROM ventas)=30
  AND (SELECT COUNT(*) FROM ventas WHERE estado='completada')=29
  AND (SELECT COUNT(*) FROM ventas WHERE estado='anulada')=1
  AND (SELECT COUNT(*) FROM ventas WHERE id_usuario=@carlos_id)=16
  AND (SELECT COUNT(*) FROM ventas WHERE id_usuario=@sofia_id)=14
  AND (SELECT COUNT(*) FROM ventas WHERE id_usuario=@daniel_id)=0
  AND (SELECT COUNT(*) FROM ventas
       WHERE estado='completada' AND DATE(fecha_venta)=CURRENT_DATE)=4
  AND (SELECT COUNT(*) FROM ventas WHERE estado='preparacion')=0
  AND NOT EXISTS (SELECT 1 FROM ventas v WHERE NOT EXISTS
                  (SELECT 1 FROM detalle_ventas d WHERE d.id_venta=v.id_venta))
  AND NOT EXISTS (SELECT 1 FROM ventas v WHERE estado='completada' AND
                  (SELECT COALESCE(SUM(monto),0) FROM pagos_venta p
                   WHERE p.id_venta=v.id_venta)<>v.total)
  AND (SELECT COUNT(*) FROM ventas v INNER JOIN pagos_venta p ON p.id_venta=v.id_venta
       WHERE v.estado='completada' AND p.id_metodo_pago=@efectivo_id)=16
  AND (SELECT COUNT(*) FROM ventas v INNER JOIN pagos_venta p ON p.id_venta=v.id_venta
       WHERE v.estado='completada' AND p.id_metodo_pago=@tarjeta_id)=10
  AND (SELECT COUNT(*) FROM ventas v INNER JOIN pagos_venta p ON p.id_venta=v.id_venta
       WHERE v.estado='completada' AND p.id_metodo_pago=@transferencia_id)=3
  AND (SELECT COUNT(*) FROM ventas WHERE descuento>0)=IF(@discount_max>0,3,0)
  AND NOT EXISTS (SELECT 1 FROM detalle_ventas
                  WHERE descuento*100 > subtotal*@discount_max)
  AND NOT EXISTS (SELECT 1 FROM cajas WHERE estado<>'cerrada' OR fecha_cierre IS NULL)
  AND (SELECT COUNT(*) FROM cajas WHERE diferencia=-5.00)=1
  AND NOT EXISTS (
    SELECT 1 FROM cajas a INNER JOIN cajas b
      ON a.id_usuario=b.id_usuario AND a.id_caja<b.id_caja
     AND a.fecha_apertura<b.fecha_cierre AND b.fecha_apertura<a.fecha_cierre
  )
  AND IF(@cash_control='true',
    NOT EXISTS (SELECT 1 FROM ventas WHERE id_caja IS NULL),
    NOT EXISTS (SELECT 1 FROM ventas WHERE id_caja IS NOT NULL))
  AND NOT EXISTS (SELECT 1 FROM ventas v INNER JOIN cajas c ON c.id_caja=v.id_caja
                  WHERE v.id_usuario<>c.id_usuario OR DATE(v.fecha_venta)<>DATE(c.fecha_apertura))
  AND NOT EXISTS (SELECT 1 FROM movimientos_caja mc
                  INNER JOIN metodos_pago mp ON mp.nombre IN ('Tarjeta','Transferencia')
                  INNER JOIN pagos_venta pv ON pv.id_metodo_pago=mp.id_metodo_pago
                                           AND pv.id_venta=mc.id_venta)
  AND IF(@cash_control='true',
    (SELECT COUNT(*) FROM movimientos_caja)=16,
    (SELECT COUNT(*) FROM movimientos_caja)=0)
  AND NOT EXISTS (
    SELECT 1 FROM cajas c LEFT JOIN (
      SELECT id_caja,SUM(CASE WHEN afecta_efectivo AND naturaleza='entrada' THEN monto
                              WHEN afecta_efectivo AND naturaleza='salida' THEN -monto
                              ELSE 0 END) neto
      FROM movimientos_caja GROUP BY id_caja
    ) m ON m.id_caja=c.id_caja
    WHERE c.monto_esperado<>c.monto_apertura+COALESCE(m.neto,0)
       OR c.diferencia<>c.monto_contado-c.monto_esperado
  )
  AND NOT EXISTS (SELECT 1 FROM productos WHERE existencia<0)
  AND (SELECT existencia FROM productos WHERE codigo='RON-FDC-18')=1.000
  AND (SELECT existencia FROM productos WHERE codigo='TEQ-DJB-075')=1.000
  AND (SELECT existencia FROM productos WHERE codigo='LIC-JAG-070')=0.000
  AND NOT EXISTS (
    SELECT 1 FROM productos p LEFT JOIN (
      SELECT id_producto,SUM(CASE WHEN naturaleza='entrada' THEN cantidad ELSE -cantidad END) saldo
      FROM movimientos_inventario GROUP BY id_producto
    ) m ON m.id_producto=p.id_producto
    WHERE p.existencia<>COALESCE(m.saldo,0)
  )
  AND NOT EXISTS (
    SELECT 1 FROM ventas v INNER JOIN detalle_ventas dv ON dv.id_venta=v.id_venta
    WHERE v.estado='anulada' AND (
      (SELECT COUNT(*) FROM movimientos_inventario mi
       WHERE mi.tipo_referencia='venta' AND mi.id_referencia=v.id_venta
         AND mi.id_producto=dv.id_producto AND mi.tipo_movimiento='venta')<>1
      OR
      (SELECT COUNT(*) FROM movimientos_inventario mi
       WHERE mi.tipo_referencia='venta' AND mi.id_referencia=v.id_venta
         AND mi.id_producto=dv.id_producto AND mi.tipo_movimiento='anulacion_venta')<>1
    )
  )
  AND (SELECT COUNT(DISTINCT p.id_categoria) FROM detalle_ventas dv
       INNER JOIN productos p ON p.id_producto=dv.id_producto)>=7
  AND EXISTS (SELECT 1 FROM ventas WHERE estado='completada'
              AND fecha_venta>=CURRENT_DATE-INTERVAL 6 DAY)
  AND EXISTS (SELECT 1 FROM ventas WHERE estado='completada'
              AND fecha_venta>=CURRENT_DATE-INTERVAL 29 DAY)
) INTO @all_valid;

SELECT 'ventas totales' validacion,(SELECT COUNT(*)=30 FROM ventas) correcto
UNION ALL SELECT '29 completadas y 1 anulada',(SELECT SUM(estado='completada')=29 AND SUM(estado='anulada')=1 FROM ventas)
UNION ALL SELECT 'Carlos 16 / Sofia 14',(SELECT SUM(id_usuario=@carlos_id)=16 AND SUM(id_usuario=@sofia_id)=14 FROM ventas)
UNION ALL SELECT '4 completadas hoy',(SELECT COUNT(*)=4 FROM ventas WHERE estado='completada' AND DATE(fecha_venta)=CURRENT_DATE)
UNION ALL SELECT 'pagos conciliados',NOT EXISTS(SELECT 1 FROM ventas v WHERE estado='completada' AND (SELECT COALESCE(SUM(monto),0) FROM pagos_venta p WHERE p.id_venta=v.id_venta)<>v.total)
UNION ALL SELECT 'cajas cerradas y conciliadas',NOT EXISTS(SELECT 1 FROM cajas WHERE estado<>'cerrada' OR monto_esperado IS NULL OR diferencia<>monto_contado-monto_esperado)
UNION ALL SELECT 'inventario no negativo y conciliado',NOT EXISTS(SELECT 1 FROM productos p LEFT JOIN (SELECT id_producto,SUM(CASE WHEN naturaleza='entrada' THEN cantidad ELSE -cantidad END) saldo FROM movimientos_inventario GROUP BY id_producto) m ON m.id_producto=p.id_producto WHERE p.existencia<0 OR p.existencia<>COALESCE(m.saldo,0))
UNION ALL SELECT 'validacion global',@all_valid;

SET @demo_sales_decision=IF(@all_valid=1,'COMMIT','ROLLBACK');
PREPARE demo_sales_transaction_statement FROM @demo_sales_decision;
EXECUTE demo_sales_transaction_statement;
DEALLOCATE PREPARE demo_sales_transaction_statement;

SELECT @demo_sales_decision decision_final,
       CASE WHEN @all_valid=1 THEN 'Actividad comercial demo confirmada'
            ELSE 'Actividad demo descartada; no se conservaron cambios' END resultado;
