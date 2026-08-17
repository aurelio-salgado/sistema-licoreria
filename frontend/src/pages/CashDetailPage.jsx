import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { cashApi } from '../api/cash'
import { PageHeader, StatusBadge } from '../components/CatalogUi'
import { ErrorState, LoadingState } from '../components/FeedbackStates'
import { CashMetadata, CashMovements, CashSummaryCards } from '../components/cash/CashView'
import { calculateCashSummary } from '../utils/cash'

export function CashDetailPage() {
  const { id } = useParams()
  const [cash, setCash] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const loadCash = useCallback(async () => { setLoading(true); setError(''); try { const response = await cashApi.getById(id); setCash(response?.data?.cash ?? null) } catch (requestError) { setError(requestError.message || 'No fue posible cargar la caja.') } finally { setLoading(false) } }, [id])
  useEffect(() => { loadCash() }, [loadCash])
  const summary = useMemo(() => calculateCashSummary(cash), [cash])
  if (loading) return <LoadingState message="Cargando detalle de caja…" />
  if (error || !cash) return <ErrorState title="No se pudo cargar la caja" message={error || 'Caja no encontrada'} actionLabel="Reintentar" onAction={loadCash} />
  return <div className="page-stack cash-detail-page"><PageHeader eyebrow="CAJA / DETALLE" title={`Caja #${cash.id_caja}`} description="Consulta histórica de una caja propia." action={<StatusBadge status={cash.estado} />} /><section className="cash-current-card"><CashMetadata cash={cash} /><CashSummaryCards cash={cash} summary={summary} /></section><section className="cash-current-card cash-history"><div className="section-heading"><div><span className="eyebrow">MOVIMIENTOS</span><h2>Actividad de caja</h2></div></div><CashMovements movements={cash.movements} /></section><div className="cash-detail-actions"><Link className="button button--secondary" to="/cash">← Volver a caja</Link></div></div>
}
