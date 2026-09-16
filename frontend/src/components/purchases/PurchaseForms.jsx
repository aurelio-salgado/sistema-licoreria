import { useMemo, useState } from 'react'
import { FormField } from '../CatalogUi'
import { filterInventoryByProductName } from '../../utils/inventorySearch'

function toDateTimeLocal(value) {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(String(value ?? ''))
  if (match) return `${match[1]}T${match[2]}`
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 19)
}

function toApiDateTime(value) {
  const normalized = value.replace('T', ' ')
  return normalized.length === 16 ? `${normalized}:00` : normalized
}

export function PurchaseHeaderForm({ purchase, suppliers, busy, onCancel, onSubmit }) {
  const [values, setValues] = useState({
    numero_compra: purchase?.numero_compra ?? '',
    numero_documento_proveedor: purchase?.numero_documento_proveedor ?? '',
    id_proveedor: purchase?.proveedor?.id_proveedor ? String(purchase.proveedor.id_proveedor) : '',
    fecha_compra: toDateTimeLocal(purchase?.fecha_compra),
    observacion: purchase?.observacion ?? '',
  })
  const [errors, setErrors] = useState({})
  const setValue = (field, value) => setValues((current) => ({ ...current, [field]: value }))
  const submit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!values.numero_compra.trim()) nextErrors.numero_compra = 'El número de compra es obligatorio.'
    if (values.numero_compra.trim().length > 50) nextErrors.numero_compra = 'Máximo 50 caracteres.'
    if (values.numero_documento_proveedor.trim().length > 80) nextErrors.numero_documento_proveedor = 'Máximo 80 caracteres.'
    if (!/^[1-9]\d*$/.test(values.id_proveedor)) nextErrors.id_proveedor = 'Selecciona un proveedor.'
    if (!values.fecha_compra) nextErrors.fecha_compra = 'La fecha es obligatoria.'
    if (new TextEncoder().encode(values.observacion.trim()).length > 65535) nextErrors.observacion = 'La observación supera el tamaño permitido.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit({
      numero_compra: values.numero_compra.trim(),
      numero_documento_proveedor: values.numero_documento_proveedor.trim() || null,
      id_proveedor: Number(values.id_proveedor),
      fecha_compra: toApiDateTime(values.fecha_compra),
      observacion: values.observacion.trim() || null,
    })
  }

  return <form className="purchase-form" onSubmit={submit} noValidate>
    <div className="purchase-form-grid">
      <FormField label="Número de compra" name="numero_compra" error={errors.numero_compra} help="Obligatorio · máximo 50 caracteres"><input id="numero_compra" className="form-control" maxLength="50" value={values.numero_compra} disabled={busy} onChange={(event) => setValue('numero_compra', event.target.value)} /></FormField>
      <FormField label="Documento del proveedor" name="numero_documento_proveedor" error={errors.numero_documento_proveedor} help="Opcional · máximo 80 caracteres"><input id="numero_documento_proveedor" className="form-control" maxLength="80" value={values.numero_documento_proveedor} disabled={busy} onChange={(event) => setValue('numero_documento_proveedor', event.target.value)} /></FormField>
      <FormField label="Proveedor" name="id_proveedor" error={errors.id_proveedor}><select id="id_proveedor" className="form-control" value={values.id_proveedor} disabled={busy} onChange={(event) => setValue('id_proveedor', event.target.value)}><option value="">Selecciona un proveedor</option>{suppliers.map((supplier) => <option key={supplier.id_proveedor} value={supplier.id_proveedor}>{supplier.nombre}</option>)}</select></FormField>
      <FormField label="Fecha de compra" name="fecha_compra" error={errors.fecha_compra}><input id="fecha_compra" className="form-control" type="datetime-local" step="1" value={values.fecha_compra} disabled={busy} onChange={(event) => setValue('fecha_compra', event.target.value)} /></FormField>
      <div className="purchase-form-span-2"><FormField label="Observación" name="observacion" error={errors.observacion} help="Opcional"><textarea id="observacion" className="form-control form-control--textarea" value={values.observacion} disabled={busy} onChange={(event) => setValue('observacion', event.target.value)} /></FormField></div>
    </div>
    <div className="modal-footer purchase-form-actions"><button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar borrador'}</button></div>
  </form>
}

function decimalError(value, label, scale, positive = false) {
  const text = String(value).trim()
  if (!text) return `${label} es obligatorio.`
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${scale}})?$`).test(text)) return `${label} admite máximo ${scale} decimales.`
  const number = Number(text)
  if (positive ? number <= 0 : number < 0) return `${label} debe ser ${positive ? 'mayor que cero' : 'no negativo'}.`
  const maximum = scale === 3 ? 999999999.999 : 9999999999.99
  return number > maximum ? `${label} está fuera del rango permitido.` : ''
}

export function PurchaseItemForm({ item, products, busy, onCancel, onSubmit }) {
  const [values, setValues] = useState({ id_producto: item?.producto?.id_producto ? String(item.producto.id_producto) : '', cantidad: item?.cantidad ?? '', costo_unitario: item?.costo_unitario ?? '', descuento: item?.descuento ?? '0' })
  const [errors, setErrors] = useState({})
  const [productSearch, setProductSearch] = useState('')
  const filteredProducts = useMemo(
    () => filterInventoryByProductName(products, productSearch),
    [productSearch, products],
  )
  const selectedProduct = products.find((product) => String(product.id_producto) === values.id_producto)
  const setValue = (field, value) => setValues((current) => ({ ...current, [field]: value }))
  const submit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!/^[1-9]\d*$/.test(values.id_producto)) nextErrors.id_producto = 'Selecciona un producto.'
    const quantityError = decimalError(values.cantidad, 'La cantidad', 3, true)
    const costError = decimalError(values.costo_unitario, 'El costo unitario', 2)
    const discountError = decimalError(values.descuento || '0', 'El descuento', 2)
    if (quantityError) nextErrors.cantidad = quantityError
    if (costError) nextErrors.costo_unitario = costError
    if (discountError) nextErrors.descuento = discountError
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit({ id_producto: Number(values.id_producto), cantidad: Number(values.cantidad), costo_unitario: Number(values.costo_unitario), descuento: Number(values.descuento || 0) })
  }

  return <form className="purchase-form" onSubmit={submit} noValidate>
    <div className="purchase-form-grid">
      <div className="purchase-form-span-2"><FormField label="Buscar producto" name="purchase-product-search"><input id="purchase-product-search" className="form-control" type="search" placeholder="Buscar producto por nombre..." value={productSearch} disabled={busy} onChange={(event) => { setProductSearch(event.target.value); setValue('id_producto', '') }} /></FormField></div>
      <div className="purchase-form-span-2"><FormField label="Producto" name="id_producto" error={errors.id_producto} help={selectedProduct ? `Unidad: ${selectedProduct.unidad?.nombre} (${selectedProduct.unidad?.abreviatura}) · permite decimales: ${selectedProduct.unidad?.permite_decimales ? 'Sí' : 'No'}` : productSearch.trim() && !filteredProducts.length ? 'No se encontraron productos.' : undefined}><select id="id_producto" className="form-control" value={values.id_producto} disabled={busy} onChange={(event) => setValue('id_producto', event.target.value)}><option value="">Selecciona un producto</option>{filteredProducts.map((product) => <option key={product.id_producto} value={product.id_producto}>{product.codigo} · {product.nombre}</option>)}</select></FormField></div>
      <FormField label="Cantidad" name="cantidad" error={errors.cantidad} help="Mayor que cero · máximo 3 decimales"><input id="cantidad" className="form-control" type="number" min="0.001" step={selectedProduct?.unidad?.permite_decimales === false ? '1' : '0.001'} value={values.cantidad} disabled={busy} onChange={(event) => setValue('cantidad', event.target.value)} /></FormField>
      <FormField label="Costo unitario" name="costo_unitario" error={errors.costo_unitario} help="Importe no negativo"><input id="costo_unitario" className="form-control" type="number" min="0" step="0.01" value={values.costo_unitario} disabled={busy} onChange={(event) => setValue('costo_unitario', event.target.value)} /></FormField>
      <FormField label="Descuento" name="descuento" error={errors.descuento} help="Importe monetario, no porcentaje"><input id="descuento" className="form-control" type="number" min="0" step="0.01" value={values.descuento} disabled={busy} onChange={(event) => setValue('descuento', event.target.value)} /></FormField>
    </div>
    <div className="modal-footer purchase-form-actions"><button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar línea'}</button></div>
  </form>
}

export function CancellationForm({ busy, onCancel, onSubmit }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const submit = (event) => { event.preventDefault(); if (!reason.trim()) { setError('El motivo de anulación es obligatorio.'); return } onSubmit(reason.trim()) }
  return <form className="purchase-form" onSubmit={submit} noValidate><p className="warning-copy">Al anular la compra se revertirá la existencia recibida. El costo promedio actual no se modifica.</p><FormField label="Motivo" name="motivo" error={error}><textarea id="motivo" className="form-control form-control--textarea" value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} /></FormField><div className="modal-footer purchase-form-actions"><button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button><button className="button button--danger" type="submit" disabled={busy}>{busy ? 'Anulando…' : 'Anular compra'}</button></div></form>
}
