-- Base de datos
CREATE DATABASE IF NOT EXISTS sistema_licoreria
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE sistema_licoreria;

-- Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    nombre_usuario VARCHAR(80) NOT NULL,
    correo VARCHAR(150) NULL,
    password_hash VARCHAR(255) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo',
    intentos_fallidos INT UNSIGNED NOT NULL DEFAULT 0,
    bloqueado_hasta DATETIME NULL,
    ultimo_acceso DATETIME NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_usuarios PRIMARY KEY (id_usuario),
    CONSTRAINT uq_usuarios_nombre_usuario UNIQUE (nombre_usuario),
    CONSTRAINT uq_usuarios_correo UNIQUE (correo),
    CONSTRAINT chk_usuarios_estado CHECK (estado IN ('activo', 'inactivo')),
    CONSTRAINT chk_usuarios_intentos_fallidos CHECK (intentos_fallidos >= 0),
    INDEX idx_usuarios_estado (estado),
    INDEX idx_usuarios_bloqueado_hasta (bloqueado_hasta)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Roles
CREATE TABLE IF NOT EXISTS roles (
    id_rol BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255) NULL,
    es_sistema BOOLEAN NOT NULL DEFAULT FALSE,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo',
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_roles PRIMARY KEY (id_rol),
    CONSTRAINT uq_roles_nombre UNIQUE (nombre),
    CONSTRAINT chk_roles_estado CHECK (estado IN ('activo', 'inactivo')),
    INDEX idx_roles_estado (estado)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Permisos
CREATE TABLE IF NOT EXISTS permisos (
    id_permiso BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo VARCHAR(100) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    modulo VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255) NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_permisos PRIMARY KEY (id_permiso),
    CONSTRAINT uq_permisos_codigo UNIQUE (codigo),
    INDEX idx_permisos_modulo (modulo)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Asignaciones de roles a usuarios
CREATE TABLE IF NOT EXISTS usuario_roles (
    id_usuario BIGINT UNSIGNED NOT NULL,
    id_rol BIGINT UNSIGNED NOT NULL,
    asignado_por BIGINT UNSIGNED NULL,
    asignado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_usuario_roles PRIMARY KEY (id_usuario, id_rol),
    CONSTRAINT fk_usuario_roles_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_usuario_roles_rol
        FOREIGN KEY (id_rol) REFERENCES roles (id_rol)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_usuario_roles_asignado_por
        FOREIGN KEY (asignado_por) REFERENCES usuarios (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    INDEX idx_usuario_roles_rol_usuario (id_rol, id_usuario),
    INDEX idx_usuario_roles_asignado_por (asignado_por)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Asignaciones de permisos a roles
CREATE TABLE IF NOT EXISTS rol_permisos (
    id_rol BIGINT UNSIGNED NOT NULL,
    id_permiso BIGINT UNSIGNED NOT NULL,
    concedido_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_rol_permisos PRIMARY KEY (id_rol, id_permiso),
    CONSTRAINT fk_rol_permisos_rol
        FOREIGN KEY (id_rol) REFERENCES roles (id_rol)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_rol_permisos_permiso
        FOREIGN KEY (id_permiso) REFERENCES permisos (id_permiso)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    INDEX idx_rol_permisos_permiso_rol (id_permiso, id_rol)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Categorías
CREATE TABLE IF NOT EXISTS categorias (
    id_categoria BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo',
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_categorias PRIMARY KEY (id_categoria),
    CONSTRAINT uq_categorias_nombre UNIQUE (nombre),
    CONSTRAINT chk_categorias_estado CHECK (estado IN ('activo', 'inactivo')),
    INDEX idx_categorias_estado (estado)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Marcas
CREATE TABLE IF NOT EXISTS marcas (
    id_marca BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo',
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_marcas PRIMARY KEY (id_marca),
    CONSTRAINT uq_marcas_nombre UNIQUE (nombre),
    CONSTRAINT chk_marcas_estado CHECK (estado IN ('activo', 'inactivo')),
    INDEX idx_marcas_estado (estado)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Unidades de medida
CREATE TABLE IF NOT EXISTS unidades_medida (
    id_unidad BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(80) NOT NULL,
    abreviatura VARCHAR(20) NOT NULL,
    permite_decimales BOOLEAN NOT NULL DEFAULT FALSE,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo',
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_unidades_medida PRIMARY KEY (id_unidad),
    CONSTRAINT uq_unidades_medida_nombre UNIQUE (nombre),
    CONSTRAINT uq_unidades_medida_abreviatura UNIQUE (abreviatura),
    CONSTRAINT chk_unidades_medida_permite_decimales
        CHECK (permite_decimales IN (FALSE, TRUE)),
    CONSTRAINT chk_unidades_medida_estado CHECK (estado IN ('activo', 'inactivo')),
    INDEX idx_unidades_medida_estado (estado)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Productos
CREATE TABLE IF NOT EXISTS productos (
    id_producto BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo VARCHAR(60) NOT NULL,
    codigo_barras VARCHAR(80) NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT NULL,
    id_categoria BIGINT UNSIGNED NOT NULL,
    id_marca BIGINT UNSIGNED NOT NULL,
    id_unidad BIGINT UNSIGNED NOT NULL,
    costo_promedio DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    precio_venta DECIMAL(12,2) NOT NULL,
    existencia DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    existencia_minima DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    porcentaje_impuesto DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo',
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_productos PRIMARY KEY (id_producto),
    CONSTRAINT uq_productos_codigo UNIQUE (codigo),
    CONSTRAINT uq_productos_codigo_barras UNIQUE (codigo_barras),
    CONSTRAINT chk_productos_costo_promedio CHECK (costo_promedio >= 0),
    CONSTRAINT chk_productos_precio_venta CHECK (precio_venta > 0),
    CONSTRAINT chk_productos_existencia CHECK (existencia >= 0),
    CONSTRAINT chk_productos_existencia_minima CHECK (existencia_minima >= 0),
    CONSTRAINT chk_productos_porcentaje_impuesto CHECK (porcentaje_impuesto >= 0),
    CONSTRAINT chk_productos_estado CHECK (estado IN ('activo', 'inactivo')),
    CONSTRAINT fk_productos_categoria
        FOREIGN KEY (id_categoria) REFERENCES categorias (id_categoria)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_productos_marca
        FOREIGN KEY (id_marca) REFERENCES marcas (id_marca)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_productos_unidad
        FOREIGN KEY (id_unidad) REFERENCES unidades_medida (id_unidad)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    INDEX idx_productos_nombre (nombre),
    INDEX idx_productos_categoria (id_categoria),
    INDEX idx_productos_marca (id_marca),
    INDEX idx_productos_unidad (id_unidad),
    INDEX idx_productos_estado (estado)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    identificacion VARCHAR(50) NULL,
    telefono VARCHAR(30) NULL,
    correo VARCHAR(150) NULL,
    direccion VARCHAR(255) NULL,
    es_consumidor_final BOOLEAN NOT NULL DEFAULT FALSE,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo',
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_clientes PRIMARY KEY (id_cliente),
    CONSTRAINT uq_clientes_identificacion UNIQUE (identificacion),
    CONSTRAINT chk_clientes_es_consumidor_final
        CHECK (es_consumidor_final IN (FALSE, TRUE)),
    CONSTRAINT chk_clientes_estado CHECK (estado IN ('activo', 'inactivo')),
    INDEX idx_clientes_nombre (nombre),
    INDEX idx_clientes_estado (estado)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id_proveedor BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    identificacion_fiscal VARCHAR(50) NULL,
    contacto VARCHAR(150) NULL,
    telefono VARCHAR(30) NULL,
    correo VARCHAR(150) NULL,
    direccion VARCHAR(255) NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo',
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_proveedores PRIMARY KEY (id_proveedor),
    CONSTRAINT uq_proveedores_identificacion_fiscal UNIQUE (identificacion_fiscal),
    CONSTRAINT chk_proveedores_estado CHECK (estado IN ('activo', 'inactivo')),
    INDEX idx_proveedores_nombre (nombre),
    INDEX idx_proveedores_estado (estado)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Compras
CREATE TABLE IF NOT EXISTS compras (
    id_compra BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    numero_compra VARCHAR(50) NOT NULL,
    numero_documento_proveedor VARCHAR(80) NULL,
    id_proveedor BIGINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED NOT NULL,
    fecha_compra DATETIME NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    descuento DECIMAL(12,2) NOT NULL,
    impuesto DECIMAL(12,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    estado VARCHAR(20) NOT NULL,
    observacion TEXT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_compras PRIMARY KEY (id_compra),
    CONSTRAINT uq_compras_numero_compra UNIQUE (numero_compra),
    CONSTRAINT chk_compras_subtotal CHECK (subtotal >= 0),
    CONSTRAINT chk_compras_descuento CHECK (descuento >= 0),
    CONSTRAINT chk_compras_impuesto CHECK (impuesto >= 0),
    CONSTRAINT chk_compras_total CHECK (total >= 0),
    CONSTRAINT chk_compras_estado CHECK (estado IN ('borrador', 'recibida', 'anulada')),
    CONSTRAINT fk_compras_proveedor
        FOREIGN KEY (id_proveedor) REFERENCES proveedores (id_proveedor)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_compras_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    INDEX idx_compras_numero_documento_proveedor (numero_documento_proveedor),
    INDEX idx_compras_fecha_compra (fecha_compra),
    INDEX idx_compras_estado (estado),
    INDEX idx_compras_proveedor_fecha (id_proveedor, fecha_compra),
    INDEX idx_compras_usuario (id_usuario)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Detalle de compras
CREATE TABLE IF NOT EXISTS detalle_compras (
    id_detalle_compra BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_compra BIGINT UNSIGNED NOT NULL,
    id_producto BIGINT UNSIGNED NOT NULL,
    cantidad DECIMAL(12,3) NOT NULL,
    costo_unitario DECIMAL(12,2) NOT NULL,
    descuento DECIMAL(12,2) NOT NULL,
    impuesto DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_detalle_compras PRIMARY KEY (id_detalle_compra),
    CONSTRAINT chk_detalle_compras_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_detalle_compras_costo_unitario CHECK (costo_unitario >= 0),
    CONSTRAINT chk_detalle_compras_descuento CHECK (descuento >= 0),
    CONSTRAINT chk_detalle_compras_impuesto CHECK (impuesto >= 0),
    CONSTRAINT chk_detalle_compras_subtotal CHECK (subtotal >= 0),
    CONSTRAINT fk_detalle_compras_compra
        FOREIGN KEY (id_compra) REFERENCES compras (id_compra)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_detalle_compras_producto
        FOREIGN KEY (id_producto) REFERENCES productos (id_producto)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    INDEX idx_detalle_compras_compra (id_compra),
    INDEX idx_detalle_compras_producto (id_producto)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Métodos de pago
CREATE TABLE IF NOT EXISTS metodos_pago (
    id_metodo_pago BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(80) NOT NULL,
    requiere_referencia BOOLEAN NOT NULL,
    es_efectivo BOOLEAN NOT NULL,
    estado VARCHAR(20) NOT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_metodos_pago PRIMARY KEY (id_metodo_pago),
    CONSTRAINT uq_metodos_pago_nombre UNIQUE (nombre),
    CONSTRAINT chk_metodos_pago_requiere_referencia
        CHECK (requiere_referencia IN (FALSE, TRUE)),
    CONSTRAINT chk_metodos_pago_es_efectivo CHECK (es_efectivo IN (FALSE, TRUE)),
    CONSTRAINT chk_metodos_pago_estado CHECK (estado IN ('activo', 'inactivo')),
    INDEX idx_metodos_pago_estado (estado)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Cajas
CREATE TABLE IF NOT EXISTS cajas (
    id_caja BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_usuario BIGINT UNSIGNED NOT NULL,
    fecha_apertura DATETIME NOT NULL,
    monto_apertura DECIMAL(12,2) NOT NULL,
    fecha_cierre DATETIME NULL,
    monto_cierre DECIMAL(12,2) NULL,
    monto_esperado DECIMAL(12,2) NULL,
    monto_contado DECIMAL(12,2) NULL,
    diferencia DECIMAL(12,2) NULL,
    estado VARCHAR(20) NOT NULL,
    observacion VARCHAR(500) NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_cajas PRIMARY KEY (id_caja),
    CONSTRAINT chk_cajas_monto_apertura CHECK (monto_apertura >= 0),
    CONSTRAINT chk_cajas_fecha_cierre
        CHECK (fecha_cierre IS NULL OR fecha_cierre >= fecha_apertura),
    CONSTRAINT chk_cajas_monto_cierre CHECK (monto_cierre IS NULL OR monto_cierre >= 0),
    CONSTRAINT chk_cajas_monto_contado CHECK (monto_contado IS NULL OR monto_contado >= 0),
    CONSTRAINT chk_cajas_estado CHECK (estado IN ('abierta', 'cerrada')),
    CONSTRAINT fk_cajas_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    INDEX idx_cajas_usuario_estado (id_usuario, estado),
    INDEX idx_cajas_fecha_apertura (fecha_apertura),
    INDEX idx_cajas_fecha_cierre (fecha_cierre)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Ventas
CREATE TABLE IF NOT EXISTS ventas (
    id_venta BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    numero_venta VARCHAR(50) NOT NULL,
    numero_factura VARCHAR(50) NULL,
    id_cliente BIGINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED NOT NULL,
    id_caja BIGINT UNSIGNED NULL,
    fecha_venta DATETIME NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    descuento DECIMAL(12,2) NOT NULL,
    impuesto DECIMAL(12,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    estado VARCHAR(20) NOT NULL,
    motivo_anulacion VARCHAR(500) NULL,
    anulada_por BIGINT UNSIGNED NULL,
    anulada_en DATETIME NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_ventas PRIMARY KEY (id_venta),
    CONSTRAINT uq_ventas_numero_venta UNIQUE (numero_venta),
    CONSTRAINT uq_ventas_numero_factura UNIQUE (numero_factura),
    CONSTRAINT chk_ventas_subtotal CHECK (subtotal >= 0),
    CONSTRAINT chk_ventas_descuento CHECK (descuento >= 0),
    CONSTRAINT chk_ventas_impuesto CHECK (impuesto >= 0),
    CONSTRAINT chk_ventas_total CHECK (total >= 0),
    CONSTRAINT chk_ventas_estado CHECK (estado IN ('preparacion', 'completada', 'anulada')),
    CONSTRAINT fk_ventas_cliente
        FOREIGN KEY (id_cliente) REFERENCES clientes (id_cliente)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_ventas_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_ventas_caja
        FOREIGN KEY (id_caja) REFERENCES cajas (id_caja)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_ventas_anulada_por
        FOREIGN KEY (anulada_por) REFERENCES usuarios (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    INDEX idx_ventas_fecha_venta (fecha_venta),
    INDEX idx_ventas_estado (estado),
    INDEX idx_ventas_usuario_fecha (id_usuario, fecha_venta),
    INDEX idx_ventas_cliente (id_cliente),
    INDEX idx_ventas_caja (id_caja),
    INDEX idx_ventas_anulada_por (anulada_por)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Detalle de ventas
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id_detalle_venta BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_venta BIGINT UNSIGNED NOT NULL,
    id_producto BIGINT UNSIGNED NOT NULL,
    cantidad DECIMAL(12,3) NOT NULL,
    costo_unitario_historico DECIMAL(12,2) NOT NULL,
    precio_unitario DECIMAL(12,2) NOT NULL,
    descuento DECIMAL(12,2) NOT NULL,
    impuesto DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_detalle_ventas PRIMARY KEY (id_detalle_venta),
    CONSTRAINT chk_detalle_ventas_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_detalle_ventas_costo_historico
        CHECK (costo_unitario_historico >= 0),
    CONSTRAINT chk_detalle_ventas_precio_unitario CHECK (precio_unitario > 0),
    CONSTRAINT chk_detalle_ventas_descuento CHECK (descuento >= 0),
    CONSTRAINT chk_detalle_ventas_impuesto CHECK (impuesto >= 0),
    CONSTRAINT chk_detalle_ventas_subtotal CHECK (subtotal >= 0),
    CONSTRAINT fk_detalle_ventas_venta
        FOREIGN KEY (id_venta) REFERENCES ventas (id_venta)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_detalle_ventas_producto
        FOREIGN KEY (id_producto) REFERENCES productos (id_producto)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    INDEX idx_detalle_ventas_venta (id_venta),
    INDEX idx_detalle_ventas_producto (id_producto)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Pagos de venta
CREATE TABLE IF NOT EXISTS pagos_venta (
    id_pago BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_venta BIGINT UNSIGNED NOT NULL,
    id_metodo_pago BIGINT UNSIGNED NOT NULL,
    monto DECIMAL(12,2) NOT NULL,
    referencia VARCHAR(120) NULL,
    monto_recibido DECIMAL(12,2) NULL,
    cambio DECIMAL(12,2) NOT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_pagos_venta PRIMARY KEY (id_pago),
    CONSTRAINT chk_pagos_venta_monto CHECK (monto > 0),
    CONSTRAINT chk_pagos_venta_monto_recibido
        CHECK (monto_recibido IS NULL OR monto_recibido >= monto),
    CONSTRAINT chk_pagos_venta_cambio CHECK (cambio >= 0),
    CONSTRAINT fk_pagos_venta_venta
        FOREIGN KEY (id_venta) REFERENCES ventas (id_venta)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_pagos_venta_metodo
        FOREIGN KEY (id_metodo_pago) REFERENCES metodos_pago (id_metodo_pago)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    INDEX idx_pagos_venta_venta (id_venta),
    INDEX idx_pagos_venta_metodo (id_metodo_pago)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Movimientos de inventario
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id_movimiento_inventario BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_producto BIGINT UNSIGNED NOT NULL,
    tipo_movimiento VARCHAR(40) NOT NULL,
    naturaleza VARCHAR(10) NOT NULL,
    cantidad DECIMAL(12,3) NOT NULL,
    existencia_anterior DECIMAL(12,3) NOT NULL,
    existencia_posterior DECIMAL(12,3) NOT NULL,
    tipo_referencia VARCHAR(40) NOT NULL,
    id_referencia BIGINT UNSIGNED NOT NULL,
    motivo VARCHAR(500) NULL,
    id_usuario BIGINT UNSIGNED NOT NULL,
    fecha_movimiento DATETIME NOT NULL,
    CONSTRAINT pk_movimientos_inventario PRIMARY KEY (id_movimiento_inventario),
    CONSTRAINT chk_movimientos_inventario_naturaleza
        CHECK (naturaleza IN ('entrada', 'salida')),
    CONSTRAINT chk_movimientos_inventario_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_movimientos_inventario_existencia_anterior
        CHECK (existencia_anterior >= 0),
    CONSTRAINT chk_movimientos_inventario_existencia_posterior
        CHECK (existencia_posterior >= 0),
    CONSTRAINT chk_movimientos_inventario_id_referencia CHECK (id_referencia > 0),
    CONSTRAINT fk_movimientos_inventario_producto
        FOREIGN KEY (id_producto) REFERENCES productos (id_producto)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_movimientos_inventario_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    INDEX idx_movimientos_inventario_producto_fecha (id_producto, fecha_movimiento),
    INDEX idx_movimientos_inventario_tipo_referencia (tipo_referencia, id_referencia),
    INDEX idx_movimientos_inventario_tipo_movimiento (tipo_movimiento),
    INDEX idx_movimientos_inventario_usuario (id_usuario)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Movimientos de caja
CREATE TABLE IF NOT EXISTS movimientos_caja (
    id_movimiento_caja BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_caja BIGINT UNSIGNED NOT NULL,
    id_venta BIGINT UNSIGNED NULL,
    id_usuario BIGINT UNSIGNED NOT NULL,
    tipo_movimiento VARCHAR(30) NOT NULL,
    naturaleza VARCHAR(10) NOT NULL,
    afecta_efectivo BOOLEAN NOT NULL,
    monto DECIMAL(12,2) NOT NULL,
    concepto VARCHAR(255) NOT NULL,
    fecha_movimiento DATETIME NOT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_movimientos_caja PRIMARY KEY (id_movimiento_caja),
    CONSTRAINT chk_movimientos_caja_tipo
        CHECK (tipo_movimiento IN ('venta', 'ingreso', 'egreso', 'devolucion', 'anulacion')),
    CONSTRAINT chk_movimientos_caja_naturaleza
        CHECK (naturaleza IN ('entrada', 'salida')),
    CONSTRAINT chk_movimientos_caja_afecta_efectivo
        CHECK (afecta_efectivo IN (FALSE, TRUE)),
    CONSTRAINT chk_movimientos_caja_monto CHECK (monto > 0),
    CONSTRAINT fk_movimientos_caja_caja
        FOREIGN KEY (id_caja) REFERENCES cajas (id_caja)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_movimientos_caja_venta
        FOREIGN KEY (id_venta) REFERENCES ventas (id_venta)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_movimientos_caja_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    INDEX idx_movimientos_caja_caja_fecha (id_caja, fecha_movimiento),
    INDEX idx_movimientos_caja_venta (id_venta),
    INDEX idx_movimientos_caja_usuario (id_usuario),
    INDEX idx_movimientos_caja_tipo (tipo_movimiento),
    INDEX idx_movimientos_caja_afecta_efectivo (afecta_efectivo)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Bitácora
CREATE TABLE IF NOT EXISTS bitacora (
    id_bitacora BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_usuario BIGINT UNSIGNED NULL,
    modulo VARCHAR(80) NOT NULL,
    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(80) NULL,
    id_entidad BIGINT UNSIGNED NULL,
    datos_anteriores LONGTEXT NULL,
    datos_nuevos LONGTEXT NULL,
    direccion_ip VARCHAR(45) NULL,
    resultado VARCHAR(30) NOT NULL,
    fecha_evento DATETIME NOT NULL,
    CONSTRAINT pk_bitacora PRIMARY KEY (id_bitacora),
    CONSTRAINT fk_bitacora_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    INDEX idx_bitacora_fecha_evento (fecha_evento),
    INDEX idx_bitacora_usuario_fecha (id_usuario, fecha_evento),
    INDEX idx_bitacora_modulo_accion (modulo, accion),
    INDEX idx_bitacora_entidad_id (entidad, id_entidad),
    INDEX idx_bitacora_resultado (resultado)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Configuración
CREATE TABLE IF NOT EXISTS configuracion (
    id_configuracion BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    clave VARCHAR(120) NOT NULL,
    valor TEXT NOT NULL,
    tipo_dato VARCHAR(30) NOT NULL,
    descripcion VARCHAR(255) NULL,
    es_critica BOOLEAN NOT NULL,
    id_usuario_actualizacion BIGINT UNSIGNED NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_configuracion PRIMARY KEY (id_configuracion),
    CONSTRAINT uq_configuracion_clave UNIQUE (clave),
    CONSTRAINT chk_configuracion_es_critica CHECK (es_critica IN (FALSE, TRUE)),
    CONSTRAINT fk_configuracion_usuario_actualizacion
        FOREIGN KEY (id_usuario_actualizacion) REFERENCES usuarios (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    INDEX idx_configuracion_es_critica (es_critica),
    INDEX idx_configuracion_usuario_actualizacion (id_usuario_actualizacion)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Respaldos
CREATE TABLE IF NOT EXISTS respaldos (
    id_respaldo BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_segura VARCHAR(500) NOT NULL,
    tamano_bytes BIGINT UNSIGNED NULL,
    tipo VARCHAR(30) NOT NULL,
    operacion VARCHAR(20) NOT NULL,
    estado VARCHAR(30) NOT NULL,
    id_usuario BIGINT UNSIGNED NOT NULL,
    mensaje_resultado TEXT NULL,
    fecha_operacion DATETIME NOT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_respaldos PRIMARY KEY (id_respaldo),
    CONSTRAINT chk_respaldos_tamano_bytes
        CHECK (tamano_bytes IS NULL OR tamano_bytes >= 0),
    CONSTRAINT chk_respaldos_operacion
        CHECK (operacion IN ('respaldo', 'restauracion')),
    CONSTRAINT chk_respaldos_estado
        CHECK (estado IN ('en_proceso', 'exitoso', 'fallido')),
    CONSTRAINT fk_respaldos_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    INDEX idx_respaldos_nombre_archivo (nombre_archivo),
    INDEX idx_respaldos_tipo (tipo),
    INDEX idx_respaldos_operacion (operacion),
    INDEX idx_respaldos_estado (estado),
    INDEX idx_respaldos_fecha_operacion (fecha_operacion),
    INDEX idx_respaldos_usuario_fecha (id_usuario, fecha_operacion)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
