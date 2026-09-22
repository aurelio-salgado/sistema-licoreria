import { useCallback, useEffect, useRef, useState } from 'react'
import { backupsApi } from '../api/backups'
import { useAuth } from '../auth/useAuth'
import { EmptyState, ErrorDialog, Modal, PageHeader, Pagination } from '../components/CatalogUi'
import { ErrorState, LoadingState } from '../components/FeedbackStates'
import { formatDateTime } from '../utils/formatters'

const initial = { page: 1, limit: 20, type: '', operation: '', status: '', dateFrom: '', dateTo: '' }
const size = (value) => value === null || value === undefined ? '—' : `${new Intl.NumberFormat('es-NI', { maximumFractionDigits: 1 }).format(Number(value) / 1024)} KB`

function BackupRecord({ item }) {
  if (item.operacion === 'restauracion') {
    const relations = [
      item.id_respaldo_origen ? `Origen: #${item.id_respaldo_origen}` : null,
      item.id_respaldo_preventivo ? `Preventivo: #${item.id_respaldo_preventivo}` : null,
    ].filter(Boolean)

    return <div className="backup-record"><strong>Restauración</strong>{relations.length > 0 && <span>{relations.join(' · ')}</span>}</div>
  }

  if (item.tipo === 'preventivo') {
    return <div className="backup-record"><strong>Respaldo preventivo</strong><span>Generado antes de una restauración</span></div>
  }

  return <div className="backup-record"><strong>Respaldo manual</strong><span>Creado por usuario</span></div>
}

export function BackupsPage() {
  const { completeRestorationSession, hasPermission } = useAuth()
  const restoreConfirmationRef = useRef(null)
  const [filters, setFilters] = useState(initial); const [draft, setDraft] = useState(initial)
  const [items, setItems] = useState([]); const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(''); const [error, setError] = useState('')
  const [dialog, setDialog] = useState(null); const [restoreItem, setRestoreItem] = useState(null); const [confirmation, setConfirmation] = useState('')
  const canCreate = hasPermission('respaldos.crear'); const canRestore = hasPermission('respaldos.restaurar')
  const load = useCallback(async () => { setLoading(true); setError(''); try { const response = await backupsApi.list(filters); setItems(response?.data?.backups ?? []); setPagination(response?.data?.pagination ?? null) } catch (requestError) { setError(requestError.message || 'No fue posible consultar los respaldos.') } finally { setLoading(false) } }, [filters])
  useEffect(() => { load() }, [load])
  const createBackup = async () => { setBusy('create'); try { await backupsApi.create(); setDialog({ title: 'Respaldo creado', message: 'Respaldo creado correctamente.' }); await load() } catch (requestError) { setDialog({ title: 'No se pudo crear el respaldo', message: requestError.message }) } finally { setBusy('') } }
  const download = async (item) => { setBusy(`download-${item.id_respaldo}`); try { const file = await backupsApi.download(item.id_respaldo); const url = URL.createObjectURL(file.blob); const link = document.createElement('a'); link.href = url; link.download = file.filename; link.click(); URL.revokeObjectURL(url) } catch (requestError) { setDialog({ title: 'No se pudo descargar', message: requestError.message }) } finally { setBusy('') } }
  const restore = async (event) => { event.preventDefault(); setBusy('restore'); try { await backupsApi.restore(restoreItem.id_respaldo, confirmation); setRestoreItem(null); setConfirmation(''); completeRestorationSession() } catch (requestError) { setDialog({ title: 'Restauración no disponible', message: requestError.message }) } finally { setBusy('') } }
  const closeRestore = () => { setRestoreItem(null); setConfirmation('') }
  const apply = (event) => { event.preventDefault(); setFilters({ ...draft, page: 1 }) }
  return <div className="page-stack backups-page">
    <PageHeader eyebrow="ADMINISTRACIÓN" title="Respaldos" description="Crea, descarga y consulta respaldos privados de LIQUORIX." action={canCreate ? <button className="button button--primary" type="button" disabled={Boolean(busy)} onClick={createBackup}>{busy === 'create' ? 'Creando respaldo…' : 'Crear respaldo'}</button> : null} />
    <section className="catalog-panel"><form className="backup-filters" onSubmit={apply}>
      <label className="filter-field"><span>Tipo</span><select className="form-control" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}><option value="">Todos</option><option value="manual">Manual</option><option value="preventivo">Preventivo</option></select></label>
      <label className="filter-field"><span>Operación</span><select className="form-control" value={draft.operation} onChange={(e) => setDraft({ ...draft, operation: e.target.value })}><option value="">Todas</option><option value="respaldo">Respaldo</option><option value="restauracion">Restauración</option></select></label>
      <label className="filter-field"><span>Estado</span><select className="form-control" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><option value="">Todos</option><option value="en_proceso">En proceso</option><option value="exitoso">Exitoso</option><option value="fallido">Fallido</option></select></label>
      <label className="filter-field"><span>Desde</span><input className="form-control" type="date" value={draft.dateFrom} max={draft.dateTo || undefined} onChange={(e) => setDraft({ ...draft, dateFrom: e.target.value })} /></label>
      <label className="filter-field"><span>Hasta</span><input className="form-control" type="date" value={draft.dateTo} min={draft.dateFrom || undefined} onChange={(e) => setDraft({ ...draft, dateTo: e.target.value })} /></label>
      <div className="backup-filter-actions"><button className="button button--secondary" type="button" onClick={() => { setDraft(initial); setFilters(initial) }}>Limpiar</button><button className="button button--primary" type="submit">Aplicar filtros</button></div>
    </form>
    {loading ? <LoadingState message="Cargando respaldos…" /> : error ? <ErrorState title="No se pudieron cargar los respaldos" message={error} actionLabel="Reintentar" onAction={load} /> : !items.length ? <EmptyState message="No hay respaldos para los filtros seleccionados." /> : <div className="table-scroll"><table className="data-table backup-table"><thead><tr><th>Fecha</th><th>Archivo</th><th>Registro</th><th>Tamaño</th><th>Estado</th><th>Responsable</th><th>Resultado</th><th>Acciones</th></tr></thead><tbody>{items.map((item) => { const eligible = item.operacion === 'respaldo' && item.estado === 'exitoso' && item.archivo_disponible; return <tr key={item.id_respaldo}><td>{formatDateTime(item.fecha_finalizacion || item.fecha_operacion)}</td><td>{item.nombre_archivo}</td><td><BackupRecord item={item} /></td><td>{size(item.tamano_bytes)}</td><td><span className={`audit-result audit-result--${item.estado}`}>{item.estado.replace('_', ' ')}</span></td><td>{item.usuario?.nombre_usuario || item.usuario?.nombre || '—'}</td><td>{item.mensaje_resultado || '—'}</td><td><div className="table-actions">{eligible && <button className="button button--secondary button--compact" type="button" disabled={Boolean(busy)} onClick={() => download(item)}>Descargar</button>}{eligible && canRestore && <button className="button button--danger button--compact" type="button" disabled={Boolean(busy)} onClick={() => { setRestoreItem(item); setConfirmation('') }}>Restaurar</button>}</div></td></tr> })}</tbody></table></div>}
    {!error && <Pagination pagination={pagination} disabled={loading} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />}</section>
    {restoreItem && <Modal title="RESTAURAR RESPALDO" busy={busy === 'restore'} onClose={closeRestore} descriptionId="restore-warning" initialFocusRef={restoreConfirmationRef}><form className="restore-form" onSubmit={restore}><dl className="restore-backup-summary"><div><dt>Nombre</dt><dd>{restoreItem.nombre_archivo}</dd></div><div><dt>Fecha</dt><dd>{formatDateTime(restoreItem.fecha_finalizacion || restoreItem.fecha_operacion)}</dd></div><div><dt>Tamaño</dt><dd>{size(restoreItem.tamano_bytes)}</dd></div></dl><p id="restore-warning" className="inline-alert inline-alert--warning">Esta operación reemplazará los datos actuales del sistema con la información contenida en el respaldo seleccionado. Antes de restaurar se generará automáticamente un respaldo preventivo. Todos los usuarios deberán iniciar sesión nuevamente.</p><label className="filter-field" htmlFor="restore-confirmation"><span>Escribe RESTAURAR para continuar</span><input ref={restoreConfirmationRef} id="restore-confirmation" className="form-control" autoComplete="off" disabled={busy === 'restore'} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label><div className="modal-footer"><button className="button button--secondary" type="button" disabled={busy === 'restore'} onClick={closeRestore}>Cancelar</button><button className="button button--danger" type="submit" disabled={confirmation !== 'RESTAURAR' || busy === 'restore'}>{busy === 'restore' ? 'Restaurando…' : 'Restaurar'}</button></div></form></Modal>}
    <ErrorDialog open={Boolean(dialog)} title={dialog?.title} message={dialog?.message} onClose={() => setDialog(null)} />
  </div>
}
