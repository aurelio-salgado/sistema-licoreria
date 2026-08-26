-- Roles iniciales
INSERT IGNORE INTO roles (nombre, descripcion, es_sistema, estado)
VALUES
    ('Administrador', 'Acceso administrativo según permisos asignados.', TRUE, 'activo'),
    ('Vendedor', 'Operación comercial y de caja según permisos asignados.', TRUE, 'activo'),
    ('Consulta', 'Consulta de información autorizada sin operaciones de escritura.', TRUE, 'activo');

-- Permisos iniciales
INSERT IGNORE INTO permisos (codigo, nombre, modulo, descripcion)
VALUES
    ('usuarios.ver', 'Ver usuarios', 'usuarios', 'Consultar usuarios autorizados.'),
    ('usuarios.crear', 'Crear usuarios', 'usuarios', 'Registrar usuarios.'),
    ('usuarios.editar', 'Editar usuarios', 'usuarios', 'Modificar usuarios.'),
    ('usuarios.desactivar', 'Desactivar usuarios', 'usuarios', 'Desactivar usuarios sin eliminar su historial.'),
    ('roles.ver', 'Ver roles', 'roles', 'Consultar roles y permisos.'),
    ('roles.administrar', 'Administrar roles', 'roles', 'Gestionar permisos asignados a roles.'),
    ('productos.ver', 'Ver productos', 'productos', 'Consultar productos.'),
    ('productos.crear', 'Crear productos', 'productos', 'Registrar productos.'),
    ('productos.editar', 'Editar productos', 'productos', 'Modificar productos.'),
    ('productos.desactivar', 'Desactivar productos', 'productos', 'Desactivar productos sin eliminar su historial.'),
    ('clientes.ver', 'Ver clientes', 'clientes', 'Consultar clientes.'),
    ('clientes.crear', 'Crear clientes', 'clientes', 'Registrar clientes.'),
    ('clientes.editar', 'Editar clientes', 'clientes', 'Modificar clientes.'),
    ('proveedores.ver', 'Ver proveedores', 'proveedores', 'Consultar proveedores.'),
    ('proveedores.crear', 'Crear proveedores', 'proveedores', 'Registrar proveedores.'),
    ('proveedores.editar', 'Editar proveedores', 'proveedores', 'Modificar proveedores.'),
    ('compras.ver', 'Ver compras', 'compras', 'Consultar compras.'),
    ('compras.crear', 'Crear compras', 'compras', 'Registrar compras en borrador.'),
    ('compras.confirmar', 'Confirmar compras', 'compras', 'Confirmar compras de forma transaccional.'),
    ('compras.anular', 'Anular compras', 'compras', 'Anular compras autorizadas.'),
    ('inventario.ver', 'Ver inventario', 'inventario', 'Consultar existencias y movimientos.'),
    ('inventario.ajustar', 'Ajustar inventario', 'inventario', 'Registrar ajustes autorizados de inventario.'),
    ('ventas.ver', 'Ver ventas', 'ventas', 'Consultar ventas.'),
    ('ventas.supervisar', 'Supervisar ventas', 'ventas', 'Consultar ventas de todos los vendedores.'),
    ('ventas.crear', 'Crear ventas', 'ventas', 'Registrar y confirmar ventas autorizadas.'),
    ('ventas.anular', 'Anular ventas', 'ventas', 'Anular ventas autorizadas.'),
    ('caja.abrir', 'Abrir caja', 'caja', 'Abrir una sesión de caja.'),
    ('caja.cerrar', 'Cerrar caja', 'caja', 'Cerrar una sesión de caja.'),
    ('caja.movimientos', 'Gestionar movimientos de caja', 'caja', 'Registrar y consultar movimientos autorizados de caja.'),
    ('caja.supervisar', 'Supervisar cierres de caja', 'caja', 'Consultar cierres históricos de todos los usuarios.'),
    ('reportes.ver', 'Ver reportes', 'reportes', 'Consultar reportes autorizados.'),
    ('reportes.exportar', 'Exportar reportes', 'reportes', 'Exportar reportes autorizados.'),
    ('dashboard.ver', 'Ver dashboard', 'dashboard', 'Consultar indicadores autorizados.'),
    ('dashboard.graficos', 'Ver gráficos del dashboard', 'dashboard', 'Consultar los gráficos autorizados del dashboard.'),
    ('bitacora.ver', 'Ver bitácora', 'bitacora', 'Consultar la bitácora.'),
    ('respaldos.crear', 'Crear respaldos', 'respaldos', 'Crear respaldos autorizados.'),
    ('respaldos.restaurar', 'Restaurar respaldos', 'respaldos', 'Ejecutar restauraciones autorizadas.'),
    ('respaldos.ver', 'Ver respaldos', 'respaldos', 'Consultar metadatos de respaldos y restauraciones.'),
    ('configuracion.ver', 'Ver configuración', 'configuracion', 'Consultar la configuración general.'),
    ('configuracion.editar', 'Editar configuración', 'configuracion', 'Modificar parámetros autorizados de configuración.');

-- El rol Administrador recibe todos los permisos disponibles.
INSERT IGNORE INTO rol_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM roles AS r
CROSS JOIN permisos AS p
WHERE r.nombre = 'Administrador';

-- Permisos operativos del rol Vendedor.
INSERT IGNORE INTO rol_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM roles AS r
INNER JOIN permisos AS p
    ON p.codigo IN (
        'productos.ver',
        'clientes.ver',
        'clientes.crear',
        'clientes.editar',
        'ventas.ver',
        'ventas.crear',
        'caja.abrir',
        'caja.cerrar',
        'caja.movimientos',
        'dashboard.ver',
        'inventario.ver'
    )
WHERE r.nombre = 'Vendedor';

-- Permisos de solo consulta.
INSERT IGNORE INTO rol_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM roles AS r
INNER JOIN permisos AS p
    ON p.codigo IN (
        'productos.ver',
        'clientes.ver',
        'inventario.ver',
        'ventas.ver',
        'reportes.ver',
        'ventas.supervisar',
        'dashboard.ver',
        'dashboard.graficos'
    )
WHERE r.nombre = 'Consulta';

-- Métodos de pago
INSERT IGNORE INTO metodos_pago
    (nombre, requiere_referencia, es_efectivo, estado)
VALUES
    ('Efectivo', FALSE, TRUE, 'activo'),
    ('Tarjeta', TRUE, FALSE, 'activo'),
    ('Transferencia', TRUE, FALSE, 'activo');

-- Unidades de medida
INSERT IGNORE INTO unidades_medida
    (nombre, abreviatura, permite_decimales, estado)
VALUES
    ('Unidad', 'UND', FALSE, 'activo'),
    ('Caja', 'CAJ', FALSE, 'activo'),
    ('Paquete', 'PAQ', FALSE, 'activo'),
    ('Litro', 'L', TRUE, 'activo'),
    ('Mililitro', 'ML', TRUE, 'activo');

-- Cliente predeterminado
INSERT INTO clientes (nombre, es_consumidor_final, estado)
SELECT 'Consumidor final', TRUE, 'activo'
WHERE NOT EXISTS (
    SELECT 1
    FROM clientes
    WHERE es_consumidor_final = TRUE
       OR nombre = 'Consumidor final'
);

-- Configuración mínima; los valores fiscales permanecen en cero hasta su aprobación.
INSERT IGNORE INTO configuracion
    (clave, valor, tipo_dato, descripcion, es_critica, id_usuario_actualizacion)
VALUES
    ('nombre_negocio', 'Licorería', 'texto', 'Nombre mostrado del negocio.', FALSE, NULL),
    ('impuesto_activo', 'false', 'logico', 'Indica si se aplica impuesto a operaciones nuevas.', TRUE, NULL),
    ('tasa_impuesto', '0', 'decimal', 'Tasa configurable de impuesto.', TRUE, NULL),
    ('descuento_maximo', '0', 'decimal', 'Descuento máximo configurable.', TRUE, NULL),
    ('control_caja_activo', 'false', 'logico', 'Activa el requisito de caja abierta para vender.', TRUE, NULL),
    ('serie_comprobante', 'SIN_CONFIGURAR', 'texto', 'Serie configurable para comprobantes internos.', TRUE, NULL),
    ('siguiente_numero_comprobante', '1', 'entero', 'Siguiente número configurable de comprobante.', TRUE, NULL);

-- La clave interna jwt_session_epoch no usa un UUID fijo compartido.
-- Inicializarla una sola vez con: npm --prefix backend run init-session-epoch
