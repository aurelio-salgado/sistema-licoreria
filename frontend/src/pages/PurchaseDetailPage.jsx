import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { productsApi } from '../api/products'
import { purchasesApi } from '../api/purchases'
import { suppliersApi } from '../api/suppliers'
import { useAuth } from '../auth/useAuth'
import { ConfirmDialog, EmptyState, ErrorDialog, Modal, PageHeader, StatusBadge } from '../components/CatalogUi'
import { ErrorState, LoadingState } from '../components/FeedbackStates'
import { CancellationForm, PurchaseHeaderForm, PurchaseItemForm } from '../components/purchases/PurchaseForms'
import { formatDateTime, formatMoney, formatQuantity } from '../utils/formatters'
import { createActionError } from '../utils/actionErrors'

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

export function PurchaseDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const { hasPermission } = useAuth()
  const [purchase, setPurchase] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [feedback, setFeedback] = useState(location.state?.feedback ?? '')
  const [editor, setEditor] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [removingItem, setRemovingItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [mutationError, setMutationError] = useState(null)
  const canEdit = hasPermission('compras.crear')
  const canConfirm = hasPermission('compras.confirmar')
  const canCancel = hasPermission('compras.anular')

  const loadPurchase = useCallback(async () => {
    setLoading(true); setError('')
    try { const response = await purchasesApi.getById(id); setPurchase(response?.data?.purchase ?? null) }
    catch (requestError) { setError(requestError.message || 'No fue posible cargar la compra.') }
    finally { setLoading(false) }
  }, [id])
  const loadCatalogs = useCallback(async () => {
    setCatalogError('')
    try {
      const [supplierRows, productRows] = await Promise.all([loadAllActive(suppliersApi.list, 'suppliers'), loadAllActive(productsApi.list, 'products')])
      setSuppliers(supplierRows); setProducts(productRows)
    } catch (requestError) { setCatalogError(requestError.message || 'No fue posible cargar proveedores o productos.') }
  }, [])
  useEffect(() => { loadPurchase() }, [loadPurchase])
  useEffect(() => { loadCatalogs() }, [loadCatalogs])
  useEffect(() => { if (!feedback) return undefined; const timer = window.setTimeout(() => setFeedback(''), 4500); return () => window.clearTimeout(timer) }, [feedback])

  const closeEditor = () => { setEditor(null); setMutationError(null) }
  const applyMutation = async (operation, successMessage, errorTitle) => {
    setSaving(true); setMutationError(null)
    try { const response = await operation(); setPurchase(response.data.purchase); setFeedback(successMessage); return true }
    catch (requestError) { setMutationError(createActionError(requestError, errorTitle)); return false }
    finally { setSaving(false) }
  }
  const saveHeader = async (payload) => { if (await applyMutation(() => purchasesApi.update(id, payload), 'Encabezado actualizado correctamente.', 'No se pudieron guardar los cambios')) closeEditor() }
  const saveItem = async (payload) => { const operation = editor.item ? () => purchasesApi.updateItem(id, editor.item.id_detalle_compra, payload) : () => purchasesApi.addItem(id, payload); if (await applyMutation(operation, `Línea ${editor.item ? 'actualizada' : 'agregada'} correctamente.`, editor.item ? 'No se pudieron guardar los cambios' : 'No se pudo agregar el producto')) closeEditor() }
  const confirmPurchase = async () => { if (!purchase.items?.length) { setConfirming(false); setMutationError({ title: 'No se pudo confirmar la compra', message: 'Debe agregar al menos un producto antes de confirmar.' }); return } if (await applyMutation(() => purchasesApi.confirm(id), 'Compra confirmada. El inventario fue actualizado.', 'No se pudo confirmar la compra')) setConfirming(false) }
  const cancelPurchase = async (reason) => { if (await applyMutation(() => purchasesApi.cancel(id, reason), 'Compra anulada correctamente.', 'No se pudo anular la compra')) setCancelling(false) }
  const removeItem = async () => { if (await applyMutation(() => purchasesApi.removeItem(id, removingItem.id_detalle_compra), 'Producto retirado de la compra.', 'No se pudo retirar el producto')) setRemovingItem(null) }

  if (loading) return <LoadingState message="Cargando detalle de compra…" />
  if (error || !purchase) return <ErrorState title="No se pudo cargar la compra" message={error} actionLabel="Reintentar" onAction={loadPurchase} />
  const isDraft = purchase.estado === 'borrador'
  const userName = [purchase.usuario?.nombre, purchase.usuario?.apellido].filter(Boolean).join(' ') || purchase.usuario?.nombre_usuario

  return <div className="page-stack purchase-detail-page">
    <PageHeader eyebrow="COMPRAS / DETALLE" title={purchase.numero_compra} description={`Registrada por ${userName || 'usuario'}`} action={<StatusBadge status={purchase.estado} />} />
    {feedback && <div className="inline-alert inline-alert--success" role="status">{feedback}</div>}
    {catalogError && <div className="inline-alert inline-alert--error" role="alert">{catalogError} <button className="link-button" type="button" onClick={loadCatalogs}>Reintentar</button></div>}
    <section className="purchase-header-card"><div className="section-heading"><div><span className="eyebrow">ENCABEZADO</span><h2>Información de compra</h2></div>{isDraft && canEdit && <button className="button button--secondary" type="button" disabled={Boolean(catalogError)} onClick={() => setEditor({ type: 'header' })}>Editar encabezado</button>}</div><dl className="purchase-metadata"><div><dt>Proveedor</dt><dd>{purchase.proveedor?.nombre}</dd></div><div><dt>Documento proveedor</dt><dd>{purchase.numero_documento_proveedor || '—'}</dd></div><div><dt>Fecha</dt><dd>{formatDateTime(purchase.fecha_compra)}</dd></div><div><dt>Responsable</dt><dd>{userName}</dd></div><div className="metadata-span-2"><dt>Observación</dt><dd className="pre-wrap">{purchase.observacion || 'Sin observación'}</dd></div></dl></section>
    <section className="purchase-items-card"><div className="section-heading"><div><span className="eyebrow">DETALLE</span><h2>Productos</h2></div>{isDraft && canEdit && <button className="button button--primary" type="button" disabled={Boolean(catalogError)} onClick={() => setEditor({ type: 'item', item: null })}>Agregar producto</button>}</div>{purchase.items?.length ? <div className="table-container"><table className="data-table purchase-items-table"><thead><tr><th>Producto</th><th>Unidad</th><th>Cantidad</th><th>Costo unitario</th><th>Descuento</th><th>Impuesto</th><th>Subtotal</th>{isDraft && canEdit && <th>Acciones</th>}</tr></thead><tbody>{purchase.items.map((item) => <tr key={item.id_detalle_compra}><td><strong>{item.producto.nombre}</strong><small className="table-secondary">{item.producto.codigo}</small></td><td>{item.unidad.abreviatura || item.unidad.nombre}</td><td>{formatQuantity(item.cantidad, item.unidad.permite_decimales)}</td><td>{formatMoney(item.costo_unitario)}</td><td>{formatMoney(item.descuento)}</td><td>{formatMoney(item.impuesto)}</td><td>{formatMoney(item.subtotal)}</td>{isDraft && canEdit && <td><div className="table-actions"><button className="button button--secondary button--compact" type="button" onClick={() => setEditor({ type: 'item', item })}>Editar</button><button className="button button--danger button--compact" type="button" onClick={() => setRemovingItem(item)}>Retirar</button></div></td>}</tr>)}</tbody></table></div> : <EmptyState message="Este borrador todavía no contiene productos." />}</section>
    <div className="purchase-summary-row">
      <section className="purchase-actions-card">
        <h2>Acciones</h2>
        {(purchase.estado === 'recibida' || purchase.estado === 'anulada') && (
          <p className="traceability-copy">
            Los documentos confirmados se conservan como parte del historial y la trazabilidad.
          </p>
        )}
        {purchase.estado === 'anulada' && <p>Esta compra está disponible únicamente para consulta.</p>}
        {purchase.estado === 'recibida' && !canCancel && <p>Compra recibida. No tienes permiso para anularla.</p>}
        {isDraft && !canConfirm && <p>Borrador disponible para consulta{canEdit ? ' y edición' : ''}.</p>}
        <div className="purchase-main-actions">
          <Link className="button button--secondary" to="/purchases">← Volver a compras</Link>
          <div className="purchase-state-actions">
            {isDraft && canConfirm && <button className="button button--success" type="button" onClick={() => setConfirming(true)}>Confirmar compra</button>}
            {purchase.estado === 'recibida' && canCancel && <button className="button button--danger" type="button" onClick={() => setCancelling(true)}>Anular compra</button>}
          </div>
        </div>
      </section>
      <section className="purchase-totals">
        <div><span>Subtotal</span><strong>{formatMoney(purchase.subtotal)}</strong></div>
        <div><span>Descuento</span><strong>− {formatMoney(purchase.descuento)}</strong></div>
        <div className="purchase-tax-row">
          <span>Impuesto<small>Calculado automáticamente según la configuración fiscal vigente.</small></span>
          <strong>{formatMoney(purchase.impuesto)}</strong>
        </div>
        <div className="purchase-total-main"><span>Total</span><strong>{formatMoney(purchase.total)}</strong></div>
      </section>
    </div>
    {editor?.type === 'header' && <Modal title="Editar encabezado" onClose={closeEditor} busy={saving} wide><PurchaseHeaderForm purchase={purchase} suppliers={suppliers} busy={saving} onCancel={closeEditor} onSubmit={saveHeader} /></Modal>}
    {editor?.type === 'item' && <Modal title={editor.item ? 'Editar línea' : 'Agregar producto'} onClose={closeEditor} busy={saving} wide><PurchaseItemForm key={editor.item?.id_detalle_compra ?? 'new'} item={editor.item} products={products} busy={saving} onCancel={closeEditor} onSubmit={saveItem} /></Modal>}
    {confirming && <ConfirmDialog title="Confirmar compra" message="Al confirmar la compra se actualizará el inventario y el costo promedio de los productos." confirmLabel="Confirmar compra" tone="success" busy={saving} onCancel={() => { setConfirming(false); setMutationError(null) }} onConfirm={confirmPurchase} />}
    {removingItem && <ConfirmDialog title="Retirar producto de la compra" message={`¿Confirmas que deseas retirar “${removingItem.producto.nombre}” del borrador?`} confirmLabel="Retirar producto" busy={saving} onCancel={() => { setRemovingItem(null); setMutationError(null) }} onConfirm={removeItem} />}
    {cancelling && <Modal title="Anular compra" onClose={() => { setCancelling(false); setMutationError(null) }} busy={saving}><CancellationForm busy={saving} onCancel={() => { setCancelling(false); setMutationError(null) }} onSubmit={cancelPurchase} /></Modal>}
    <ErrorDialog open={Boolean(mutationError)} title={mutationError?.title} message={mutationError?.message} onClose={() => setMutationError(null)} />
  </div>
}
