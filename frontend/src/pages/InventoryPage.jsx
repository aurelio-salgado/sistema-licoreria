import { useCallback, useEffect, useMemo, useState } from 'react'
import { inventoryApi } from '../api/inventory'
import { useAuth } from '../auth/useAuth'
import { EmptyState, ErrorDialog, Modal, PageHeader, Pagination } from '../components/CatalogUi'
import { ErrorState, LoadingState } from '../components/FeedbackStates'
import { AdjustmentForm } from '../components/inventory/AdjustmentForm'
import { InventoryTable, LowStockTable, MovementsTable } from '../components/inventory/InventoryTables'
import { createActionError } from '../utils/actionErrors'

const MOVEMENT_LIMIT = 20
const initialMovementFilters = { page: 1, limit: MOVEMENT_LIMIT, product: '', type: '', nature: '', referenceType: '', dateFrom: '', dateTo: '' }
const movementTypes = [
  ['compra', 'Compra'],
  ['venta', 'Venta'],
  ['anulacion_compra', 'Anulación de compra'],
  ['anulacion_venta', 'Anulación de venta'],
  ['ajuste', 'Ajuste'],
]
const referenceTypes = [['compra', 'Compra'], ['venta', 'Venta'], ['ajuste', 'Ajuste']]

export function InventoryPage() {
  const { hasPermission } = useAuth()
  const [activeTab, setActiveTab] = useState('stock')
  const [status, setStatus] = useState('activo')
  const [inventory, setInventory] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [movements, setMovements] = useState([])
  const [pagination, setPagination] = useState(null)
  const [allProducts, setAllProducts] = useState([])
  const [movementFilters, setMovementFilters] = useState(initialMovementFilters)
  const [loadingInventory, setLoadingInventory] = useState(true)
  const [loadingLowStock, setLoadingLowStock] = useState(true)
  const [loadingMovements, setLoadingMovements] = useState(true)
  const [inventoryError, setInventoryError] = useState('')
  const [lowStockError, setLowStockError] = useState('')
  const [movementsError, setMovementsError] = useState('')
  const [productsError, setProductsError] = useState('')
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [mutationError, setMutationError] = useState(null)
  const canAdjust = hasPermission('inventario.ajustar')

  const loadInventory = useCallback(async () => {
    setLoadingInventory(true); setInventoryError('')
    try { const response = await inventoryApi.list(status); setInventory(response?.data?.inventory ?? []) }
    catch (error) { setInventoryError(error.message || 'No fue posible consultar las existencias.') }
    finally { setLoadingInventory(false) }
  }, [status])
  const loadLowStock = useCallback(async () => {
    setLoadingLowStock(true); setLowStockError('')
    try { const response = await inventoryApi.lowStock(); setLowStock(response?.data?.products ?? []) }
    catch (error) { setLowStockError(error.message || 'No fue posible consultar el stock bajo.') }
    finally { setLoadingLowStock(false) }
  }, [])
  const loadMovements = useCallback(async () => {
    setLoadingMovements(true); setMovementsError('')
    try { const response = await inventoryApi.movements(movementFilters); setMovements(response?.data?.movements ?? []); setPagination(response?.data?.pagination ?? null) }
    catch (error) { setMovementsError(error.message || 'No fue posible consultar los movimientos.') }
    finally { setLoadingMovements(false) }
  }, [movementFilters])
  const loadProductMetadata = useCallback(async () => {
    setProductsError('')
    try { const response = await inventoryApi.list('todos'); setAllProducts(response?.data?.inventory ?? []) }
    catch (error) { setProductsError(error.message || 'No fue posible cargar los productos para filtros y ajustes.') }
  }, [])

  useEffect(() => { loadInventory() }, [loadInventory])
  useEffect(() => { loadLowStock() }, [loadLowStock])
  useEffect(() => { loadMovements() }, [loadMovements])
  useEffect(() => { loadProductMetadata() }, [loadProductMetadata])
  useEffect(() => { if (!feedback) return undefined; const timer = window.setTimeout(() => setFeedback(''), 4500); return () => window.clearTimeout(timer) }, [feedback])

  const activeProducts = useMemo(() => allProducts.filter((item) => item.estado === 'activo'), [allProducts])
  const productsById = useMemo(() => new Map(allProducts.map((item) => [String(item.id_producto), item])), [allProducts])
  const setMovementFilter = (field, value) => setMovementFilters((current) => ({ ...current, page: 1, [field]: value }))
  const refreshAll = async () => Promise.all([loadInventory(), loadLowStock(), loadMovements(), loadProductMetadata()])
  const createAdjustment = async (values) => {
    setSaving(true); setMutationError(null)
    try {
      await inventoryApi.createAdjustment(values)
      setAdjustmentOpen(false)
      setFeedback('Ajuste de inventario registrado correctamente.')
      await refreshAll()
    } catch (error) { setMutationError(createActionError(error, 'No se pudo registrar el ajuste')) }
    finally { setSaving(false) }
  }
  const tabs = [
    { id: 'stock', label: 'Existencias' },
    { id: 'low', label: 'Stock bajo', count: lowStock.length },
    { id: 'movements', label: 'Movimientos' },
  ]
  const handleTabKeyDown = (event, index) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    setActiveTab(tabs[nextIndex].id)
    document.getElementById(`inventory-tab-${tabs[nextIndex].id}`)?.focus()
  }

  return (
    <div className="page-stack inventory-page">
      <PageHeader eyebrow="INVENTARIO" title="Inventario" description="Consulta existencias, alertas y la trazabilidad de cada movimiento." action={canAdjust ? <button className="button button--primary" type="button" disabled={Boolean(productsError) || !activeProducts.length} onClick={() => setAdjustmentOpen(true)}>Nuevo ajuste</button> : null} />
      {feedback && <div className="inline-alert inline-alert--success" role="status">{feedback}</div>}
      {productsError && <div className="inline-alert inline-alert--error" role="alert">{productsError} <button className="link-button" type="button" onClick={loadProductMetadata}>Reintentar</button></div>}

      <div className="inventory-tabs" role="tablist" aria-label="Secciones de inventario">
        {tabs.map((tab, index) => <button key={tab.id} id={`inventory-tab-${tab.id}`} className={activeTab === tab.id ? 'inventory-tab inventory-tab--active' : 'inventory-tab'} type="button" role="tab" tabIndex={activeTab === tab.id ? 0 : -1} aria-selected={activeTab === tab.id} aria-controls={`inventory-panel-${tab.id}`} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => handleTabKeyDown(event, index)}>{tab.label}{tab.count > 0 && <span>{tab.count}</span>}</button>)}
      </div>

      {activeTab === 'stock' && <section id="inventory-panel-stock" className="catalog-panel inventory-panel" role="tabpanel" aria-labelledby="inventory-tab-stock">
        <div className="inventory-panel-heading"><div><h2>Existencias actuales</h2><p>Valores registrados actualmente por producto y unidad de medida.</p></div><label className="filter-field"><span>Estado del producto</span><select className="form-control" value={status} onChange={(event) => setStatus(event.target.value)}><option value="activo">Activos</option><option value="inactivo">Inactivos</option><option value="todos">Todos</option></select></label></div>
        {loadingInventory ? <LoadingState message="Cargando existencias…" /> : inventoryError ? <ErrorState title="No se pudieron cargar las existencias" message={inventoryError} actionLabel="Reintentar" onAction={loadInventory} /> : !inventory.length ? <EmptyState message="No hay productos para el estado seleccionado." /> : <InventoryTable items={inventory} />}
      </section>}

      {activeTab === 'low' && <section id="inventory-panel-low" className="catalog-panel inventory-panel" role="tabpanel" aria-labelledby="inventory-tab-low">
        <div className="inventory-panel-heading"><div><h2>Productos con stock bajo</h2><p>Productos activos cuya existencia alcanzó o bajó del mínimo configurado.</p></div></div>
        {loadingLowStock ? <LoadingState message="Consultando stock bajo…" /> : lowStockError ? <ErrorState title="No se pudo cargar el stock bajo" message={lowStockError} actionLabel="Reintentar" onAction={loadLowStock} /> : !lowStock.length ? <EmptyState message="No hay productos con stock bajo." /> : <LowStockTable items={lowStock} />}
      </section>}

      {activeTab === 'movements' && <section id="inventory-panel-movements" className="catalog-panel inventory-panel" role="tabpanel" aria-labelledby="inventory-tab-movements">
        <div className="inventory-panel-heading"><div><h2>Historial de movimientos</h2><p>Entradas y salidas registradas por compras, ventas, anulaciones y ajustes.</p></div></div>
        <div className="inventory-filters">
          <label className="filter-field"><span>Producto</span><select className="form-control" value={movementFilters.product} onChange={(event) => setMovementFilter('product', event.target.value)}><option value="">Todos</option>{allProducts.map((item) => <option key={item.id_producto} value={item.id_producto}>{item.codigo} · {item.nombre}</option>)}</select></label>
          <label className="filter-field"><span>Tipo</span><select className="form-control" value={movementFilters.type} onChange={(event) => setMovementFilter('type', event.target.value)}><option value="">Todos</option>{movementTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="filter-field"><span>Naturaleza</span><select className="form-control" value={movementFilters.nature} onChange={(event) => setMovementFilter('nature', event.target.value)}><option value="">Todas</option><option value="entrada">Entrada</option><option value="salida">Salida</option></select></label>
          <label className="filter-field"><span>Referencia</span><select className="form-control" value={movementFilters.referenceType} onChange={(event) => setMovementFilter('referenceType', event.target.value)}><option value="">Todas</option>{referenceTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="filter-field"><span>Fecha desde</span><input className="form-control" type="date" max={movementFilters.dateTo || undefined} value={movementFilters.dateFrom} onChange={(event) => setMovementFilter('dateFrom', event.target.value)} /></label>
          <label className="filter-field"><span>Fecha hasta</span><input className="form-control" type="date" min={movementFilters.dateFrom || undefined} value={movementFilters.dateTo} onChange={(event) => setMovementFilter('dateTo', event.target.value)} /></label>
        </div>
        {loadingMovements ? <LoadingState message="Cargando movimientos…" /> : movementsError ? <ErrorState title="No se pudieron cargar los movimientos" message={movementsError} actionLabel="Reintentar" onAction={loadMovements} /> : !movements.length ? <EmptyState message="No hay movimientos para los filtros seleccionados." /> : <MovementsTable items={movements} productsById={productsById} />}
        {!movementsError && <Pagination pagination={pagination} disabled={loadingMovements} onPageChange={(page) => setMovementFilters((current) => ({ ...current, page }))} />}
      </section>}

      {adjustmentOpen && <Modal title="Nuevo ajuste de inventario" onClose={() => setAdjustmentOpen(false)} busy={saving} wide><AdjustmentForm products={activeProducts} busy={saving} onCancel={() => setAdjustmentOpen(false)} onSubmit={createAdjustment} /></Modal>}
      <ErrorDialog open={Boolean(mutationError)} title={mutationError?.title} message={mutationError?.message} onClose={() => setMutationError(null)} />
    </div>
  )
}
