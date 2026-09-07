import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cashApi } from '../api/cash'
import { useAuth } from '../auth/useAuth'
import { EmptyState, ErrorDialog, Modal, PageHeader, Pagination, StatusBadge } from '../components/CatalogUi'
import { ErrorState, LoadingState } from '../components/FeedbackStates'
import { CloseCashForm, CashMovementForm, OpenCashForm } from '../components/cash/CashForms'
import { CashMetadata, CashMovements, CashSummaryCards, Difference } from '../components/cash/CashView'
import { createActionError } from '../utils/actionErrors'
import { calculateCashSummary } from '../utils/cash'
import { formatDateTime, formatMoney } from '../utils/formatters'

const PAGE_LIMIT = 10

export function CashPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [current, setCurrent] = useState(null)
  const [history, setHistory] = useState([])
  const [pagination, setPagination] = useState(null)
  const [filters, setFilters] = useState({ page: 1, limit: PAGE_LIMIT, status: '', dateFrom: '', dateTo: '' })
  const [loadingCurrent, setLoadingCurrent] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [currentError, setCurrentError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [dialog, setDialog] = useState(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [mutationError, setMutationError] = useState(null)
  const canOpen = hasPermission('caja.abrir')
  const canClose = hasPermission('caja.cerrar')
  const canCreateSale = hasPermission('ventas.crear')

  const loadCurrent = useCallback(async () => {
    setLoadingCurrent(true); setCurrentError('')
    try { const response = await cashApi.current(); const detail = await cashApi.getById(response.data.cash.id_caja); setCurrent(detail.data.cash) }
    catch (requestError) { if (requestError.status === 404) setCurrent(null); else setCurrentError(requestError.message || 'No fue posible consultar la caja actual.') }
    finally { setLoadingCurrent(false) }
  }, [])
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true); setHistoryError('')
    try { const response = await cashApi.list(filters); setHistory(response?.data?.cash ?? []); setPagination(response?.data?.pagination ?? null) }
    catch (requestError) { setHistoryError(requestError.message || 'No fue posible cargar el historial.') }
    finally { setLoadingHistory(false) }
  }, [filters])
  useEffect(() => { loadCurrent() }, [loadCurrent])
  useEffect(() => { loadHistory() }, [loadHistory])
  useEffect(() => { if (!feedback) return undefined; const timer = window.setTimeout(() => setFeedback(''), 4500); return () => window.clearTimeout(timer) }, [feedback])
  const summary = useMemo(() => calculateCashSummary(current), [current])

  const applyAction = async (operation, successMessage, errorTitle) => {
    setSaving(true); setMutationError(null)
    try { await operation(); setDialog(null); setFeedback(successMessage); await Promise.all([loadCurrent(), loadHistory()]) }
    catch (requestError) { setMutationError(createActionError(requestError, errorTitle)) }
    finally { setSaving(false) }
  }
  const openCash = async (values) => {
    setSaving(true); setMutationError(null)
    try {
      const response = await cashApi.open(values)
      await Promise.all([loadCurrent(), loadHistory()])
      setDialog({ type: 'open-success', cash: response.data.cash })
    } catch (requestError) {
      setMutationError(createActionError(requestError, 'No se pudo abrir la caja'))
    } finally { setSaving(false) }
  }
  const createMovement = (values) => applyAction(() => cashApi.createMovement(current.id_caja, values), `${values.tipo_movimiento === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado correctamente.`, `No se pudo registrar el ${values.tipo_movimiento}`)
  const closeCash = async (values) => {
    setSaving(true); setMutationError(null)
    try { const response = await cashApi.close(current.id_caja, values); setDialog(null); await loadHistory(); navigate(`/cash/${response.data.cash.id_caja}`) }
    catch (requestError) { setMutationError(createActionError(requestError, 'No se pudo cerrar la caja')) }
    finally { setSaving(false) }
  }

  return <div className="page-stack cash-page">
    <PageHeader eyebrow="CAJA" title="Caja" description="Controla tu turno, movimientos de efectivo e historial de cierres." />
    {feedback && <div className="inline-alert inline-alert--success" role="status">{feedback}</div>}
    <section className="cash-current-card"><div className="section-heading"><div><span className="eyebrow">TURNO ACTUAL</span><h2>Caja actual</h2></div></div>
      {loadingCurrent ? <LoadingState message="Consultando caja actual…" /> : currentError ? <ErrorState title="No se pudo consultar la caja" message={currentError} actionLabel="Reintentar" onAction={loadCurrent} /> : !current ? <div className="cash-no-current"><EmptyState message="No tienes una caja abierta." />{canOpen && <button className="button button--primary" type="button" onClick={() => setDialog({ type: 'open' })}>Abrir caja</button>}</div> : <>
        <CashMetadata cash={current} />
        <CashSummaryCards cash={current} summary={summary} />
        <div className="cash-actions"><button className="button button--success" type="button" onClick={() => setDialog({ type: 'movement', movementType: 'ingreso' })}>Registrar ingreso</button><button className="button button--secondary" type="button" onClick={() => setDialog({ type: 'movement', movementType: 'egreso' })}>Registrar egreso</button>{canClose && <button className="button button--danger cash-close-button" type="button" onClick={() => setDialog({ type: 'close' })}>Cerrar caja</button>}</div>
        <div className="cash-movements-heading"><h3>Movimientos actuales</h3><span>{current.movements?.length ?? 0} registros</span></div><CashMovements movements={current.movements} />
      </>}
    </section>
    <section className="catalog-panel cash-history"><div className="section-heading"><div><span className="eyebrow">HISTORIAL</span><h2>Mis cajas</h2></div></div><div className="cash-filters"><label className="filter-field"><span>Estado</span><select className="form-control" value={filters.status} onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, page: 1, status: event.target.value }))}><option value="">Todos</option><option value="abierta">Abierta</option><option value="cerrada">Cerrada</option></select></label><label className="filter-field"><span>Fecha desde</span><input className="form-control" type="date" value={filters.dateFrom} onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, page: 1, dateFrom: event.target.value }))} /></label><label className="filter-field"><span>Fecha hasta</span><input className="form-control" type="date" min={filters.dateFrom || undefined} value={filters.dateTo} onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, page: 1, dateTo: event.target.value }))} /></label></div>
      {loadingHistory ? <LoadingState message="Cargando historial…" /> : historyError ? <ErrorState title="No se pudo cargar el historial" message={historyError} actionLabel="Reintentar" onAction={loadHistory} /> : !history.length ? <EmptyState message="No hay cajas para los filtros seleccionados." /> : <div className="table-container"><table className="data-table cash-history-table"><thead><tr><th>ID</th><th>Apertura</th><th>Cierre</th><th>Monto apertura</th><th>Monto cierre</th><th>Diferencia</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{history.map((cash) => <tr key={cash.id_caja}><td>#{cash.id_caja}</td><td>{formatDateTime(cash.fecha_apertura)}</td><td>{formatDateTime(cash.fecha_cierre)}</td><td>{formatMoney(cash.monto_apertura)}</td><td>{formatMoney(cash.monto_cierre)}</td><td>{cash.estado === 'cerrada' ? <Difference value={cash.diferencia} /> : '—'}</td><td><StatusBadge status={cash.estado} /></td><td><button className="button button--secondary button--compact" type="button" onClick={() => navigate(`/cash/${cash.id_caja}`)}>Ver detalle</button></td></tr>)}</tbody></table></div>}
      {!historyError && <Pagination pagination={pagination} disabled={loadingHistory} onPageChange={(page) => setFilters((currentFilters) => ({ ...currentFilters, page }))} />}
    </section>
    {dialog?.type === 'open' && <Modal title="Abrir caja" onClose={() => setDialog(null)} busy={saving}><OpenCashForm busy={saving} onCancel={() => setDialog(null)} onSubmit={openCash} /></Modal>}
    {dialog?.type === 'open-success' && <Modal title="Caja abierta correctamente" onClose={() => setDialog(null)} footer={<div className="cash-open-success-actions">{canCreateSale && <button className="button button--primary" type="button" onClick={() => navigate('/sales')}>Ir a ventas</button>}<button className="button button--secondary" type="button" onClick={() => navigate('/dashboard')}>Volver al dashboard</button></div>}><div className="cash-open-success"><span aria-hidden="true">✓</span><div><strong>Tu caja está lista para operar.</strong><p>Monto de apertura: {formatMoney(dialog.cash?.monto_apertura)}</p></div></div></Modal>}
    {dialog?.type === 'movement' && <Modal title={`Registrar ${dialog.movementType}`} onClose={() => setDialog(null)} busy={saving}><CashMovementForm type={dialog.movementType} busy={saving} onCancel={() => setDialog(null)} onSubmit={createMovement} /></Modal>}
    {dialog?.type === 'close' && <Modal title="Cerrar caja" onClose={() => setDialog(null)} busy={saving}><CloseCashForm expected={summary.expected} busy={saving} onCancel={() => setDialog(null)} onSubmit={closeCash} /></Modal>}
    <ErrorDialog open={Boolean(mutationError)} title={mutationError?.title} message={mutationError?.message} onClose={() => setMutationError(null)} />
  </div>
}
