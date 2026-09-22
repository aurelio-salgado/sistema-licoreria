import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { clientsApi } from '../api/clients'
import { salesApi } from '../api/sales'
import { useAuth } from '../auth/useAuth'
import { ConfirmDialog, EmptyState, ErrorDialog, Modal, PageHeader, StatusBadge } from '../components/CatalogUi'
import { ErrorState, LoadingState } from '../components/FeedbackStates'
import { PaymentForm } from '../components/sales/PaymentForm'
import { SaleReceipt } from '../components/sales/SaleReceipt'
import { SaleCancellationForm, SaleHeaderForm, SaleItemForm } from '../components/sales/SaleForms'
import { createActionError } from '../utils/actionErrors'
import { formatDateTime, formatMoney, formatQuantity } from '../utils/formatters'

async function loadAllActive(apiMethod, collection) {
  const records = []
  let page = 1
  let totalPages = 1
  do {
    const response = await apiMethod({ page, limit: 100, search: '', status: 'activo', categoryId: '', brandId: '' })
    records.push(...(response?.data?.[collection] ?? []))
    totalPages = response?.data?.pagination?.total_pages ?? 1
    page += 1
  } while (page <= totalPages)
  return records
}

export function SaleDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const { hasPermission } = useAuth()
  const [sale, setSale] = useState(null)
  const [clients, setClients] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [paymentMethodError, setPaymentMethodError] = useState('')
  const [feedback, setFeedback] = useState(location.state?.feedback ?? '')
  const [editor, setEditor] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [removingItem, setRemovingItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [mutationError, setMutationError] = useState(null)
  const canEdit = hasPermission('ventas.crear')
  const canCancel = hasPermission('ventas.anular')

  const loadSale = useCallback(async () => {
    setLoading(true); setError('')
    try { const response = await salesApi.getById(id); setSale(response?.data?.sale ?? null) }
    catch (requestError) { setError(requestError.message || 'No fue posible cargar la venta.') }
    finally { setLoading(false) }
  }, [id])
  const loadCatalogs = useCallback(async () => {
    if (!canEdit) return
    setCatalogError('')
    try { setClients(await loadAllActive(clientsApi.list, 'clients')) }
    catch (requestError) { setCatalogError(requestError.message || 'No fue posible cargar los clientes.') }
  }, [canEdit])
  const loadMethods = useCallback(async () => {
    if (!canEdit) return
    setPaymentMethodError('')
    try { const response = await salesApi.getPaymentMethods(); setPaymentMethods(response?.data?.payment_methods ?? []) }
    catch (requestError) { setPaymentMethodError(requestError.message || 'No fue posible cargar los métodos de pago.') }
  }, [canEdit])
  useEffect(() => { loadSale() }, [loadSale])
  useEffect(() => { loadCatalogs() }, [loadCatalogs, id])
  useEffect(() => { loadMethods() }, [loadMethods])
  useEffect(() => { if (!feedback) return undefined; const timer = window.setTimeout(() => setFeedback(''), 4500); return () => window.clearTimeout(timer) }, [feedback])

  const closeEditor = () => { setEditor(null); setMutationError(null) }
  const applyMutation = async (operation, successMessage, errorTitle) => {
    setSaving(true); setMutationError(null)
    try { const response = await operation(); setSale(response.data.sale); setFeedback(successMessage); return true }
    catch (requestError) { setMutationError(createActionError(requestError, errorTitle)); return false }
    finally { setSaving(false) }
  }
  const saveHeader = async (payload) => { if (await applyMutation(() => salesApi.update(id, payload), 'Encabezado actualizado correctamente.', 'No se pudieron guardar los cambios')) closeEditor() }
  const saveItem = async (payload) => { const operation = editor.item ? () => salesApi.updateItem(id, editor.item.id_detalle_venta, payload) : () => salesApi.addItem(id, payload); if (await applyMutation(operation, `Línea ${editor.item ? 'actualizada' : 'agregada'} correctamente.`, editor.item ? 'No se pudieron guardar los cambios' : 'No se pudo agregar el producto')) closeEditor() }
  const confirmSale = async (payments) => { if (!sale.items?.length) { setConfirming(false); setMutationError({ title: 'No se pudo confirmar la venta', message: 'Debe agregar al menos un producto antes de confirmar.' }); return } if (await applyMutation(() => salesApi.confirm(id, payments), 'Venta confirmada y facturada correctamente.', 'No se pudo confirmar la venta')) { setConfirming(false); await loadCatalogs() } }
  const cancelSale = async (reason) => { if (await applyMutation(() => salesApi.cancel(id, reason), 'Venta anulada correctamente.', 'No se pudo anular la venta')) { setCancelling(false); await loadCatalogs() } }
  const removeItem = async () => { if (await applyMutation(() => salesApi.removeItem(id, removingItem.id_detalle_venta), 'Producto retirado de la venta.', 'No se pudo retirar el producto')) setRemovingItem(null) }

  if (loading) return <LoadingState message="Cargando detalle de venta…" />
  if (error || !sale) return <ErrorState title="No se pudo cargar la venta" message={error} actionLabel="Reintentar" onAction={loadSale} />
  const isPreparation = sale.estado === 'preparacion'
  const seller = [sale.usuario?.nombre, sale.usuario?.apellido].filter(Boolean).join(' ') || sale.usuario?.nombre_usuario

  return <div className="page-stack sale-detail-page">
    <PageHeader eyebrow="VENTAS / DETALLE" title={sale.numero_venta} description={`Registrada por ${seller || 'usuario'}`} action={<StatusBadge status={sale.estado} />} />
    {feedback && <div className="inline-alert inline-alert--success" role="status">{feedback}</div>}
    {catalogError && <div className="inline-alert inline-alert--error" role="alert">{catalogError} <button className="link-button" type="button" onClick={loadCatalogs}>Reintentar</button></div>}
    {paymentMethodError && isPreparation && <div className="inline-alert inline-alert--error" role="alert">{paymentMethodError} <button className="link-button" type="button" onClick={loadMethods}>Reintentar</button></div>}
    <section className="sale-card"><div className="section-heading"><div><span className="eyebrow">ENCABEZADO</span><h2>Información de venta</h2></div>{isPreparation && canEdit && <button className="button button--secondary" type="button" disabled={Boolean(catalogError)} onClick={() => setEditor({ type: 'header' })}>Editar encabezado</button>}</div><dl className="purchase-metadata"><div><dt>Cliente</dt><dd>{sale.cliente?.nombre}</dd></div><div><dt>Factura</dt><dd>{sale.numero_factura || 'Pendiente'}</dd></div><div><dt>Fecha</dt><dd>{formatDateTime(sale.fecha_venta)}</dd></div><div><dt>Vendedor</dt><dd>{seller}</dd></div><div><dt>Estado</dt><dd><StatusBadge status={sale.estado} /></dd></div><div><dt>Caja histórica</dt><dd>{sale.caja?.id_caja ? `Caja #${sale.caja.id_caja}` : '—'}</dd></div>{sale.estado === 'anulada' && <><div className="metadata-span-2"><dt>Motivo de anulación</dt><dd>{sale.motivo_anulacion}</dd></div><div><dt>Anulada por</dt><dd>{sale.anulada_por || '—'}</dd></div><div><dt>Fecha de anulación</dt><dd>{formatDateTime(sale.anulada_en)}</dd></div></>}</dl></section>
    <section className="sale-card sale-section"><div className="section-heading"><div><span className="eyebrow">DETALLE</span><h2>Productos</h2></div>{isPreparation && canEdit && <button className="button button--primary" type="button" onClick={() => setEditor({ type: 'item', item: null })}>Agregar producto</button>}</div>{sale.items?.length ? <div className="table-container"><table className="data-table sale-items-table"><thead><tr><th>Producto</th><th>Unidad</th><th>Cantidad</th><th>Precio</th><th>Descuento</th><th>Impuesto</th><th>Subtotal</th>{isPreparation && canEdit && <th>Acciones</th>}</tr></thead><tbody>{sale.items.map((item) => <tr key={item.id_detalle_venta}><td><strong>{item.producto.nombre}</strong><small className="table-secondary">{item.producto.codigo}</small></td><td>{item.unidad.abreviatura || item.unidad.nombre}</td><td>{formatQuantity(item.cantidad, item.unidad.permite_decimales)}</td><td>{formatMoney(item.precio_unitario)}</td><td>{formatMoney(item.descuento)}</td><td>{formatMoney(item.impuesto)}</td><td>{formatMoney(item.subtotal)}</td>{isPreparation && canEdit && <td><div className="table-actions"><button className="button button--secondary button--compact" type="button" onClick={() => setEditor({ type: 'item', item })}>Editar</button><button className="button button--danger button--compact" type="button" onClick={() => setRemovingItem(item)}>Retirar</button></div></td>}</tr>)}</tbody></table></div> : <EmptyState message="Esta preparación todavía no contiene productos." />}</section>
    {sale.payments?.length > 0 && <section className="sale-card sale-section"><div className="section-heading"><div><span className="eyebrow">COBRO</span><h2>Pagos</h2></div></div><div className="table-container"><table className="data-table sale-payments-table"><thead><tr><th>Método</th><th>Monto</th><th>Referencia</th><th>Recibido</th><th>Cambio</th><th>Fecha</th></tr></thead><tbody>{sale.payments.map((payment) => <tr key={payment.id_pago}><td>{payment.method.nombre}</td><td>{formatMoney(payment.monto)}</td><td>{payment.referencia || '—'}</td><td>{payment.method.es_efectivo ? formatMoney(payment.monto_recibido) : '—'}</td><td>{payment.method.es_efectivo ? formatMoney(payment.cambio) : '—'}</td><td>{formatDateTime(payment.creado_en)}</td></tr>)}</tbody></table></div></section>}
    {sale.estado === 'completada' && <SaleReceipt sale={sale} />}
    <div className="purchase-summary-row">
      <section className="purchase-actions-card"><h2>Acciones</h2>{(sale.estado === 'completada' || sale.estado === 'anulada') && <p className="traceability-copy">Las ventas completadas se conservan como parte del historial y la trazabilidad.</p>}{sale.estado === 'anulada' && <p>Esta venta está disponible únicamente para consulta.</p>}{sale.estado === 'completada' && !canCancel && <p>Venta completada. No tienes permiso para anularla.</p>}{isPreparation && !canEdit && <p>Preparación disponible únicamente para consulta.</p>}<div className="purchase-main-actions"><Link className="button button--secondary" to="/sales">← Volver a ventas</Link><div className="purchase-state-actions">{isPreparation && canEdit && <button className="button button--success" type="button" disabled={Number(sale.total) !== 0 && (Boolean(paymentMethodError) || !paymentMethods.length)} onClick={() => sale.items?.length ? setConfirming(true) : setMutationError({ title: 'No se pudo confirmar la venta', message: 'Debe agregar al menos un producto antes de confirmar.' })}>Confirmar venta</button>}{sale.estado === 'completada' && <><Link className="button button--primary" to="/sales">Nueva venta</Link><button className="button button--success" type="button" onClick={() => window.print()}>Imprimir comprobante</button></>}{sale.estado === 'completada' && canCancel && <button className="button button--danger" type="button" onClick={() => setCancelling(true)}>Anular venta</button>}</div></div></section>
      <section className="purchase-totals"><div><span>Subtotal</span><strong>{formatMoney(sale.subtotal)}</strong></div><div><span>Descuento</span><strong>− {formatMoney(sale.descuento)}</strong></div><div className="purchase-tax-row"><span>Impuesto<small>Calculado automáticamente según la configuración fiscal vigente.</small></span><strong>{formatMoney(sale.impuesto)}</strong></div><div className="purchase-total-main"><span>Total</span><strong>{formatMoney(sale.total)}</strong></div></section>
    </div>
    {editor?.type === 'header' && <Modal title="Editar encabezado" onClose={closeEditor} busy={saving} wide><SaleHeaderForm sale={sale} clients={clients} busy={saving} onCancel={closeEditor} onSubmit={saveHeader} /></Modal>}
    {editor?.type === 'item' && <Modal title={editor.item ? 'Editar línea' : 'Agregar producto'} onClose={closeEditor} busy={saving} wide><SaleItemForm key={editor.item?.id_detalle_venta ?? 'new'} item={editor.item} discountPolicy={sale.discount_policy} busy={saving} onCancel={closeEditor} onSubmit={saveItem} /></Modal>}
    {confirming && <Modal title="Confirmar venta y registrar pagos" onClose={() => { setConfirming(false); setMutationError(null) }} busy={saving} wide><PaymentForm total={sale.total} methods={paymentMethods} busy={saving} onCancel={() => { setConfirming(false); setMutationError(null) }} onSubmit={confirmSale} /></Modal>}
    {removingItem && <ConfirmDialog title="Retirar producto de la venta" message={`¿Confirmas que deseas retirar “${removingItem.producto.nombre}” de la preparación?`} confirmLabel="Retirar producto" busy={saving} onCancel={() => { setRemovingItem(null); setMutationError(null) }} onConfirm={removeItem} />}
    {cancelling && <Modal title="Anular venta" onClose={() => { setCancelling(false); setMutationError(null) }} busy={saving}><SaleCancellationForm busy={saving} onCancel={() => { setCancelling(false); setMutationError(null) }} onSubmit={cancelSale} /></Modal>}
    <ErrorDialog open={Boolean(mutationError)} title={mutationError?.title} message={mutationError?.message} onClose={() => setMutationError(null)} />
  </div>
}
