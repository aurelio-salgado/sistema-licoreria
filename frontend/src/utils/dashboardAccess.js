export const quickAccessOptions = [
  { permission: 'ventas.crear', path: '/sales', label: 'Nueva venta', detail: 'Preparar una operación', icon: 'VE' },
  { permission: 'caja.movimientos', path: '/cash', label: 'Caja', detail: 'Gestionar el turno', icon: 'CJ' },
  { permission: 'inventario.ver', path: '/inventory', label: 'Inventario', detail: 'Consultar existencias', icon: 'IN' },
  { permission: 'productos.ver', path: '/products', label: 'Productos', detail: 'Explorar el catálogo', icon: 'PR' },
  { permission: 'compras.ver', path: '/purchases', label: 'Compras', detail: 'Consultar recepciones', icon: 'CO' },
]
export function getQuickAccess(hasPermission, operationalStatus) {
  const requiresCash = operationalStatus?.control_caja_activo && !operationalStatus?.caja_abierta
  const operationalPermissions = new Set(['ventas.crear', 'caja.movimientos'])
  const options = quickAccessOptions.filter((item) => hasPermission(item.permission) && !(requiresCash && operationalPermissions.has(item.permission)))
  return options.slice(0, 5)
}
export function shouldLoadDashboardAnalytics(hasPermission) { return Boolean(hasPermission('dashboard.graficos')) }
