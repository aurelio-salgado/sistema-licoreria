import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { purchasesApi } from '../api/purchases'
import { suppliersApi } from '../api/suppliers'
import { useAuth } from '../auth/useAuth'
import { EmptyState, ErrorDialog, Modal, PageHeader, Pagination, StatusBadge } from '../components/CatalogUi'
import { ErrorState, LoadingState } from '../components/FeedbackStates'
import { PurchaseHeaderForm } from '../components/purchases/PurchaseForms'
import { formatDateTime, formatMoney } from '../utils/formatters'
import { createActionError } from '../utils/actionErrors'

const PAGE_LIMIT = 10

async function loadSuppliersByStatus(status) {
  const records = []
  let page = 1
  let totalPages = 1
  do {
    const response = await suppliersApi.list({ page, limit: 100, search: '', status })
    records.push(...(response?.data?.suppliers ?? []))
    totalPages = response?.data?.pagination?.total_pages ?? 1
    page += 1
  } while (page <= totalPages)
  return records
}

export function PurchasesPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [filters, setFilters] = useState({ page: 1, limit: PAGE_LIMIT, status: '', supplier: '', dateFrom: '', dateTo: '' })
  const [purchases, setPurchases] = useState([])
  const [pagination, setPagination] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [supplierFilters, setSupplierFilters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mutationError, setMutationError] = useState(null)
  const canCreate = hasPermission('compras.crear')

  const loadPurchases = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await purchasesApi.list(filters)
      setPurchases(response?.data?.purchases ?? [])
      setPagination(response?.data?.pagination ?? null)
    } catch (requestError) { setError(requestError.message || 'No fue posible cargar las compras.') }
    finally { setLoading(false) }
  }, [filters])
  const loadSuppliers = useCallback(async () => {
    setCatalogError('')
    try {
      const [activeRows, allRows] = await Promise.all([
        loadSuppliersByStatus('activo'),
        loadSuppliersByStatus(''),
      ])
      setSuppliers(activeRows)
      setSupplierFilters(allRows)
    }
    catch (requestError) { setCatalogError(requestError.message || 'No fue posible cargar los proveedores.') }
  }, [])

  useEffect(() => { loadPurchases() }, [loadPurchases])
  useEffect(() => { loadSuppliers() }, [loadSuppliers])

  const createPurchase = async (payload) => {
    setSaving(true); setMutationError(null)
    try {
      const response = await purchasesApi.create(payload)
      navigate(`/purchases/${response.data.purchase.id_compra}`, { state: { feedback: 'Borrador creado correctamente.' } })
    } catch (requestError) {
      setMutationError(createActionError(requestError, 'No se pudo crear la compra', 'No fue posible crear el borrador.'))
    }
    finally { setSaving(false) }
  }

  return <div className="page-stack purchases-page">
    <PageHeader eyebrow="COMPRAS" title="Compras" description="Consulta y administra la recepción de productos de proveedores." action={canCreate ? <button className="button button--primary" type="button" disabled={Boolean(catalogError)} onClick={() => setCreating(true)}>Nueva compra</button> : null} />
    {catalogError && <div className="inline-alert inline-alert--error" role="alert">{catalogError} <button className="link-button" type="button" onClick={loadSuppliers}>Reintentar</button></div>}
    <section className="catalog-panel" aria-label="Listado de compras">
      <div className="purchase-filters">
        <label className="filter-field"><span>Estado</span><select className="form-control" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, page: 1, status: event.target.value }))}><option value="">Todos</option><option value="borrador">Borrador</option><option value="recibida">Recibida</option><option value="anulada">Anulada</option></select></label>
        <label className="filter-field"><span>Proveedor</span><select className="form-control" value={filters.supplier} onChange={(event) => setFilters((current) => ({ ...current, page: 1, supplier: event.target.value }))}><option value="">Todos</option>{supplierFilters.map((supplier) => <option key={supplier.id_proveedor} value={supplier.id_proveedor}>{supplier.nombre}</option>)}</select></label>
        <label className="filter-field"><span>Fecha desde</span><input className="form-control" type="date" value={filters.dateFrom} onChange={(event) => setFilters((current) => ({ ...current, page: 1, dateFrom: event.target.value }))} /></label>
        <label className="filter-field"><span>Fecha hasta</span><input className="form-control" type="date" min={filters.dateFrom || undefined} value={filters.dateTo} onChange={(event) => setFilters((current) => ({ ...current, page: 1, dateTo: event.target.value }))} /></label>
      </div>
      {loading ? <LoadingState message="Cargando compras…" /> : error ? <ErrorState title="No se pudieron cargar las compras" message={error} actionLabel="Reintentar" onAction={loadPurchases} /> : purchases.length === 0 ? <EmptyState message="No existen compras para los filtros seleccionados." /> : <div className="table-container"><table className="data-table purchases-table"><thead><tr><th>Número</th><th>Fecha</th><th>Proveedor</th><th>Responsable</th><th>Subtotal</th><th>Descuento</th><th>Impuesto</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{purchases.map((purchase) => <tr key={purchase.id_compra}><td><strong>{purchase.numero_compra}</strong>{purchase.numero_documento_proveedor && <small className="table-secondary">Doc. {purchase.numero_documento_proveedor}</small>}</td><td>{formatDateTime(purchase.fecha_compra)}</td><td>{purchase.proveedor?.nombre}</td><td>{[purchase.usuario?.nombre, purchase.usuario?.apellido].filter(Boolean).join(' ') || purchase.usuario?.nombre_usuario}</td><td>{formatMoney(purchase.subtotal)}</td><td>{formatMoney(purchase.descuento)}</td><td>{formatMoney(purchase.impuesto)}</td><td><strong>{formatMoney(purchase.total)}</strong></td><td><StatusBadge status={purchase.estado} /></td><td><button className="button button--secondary button--compact" type="button" onClick={() => navigate(`/purchases/${purchase.id_compra}`)}>Ver detalle</button></td></tr>)}</tbody></table></div>}
      {!error && <Pagination pagination={pagination} disabled={loading} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />}
    </section>
    {creating && <Modal title="Nueva compra" onClose={() => { setCreating(false); setMutationError(null) }} busy={saving} wide><PurchaseHeaderForm suppliers={suppliers} busy={saving} onCancel={() => { setCreating(false); setMutationError(null) }} onSubmit={createPurchase} /></Modal>}
    <ErrorDialog open={Boolean(mutationError)} title={mutationError?.title} message={mutationError?.message} onClose={() => setMutationError(null)} />
  </div>
}
