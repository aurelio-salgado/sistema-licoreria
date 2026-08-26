import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cashApi } from '../api/cash'
import { EmptyState, PageHeader, Pagination } from '../components/CatalogUi'
import { ErrorState, LoadingState } from '../components/FeedbackStates'
import { Difference } from '../components/cash/CashView'
import { formatDateTime, formatMoney } from '../utils/formatters'

const PAGE_LIMIT = 10

function responsibleName(user) {
  return [user?.nombre, user?.apellido].filter(Boolean).join(' ') || user?.nombre_usuario || 'Sin identificar'
}

export function CashSupervisionPage() {
  const navigate = useNavigate()
  const [cash, setCash] = useState([])
  const [responsibles, setResponsibles] = useState([])
  const [pagination, setPagination] = useState(null)
  const [filters, setFilters] = useState({ page: 1, limit: PAGE_LIMIT, user: '', dateFrom: '', dateTo: '', result: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadClosures = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await cashApi.listSupervision(filters)
      setCash(response?.data?.cash ?? [])
      setResponsibles(response?.data?.responsibles ?? [])
      setPagination(response?.data?.pagination ?? null)
    } catch (requestError) {
      setError(requestError.message || 'No fue posible cargar los cierres de caja.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { loadClosures() }, [loadClosures])
  const updateFilter = (field, value) => setFilters((current) => ({ ...current, page: 1, [field]: value }))

  return <div className="page-stack cash-page">
    <PageHeader eyebrow="CAJA / SUPERVISIÓN" title="Cierres de caja" description="Consulta cierres y diferencias de efectivo de todos los responsables." />
    <section className="catalog-panel cash-history">
      <div className="cash-filters cash-supervision-filters">
        <label className="filter-field"><span>Responsable</span><select className="form-control" value={filters.user} onChange={(event) => updateFilter('user', event.target.value)}><option value="">Todos</option>{responsibles.map((user) => <option key={user.id_usuario} value={user.id_usuario}>{responsibleName(user)}</option>)}</select></label>
        <label className="filter-field"><span>Fecha de cierre desde</span><input className="form-control" type="date" value={filters.dateFrom} onChange={(event) => updateFilter('dateFrom', event.target.value)} /></label>
        <label className="filter-field"><span>Fecha de cierre hasta</span><input className="form-control" type="date" min={filters.dateFrom || undefined} value={filters.dateTo} onChange={(event) => updateFilter('dateTo', event.target.value)} /></label>
        <label className="filter-field"><span>Resultado</span><select className="form-control" value={filters.result} onChange={(event) => updateFilter('result', event.target.value)}><option value="">Todos</option><option value="faltante">Faltante</option><option value="sobrante">Sobrante</option><option value="cuadrada">Caja cuadrada</option></select></label>
      </div>
      {loading ? <LoadingState message="Cargando cierres..." /> : error ? <ErrorState title="No se pudieron cargar los cierres" message={error} actionLabel="Reintentar" onAction={loadClosures} /> : !cash.length ? <EmptyState message="No hay cierres para los filtros seleccionados." /> : <div className="table-container"><table className="data-table cash-history-table"><thead><tr><th>ID</th><th>Responsable</th><th>Apertura</th><th>Cierre</th><th>Monto apertura</th><th>Monto esperado</th><th>Monto contado</th><th>Diferencia</th><th>Acción</th></tr></thead><tbody>{cash.map((closure) => <tr key={closure.id_caja}><td>#{closure.id_caja}</td><td>{responsibleName(closure.usuario)}</td><td>{formatDateTime(closure.fecha_apertura)}</td><td>{formatDateTime(closure.fecha_cierre)}</td><td>{formatMoney(closure.monto_apertura)}</td><td>{formatMoney(closure.monto_esperado)}</td><td>{formatMoney(closure.monto_contado)}</td><td><Difference value={closure.diferencia} /></td><td><button className="button button--secondary button--compact" type="button" onClick={() => navigate(`/cash/closures/${closure.id_caja}`)}>Ver detalle</button></td></tr>)}</tbody></table></div>}
      {!error && <Pagination pagination={pagination} disabled={loading} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />}
    </section>
  </div>
}
