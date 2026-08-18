export const navigationItems = [
  { label: 'Dashboard', path: '/', permission: 'dashboard.ver', icon: 'DB', available: true },
  {
    label: 'Productos', permission: 'productos.ver', icon: 'PR',
    children: [
      { label: 'Productos', path: '/products' },
      { label: 'Categorías', path: '/categories' },
      { label: 'Marcas', path: '/brands' },
      { label: 'Unidades', path: '/units' },
    ],
  },
  { label: 'Compras', path: '/purchases', permission: 'compras.ver', icon: 'CO', available: true },
  { label: 'Ventas', path: '/sales', permission: 'ventas.ver', icon: 'VE', available: true },
  { label: 'Caja', path: '/cash', permission: 'caja.movimientos', icon: 'CJ', available: true },
  { label: 'Inventario', path: '/inventory', permission: 'inventario.ver', icon: 'IN', available: true },
  { label: 'Clientes', path: '/clients', permission: 'clientes.ver', icon: 'CL', available: true },
  { label: 'Proveedores', path: '/suppliers', permission: 'proveedores.ver', icon: 'PV', available: true },
  { label: 'Usuarios', permission: 'usuarios.ver', icon: 'US' },
  { label: 'Bitácora', permission: 'bitacora.ver', icon: 'BI' },
  { label: 'Configuración', permission: 'configuracion.ver', icon: 'CF' },
]
