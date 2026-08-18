import { useCallback, useEffect, useState } from 'react'
import { auditApi } from '../api/audit'
import { EmptyState, ErrorDialog, Modal, PageHeader, Pagination } from '../components/CatalogUi'
import { AuditDetail } from '../components/audit/AuditDetail'
import { ErrorState, LoadingState } from '../components/FeedbackStates'
import { formatDateTime } from '../utils/formatters'

const LIMIT = 20
const emptyFilters = { page: 1, limit: LIMIT, user: '', module: '', action: '', entity: '', entityId: '', result: '', dateFrom: '', dateTo: '' }

export function AuditPage() {
  const [filters, setFilters] = useState(emptyFilters); const [draft, setDraft] = useState(emptyFilters)
  const [events, setEvents] = useState([]); const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [filterError, setFilterError] = useState('')
  const [detail, setDetail] = useState(null); const [detailOpen, setDetailOpen] = useState(false); const [detailLoading, setDetailLoading] = useState(false); const [detailError, setDetailError] = useState(null)
  const loadEvents = useCallback(async () => { setLoading(true); setError(''); try { const response = await auditApi.list(filters); setEvents(response?.data?.events ?? []); setPagination(response?.data?.pagination ?? null) } catch (requestError) { setError(requestError.message || 'No fue posible consultar la bitácora.') } finally { setLoading(false) } }, [filters])
  useEffect(() => { loadEvents() }, [loadEvents])
  const changeDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }))
  const submitFilters = (event) => { event.preventDefault(); if ((draft.user && Number(draft.user) < 1) || (draft.entityId && Number(draft.entityId) < 1)) { setFilterError('Los identificadores deben ser números enteros positivos.'); return } setFilterError(''); setFilters({ ...draft, page: 1, user: draft.user.trim(), module: draft.module.trim(), action: draft.action.trim(), entity: draft.entity.trim(), entityId: draft.entityId.trim(), result: draft.result.trim() }) }
  const clearFilters = () => { setDraft(emptyFilters); setFilters(emptyFilters); setFilterError('') }
  const openDetail = async (id) => { setDetailOpen(true); setDetail(null); setDetailLoading(true); try { const response = await auditApi.getById(id); setDetail(response?.data?.event ?? null) } catch (requestError) { setDetailOpen(false); setDetailError({ title: 'No se pudo cargar el evento', message: requestError.message || 'No fue posible consultar el detalle solicitado.' }) } finally { setDetailLoading(false) } }
  return (
    <div className="page-stack audit-page"><PageHeader eyebrow="ADMINISTRACIÓN" title="Bitácora" description="Consulta la trazabilidad de acciones registradas por el sistema." />
      <section className="catalog-panel"><form className="audit-filters" onSubmit={submitFilters}>
        <label className="filter-field"><span>ID usuario</span><input className="form-control" type="number" min="1" step="1" value={draft.user} onChange={(event) => changeDraft('user', event.target.value)} /></label>
        <label className="filter-field"><span>Módulo</span><input className="form-control" maxLength="80" value={draft.module} onChange={(event) => changeDraft('module', event.target.value)} /></label>
        <label className="filter-field"><span>Acción</span><input className="form-control" maxLength="100" value={draft.action} onChange={(event) => changeDraft('action', event.target.value)} /></label>
        <label className="filter-field"><span>Entidad</span><input className="form-control" maxLength="80" value={draft.entity} onChange={(event) => changeDraft('entity', event.target.value)} /></label>
        <label className="filter-field"><span>ID entidad</span><input className="form-control" type="number" min="1" step="1" value={draft.entityId} onChange={(event) => changeDraft('entityId', event.target.value)} /></label>
        <label className="filter-field"><span>Resultado</span><input className="form-control" maxLength="30" value={draft.result} onChange={(event) => changeDraft('result', event.target.value)} /></label>
        <label className="filter-field"><span>Fecha desde</span><input className="form-control" type="date" max={draft.dateTo || undefined} value={draft.dateFrom} onChange={(event) => changeDraft('dateFrom', event.target.value)} /></label>
        <label className="filter-field"><span>Fecha hasta</span><input className="form-control" type="date" min={draft.dateFrom || undefined} value={draft.dateTo} onChange={(event) => changeDraft('dateTo', event.target.value)} /></label>
        <div className="audit-filter-actions"><button className="button button--secondary" type="button" onClick={clearFilters}>Limpiar</button><button className="button button--primary" type="submit">Aplicar filtros</button></div>
      </form>{filterError && <div className="inline-alert inline-alert--error" role="alert">{filterError}</div>}
      {loading ? <LoadingState message="Cargando bitácora…" /> : error ? <ErrorState title="No se pudo cargar la bitácora" message={error} actionLabel="Reintentar" onAction={loadEvents} /> : !events.length ? <EmptyState message="No hay eventos para los filtros seleccionados." /> : <div className="table-scroll"><table className="data-table audit-table"><thead><tr><th>Fecha</th><th>Usuario</th><th>Módulo</th><th>Acción</th><th>Entidad</th><th>ID</th><th>Resultado</th><th>IP</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{events.map((item) => <tr key={item.id_bitacora}><td>{formatDateTime(item.fecha_evento)}</td><td>{item.user?.nombre_usuario ?? item.user?.nombre ?? 'Sistema / No disponible'}</td><td>{item.modulo || '—'}</td><td>{item.accion || '—'}</td><td>{item.entidad || '—'}</td><td>{item.id_entidad ?? '—'}</td><td><span className={`audit-result audit-result--${String(item.resultado ?? '').toLowerCase()}`}>{item.resultado || 'No disponible'}</span></td><td>{item.direccion_ip || '—'}</td><td><button className="button button--secondary button--compact" type="button" onClick={() => openDetail(item.id_bitacora)}>Ver detalle</button></td></tr>)}</tbody></table></div>}
      {!error && <Pagination pagination={pagination} disabled={loading} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />}</section>
      {detailOpen && <Modal title="Detalle del evento" wide busy={detailLoading} onClose={() => setDetailOpen(false)}>{detailLoading ? <LoadingState message="Cargando detalle…" /> : detail ? <AuditDetail event={detail} /> : null}</Modal>}
      <ErrorDialog open={Boolean(detailError)} title={detailError?.title} message={detailError?.message} onClose={() => setDetailError(null)} /></div>
  )
}
