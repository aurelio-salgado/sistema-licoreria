import { useState } from 'react'
import { FormField } from '../CatalogUi'
import { formatQuantity } from '../../utils/formatters'

function toDateTimeLocal(value) {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(String(value ?? ''))
  if (match) return `${match[1]}T${match[2]}`
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 19)
}

function toApiDateTime(value) {
  const normalized = value.replace('T', ' ')
  return normalized.length === 16 ? `${normalized}:00` : normalized
}

function decimalError(value, label, scale, positive = false) {
  const text = String(value).trim()
  if (!text) return `${label} es obligatorio.`
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${scale}})?$`).test(text)) return `${label} admite máximo ${scale} decimales.`
  const number = Number(text)
  if (positive ? number <= 0 : number < 0) return `${label} debe ser ${positive ? 'mayor que cero' : 'no negativo'}.`
  return ''
}

export function SaleHeaderForm({ sale, clients, busy, onCancel, onSubmit }) {
  const [values, setValues] = useState({
    numero_venta: sale?.numero_venta ?? '',
    id_cliente: sale?.cliente?.es_consumidor_final ? '' : String(sale?.cliente?.id_cliente ?? ''),
    fecha_venta: toDateTimeLocal(sale?.fecha_venta),
  })
  const [errors, setErrors] = useState({})
  const submit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!values.numero_venta.trim()) nextErrors.numero_venta = 'El número de venta es obligatorio.'
    if (values.numero_venta.trim().length > 50) nextErrors.numero_venta = 'Máximo 50 caracteres.'
    if (!values.fecha_venta) nextErrors.fecha_venta = 'La fecha es obligatoria.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const payload = { numero_venta: values.numero_venta.trim(), fecha_venta: toApiDateTime(values.fecha_venta) }
    if (values.id_cliente) payload.id_cliente = Number(values.id_cliente)
    onSubmit(payload)
  }
  return <form className="sale-form" onSubmit={submit} noValidate>
    <div className="sale-form-grid">
      <FormField label="Número de venta" name="numero_venta" error={errors.numero_venta} help="Obligatorio · máximo 50 caracteres"><input id="numero_venta" className="form-control" maxLength="50" value={values.numero_venta} disabled={busy} onChange={(event) => setValues((current) => ({ ...current, numero_venta: event.target.value }))} /></FormField>
      <FormField label="Fecha de venta" name="fecha_venta" error={errors.fecha_venta}><input id="fecha_venta" className="form-control" type="datetime-local" step="1" value={values.fecha_venta} disabled={busy} onChange={(event) => setValues((current) => ({ ...current, fecha_venta: event.target.value }))} /></FormField>
      <div className="sale-form-span-2"><FormField label="Cliente" name="id_cliente" help="Si no eliges otro cliente, el backend utilizará Consumidor final."><select id="id_cliente" className="form-control" value={values.id_cliente} disabled={busy} onChange={(event) => setValues((current) => ({ ...current, id_cliente: event.target.value }))}><option value="">Consumidor final</option>{clients.filter((client) => !client.es_consumidor_final).map((client) => <option key={client.id_cliente} value={client.id_cliente}>{client.nombre}{client.identificacion ? ` · ${client.identificacion}` : ''}</option>)}</select></FormField></div>
    </div>
    <div className="modal-footer sale-form-actions"><button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar preparación'}</button></div>
  </form>
}

export function SaleItemForm({ item, products, busy, onCancel, onSubmit }) {
  const [values, setValues] = useState({ id_producto: String(item?.producto?.id_producto ?? ''), cantidad: item?.cantidad ?? '', descuento: item?.descuento ?? '0' })
  const [errors, setErrors] = useState({})
  const selected = products.find((product) => String(product.id_producto) === values.id_producto)
  const stock = Number(selected?.existencia)
  const minimumStock = Number(selected?.existencia_minima)
  const unitLabel = selected?.unidad?.abreviatura || selected?.unidad?.nombre || 'unidades'
  const formattedStock = selected && Number.isFinite(stock) ? formatQuantity(stock, selected.unidad?.permite_decimales) : '—'
  const availabilityTone = stock <= 0 ? 'empty' : Number.isFinite(minimumStock) && stock <= minimumStock ? 'low' : 'available'
  const quantityValidation = (value, product = selected) => {
    const quantityError = decimalError(value, 'La cantidad', 3, true)
    if (quantityError) return quantityError
    if (product?.unidad?.permite_decimales === false && !Number.isInteger(Number(value))) return 'La unidad seleccionada requiere una cantidad entera.'
    const available = Number(product?.existencia)
    if (Number.isFinite(available) && available <= 0) return 'Este producto está agotado.'
    if (Number.isFinite(available) && Number(value) > available) {
      const display = formatQuantity(available, product?.unidad?.permite_decimales)
      const unit = product?.unidad?.abreviatura || product?.unidad?.nombre || 'unidades'
      return `Solo hay ${display} ${unit} disponibles.`
    }
    return ''
  }
  const changeProduct = (id) => {
    const product = products.find((candidate) => String(candidate.id_producto) === id)
    setValues((current) => ({ ...current, id_producto: id }))
    setErrors((current) => ({ ...current, id_producto: '', cantidad: values.cantidad ? quantityValidation(values.cantidad, product) : current.cantidad }))
  }
  const changeQuantity = (value) => {
    setValues((current) => ({ ...current, cantidad: value }))
    setErrors((current) => ({ ...current, cantidad: value ? quantityValidation(value) : '' }))
  }
  const submit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!/^[1-9]\d*$/.test(values.id_producto)) nextErrors.id_producto = 'Selecciona un producto.'
    const quantityError = quantityValidation(values.cantidad)
    const discountError = decimalError(values.descuento || '0', 'El descuento', 2)
    if (quantityError) nextErrors.cantidad = quantityError
    if (discountError) nextErrors.descuento = discountError
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit({ id_producto: Number(values.id_producto), cantidad: Number(values.cantidad), descuento: Number(values.descuento || 0) })
  }
  return <form className="sale-form" onSubmit={submit} noValidate>
    <div className="sale-form-grid">
      <div className="sale-form-span-2"><FormField label="Producto" name="sale_id_producto" error={errors.id_producto} help={selected ? `Unidad: ${selected.unidad?.nombre} · ${selected.unidad?.permite_decimales ? 'Admite decimales' : 'Solo cantidades enteras'} · Precio vigente: C$ ${Number(selected.precio_venta).toFixed(2)}` : undefined}><select id="sale_id_producto" className="form-control" value={values.id_producto} disabled={busy} onChange={(event) => changeProduct(event.target.value)}><option value="">Selecciona un producto</option>{products.map((product) => <option key={product.id_producto} value={product.id_producto}>{product.codigo} · {product.nombre}</option>)}</select></FormField></div>
      {selected && <div className={`sale-availability sale-availability--${availabilityTone} sale-form-span-2`} role="status" aria-live="polite"><span>{availabilityTone === 'empty' ? 'Agotado' : 'Disponible en inventario'}</span><strong>{availabilityTone === 'empty' ? `0 ${unitLabel}` : `${formattedStock} ${unitLabel}`}</strong><small>{selected.unidad?.permite_decimales ? 'La unidad permite cantidades decimales.' : 'La unidad admite únicamente cantidades enteras.'}</small></div>}
      <FormField label="Cantidad" name="sale_cantidad" error={errors.cantidad} help={selected?.unidad?.permite_decimales === false ? 'Esta unidad admite únicamente enteros.' : 'Mayor que cero · máximo 3 decimales'}><input id="sale_cantidad" className="form-control" type="number" min={selected?.unidad?.permite_decimales === false ? '1' : '0.001'} max={Number.isFinite(stock) ? stock : undefined} step={selected?.unidad?.permite_decimales === false ? '1' : '0.001'} value={values.cantidad} disabled={busy || availabilityTone === 'empty'} onChange={(event) => changeQuantity(event.target.value)} /></FormField>
      <FormField label="Descuento" name="sale_descuento" error={errors.descuento} help="Importe monetario, no porcentaje"><input id="sale_descuento" className="form-control" type="number" min="0" step="0.01" value={values.descuento} disabled={busy} onChange={(event) => setValues((current) => ({ ...current, descuento: event.target.value }))} /></FormField>
    </div>
    <div className="modal-footer sale-form-actions"><button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button><button className="button button--primary" type="submit" disabled={busy || availabilityTone === 'empty'}>{busy ? 'Guardando…' : 'Guardar línea'}</button></div>
  </form>
}

export function SaleCancellationForm({ busy, onCancel, onSubmit }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const submit = (event) => { event.preventDefault(); const value = reason.trim(); if (!value) return setError('El motivo de anulación es obligatorio.'); if (value.length > 500) return setError('Máximo 500 caracteres.'); onSubmit(value) }
  return <form className="sale-form" onSubmit={submit} noValidate><p className="warning-copy">Al anular la venta se restaurará el inventario. Si existió efectivo, la devolución se registrará en la caja abierta del usuario que realiza la anulación.</p><FormField label="Motivo" name="sale_motivo" error={error} help="Obligatorio · máximo 500 caracteres"><textarea id="sale_motivo" className="form-control form-control--textarea" maxLength="500" value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} /></FormField><div className="modal-footer sale-form-actions"><button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button><button className="button button--danger" type="submit" disabled={busy}>{busy ? 'Anulando…' : 'Anular venta'}</button></div></form>
}
