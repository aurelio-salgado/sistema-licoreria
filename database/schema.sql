-- Base de datos
CREATE DATABASE IF NOT EXISTS sistema_licoreria
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE sistema_licoreria;

-- Usuarios
CREATE TABLE usuarios (
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
CREATE TABLE roles (
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
CREATE TABLE permisos (
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
CREATE TABLE usuario_roles (
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
CREATE TABLE rol_permisos (
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
CREATE TABLE categorias (
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
CREATE TABLE marcas (
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
CREATE TABLE unidades_medida (
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
CREATE TABLE productos (
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
