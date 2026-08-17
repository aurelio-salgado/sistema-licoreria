import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientsApi } from '../api/clients'
import { salesApi } from '../api/sales'
import { useAuth } from '../auth/useAuth'
import { EmptyState, ErrorDialog, Modal, PageHeader, Pagination, StatusBadge } from '../components/CatalogUi'
import { ErrorState, LoadingState } from '../components/FeedbackStates'
import { SaleHeaderForm } from '../components/sales/SaleForms'
import { createActionError } from '../utils/actionErrors'
import { formatDateTime, formatMoney } from '../utils/formatters'

const PAGE_LIMIT = 10

async function loadClients(status = '') {
  const rows = []
  let page = 1
  let totalPages = 1
  do {
    const response = await clientsApi.list({ page, limit: 100, search: '', status })
    rows.push(...(response?.data?.clients ?? []))
    totalPages = response?.data?.pagination?.total_pages ?? 1
    page += 1
  } while (page <= totalPages)
  return rows
}

export function SalesPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [filters, setFilters] = useState({ page: 1, limit: PAGE_LIMIT, status: '', client: '', seller: '', dateFrom: '', dateTo: '' })
  const [sales, setSales] = useState([])
  const [pagination, setPagination] = useState(null)
  const [clients, setClients] = useState([])
  const [filterClients, setFilterClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clientError, setClientError] = useState('')
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mutationError, setMutationError] = useState(null)
  const canCreate = hasPermission('ventas.crear')

  const loadSales = useCallback(async () => {
    setLoading(true); setError('')
    try { const response = await salesApi.list(filters); setSales(response?.data?.sales ?? []); setPagination(response?.data?.pagination ?? null) }
    catch (requestError) { setError(requestError.message || 'No fue posible cargar las ventas.') }
    finally { setLoading(false) }
  }, [filters])
  const loadClientCatalog = useCallback(async () => {
    setClientError('')
    try { const [active, all] = await Promise.all([loadClients('activo'), loadClients('')]); setClients(active); setFilterClients(all) }
    catch (requestError) { setClientError(requestError.message || 'No fue posible cargar los clientes. Aún puedes crear una venta para Consumidor final.') }
  }, [])
  useEffect(() => { loadSales() }, [loadSales])
  useEffect(() => { loadClientCatalog() }, [loadClientCatalog])

  const createSale = async (payload) => {
    setSaving(true); setMutationError(null)
    try { const response = await salesApi.create(payload); navigate(`/sales/${response.data.sale.id_venta}`, { state: { feedback: 'Preparación creada correctamente.' } }) }
    catch (requestError) { setMutationError(createActionError(requestError, 'No se pudo crear la venta', 'No fue posible crear la preparación.')) }
    finally { setSaving(false) }
  }

  return <div className="page-stack sales-page">
    <PageHeader eyebrow="VENTAS" title="Ventas" description="Prepara, cobra y consulta las ventas conservando su trazabilidad." action={canCreate ? <button className="button button--primary" type="button" onClick={() => setCreating(true)}>Nueva venta</button> : null} />
    {clientError && <div className="inline-alert inline-alert--error" role="alert">{clientError} <button className="link-button" type="button" onClick={loadClientCatalog}>Reintentar</button></div>}
    <section className="catalog-panel" aria-label="Listado de ventas">
      <div className="sale-filters">
        <label className="filter-field"><span>Estado</span><select className="form-control" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, page: 1, status: event.target.value }))}><option value="">Todos</option><option value="preparacion">Preparación</option><option value="completada">Completada</option><option value="anulada">Anulada</option></select></label>
        <label className="filter-field"><span>Cliente</span><select className="form-control" value={filters.client} onChange={(event) => setFilters((current) => ({ ...current, page: 1, client: event.target.value }))}><option value="">Todos</option>{filterClients.map((client) => <option key={client.id_cliente} value={client.id_cliente}>{client.nombre}</option>)}</select></label>
        <label className="filter-field"><span>ID vendedor</span><input className="form-control" type="number" min="1" step="1" placeholder="Todos" value={filters.seller} onChange={(event) => setFilters((current) => ({ ...current, page: 1, seller: event.target.value }))} /></label>
        <label className="filter-field"><span>Fecha desde</span><input className="form-control" type="date" value={filters.dateFrom} onChange={(event) => setFilters((current) => ({ ...current, page: 1, dateFrom: event.target.value }))} /></label>
        <label className="filter-field"><span>Fecha hasta</span><input className="form-control" type="date" min={filters.dateFrom || undefined} value={filters.dateTo} onChange={(event) => setFilters((current) => ({ ...current, page: 1, dateTo: event.target.value }))} /></label>
      </div>
      {loading ? <LoadingState message="Cargando ventas…" /> : error ? <ErrorState title="No se pudieron cargar las ventas" message={error} actionLabel="Reintentar" onAction={loadSales} /> : sales.length === 0 ? <EmptyState message="No existen ventas para los filtros seleccionados." /> : <div className="table-container"><table className="data-table sales-table"><thead><tr><th>Número venta</th><th>Factura</th><th>Fecha</th><th>Cliente</th><th>Vendedor</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{sales.map((sale) => { const seller = [sale.usuario?.nombre, sale.usuario?.apellido].filter(Boolean).join(' ') || sale.usuario?.nombre_usuario; return <tr key={sale.id_venta}><td><strong>{sale.numero_venta}</strong></td><td>{sale.numero_factura || '—'}</td><td>{formatDateTime(sale.fecha_venta)}</td><td>{sale.cliente?.nombre}</td><td>{seller}</td><td><strong>{formatMoney(sale.total)}</strong></td><td><StatusBadge status={sale.estado} /></td><td><button className="button button--secondary button--compact" type="button" onClick={() => navigate(`/sales/${sale.id_venta}`)}>Ver detalle</button></td></tr> })}</tbody></table></div>}
      {!error && <Pagination pagination={pagination} disabled={loading} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />}
    </section>
    {creating && <Modal title="Nueva venta" onClose={() => { setCreating(false); setMutationError(null) }} busy={saving} wide><SaleHeaderForm clients={clients} busy={saving} onCancel={() => { setCreating(false); setMutationError(null) }} onSubmit={createSale} /></Modal>}
    <ErrorDialog open={Boolean(mutationError)} title={mutationError?.title} message={mutationError?.message} onClose={() => setMutationError(null)} />
  </div>
}
