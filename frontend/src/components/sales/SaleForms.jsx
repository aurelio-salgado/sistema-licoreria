import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FormField } from '../CatalogUi'
import { ProductSearchSelect } from '../products/ProductSearchSelect'
import { formatMoney, formatQuantity } from '../../utils/formatters'
import { calculateDiscountAmount, generateDiscountOptions, resolveDiscountPercent, resolveSaleUnitPrice } from '../../utils/salesDiscount'

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

export function SaleItemForm({ item, discountPolicy, busy, onCancel, onSubmit }) {
  const [values, setValues] = useState({ id_producto: String(item?.producto?.id_producto ?? ''), cantidad: item?.cantidad ?? '', descuento: item?.descuento ?? '0' })
  const [errors, setErrors] = useState({})
  const [selected, setSelected] = useState(null)
  const [selectedPercent, setSelectedPercent] = useState(item ? null : '0.00')
  const decisionInitialized = useRef(!item)
  const unitPrice = resolveSaleUnitPrice(item, selected, values.id_producto)
  const maxPercent = discountPolicy?.max_percent
  const discountOptions = useMemo(() => generateDiscountOptions(maxPercent), [maxPercent])
  const currentSpecial = selectedPercent === 'current'
  const appliedDiscount = currentSpecial ? item?.descuento ?? '0.00' : calculateDiscountAmount(unitPrice, values.cantidad, selectedPercent)
  const stock = Number(selected?.existencia)
  const minimumStock = Number(selected?.existencia_minima)
  const unitLabel = selected?.unidad?.abreviatura || selected?.unidad?.nombre || 'unidades'
  const formattedStock = selected && Number.isFinite(stock) ? formatQuantity(stock, selected.unidad?.permite_decimales) : '—'
  const availabilityTone = stock <= 0 ? 'empty' : Number.isFinite(minimumStock) && stock <= minimumStock ? 'low' : 'available'
  useEffect(() => {
    if (!item || decisionInitialized.current || !selected || !discountOptions.length) return
    if (String(selected.id_producto) !== String(item.producto?.id_producto)) return
    setSelectedPercent(resolveDiscountPercent(item.descuento, unitPrice, values.cantidad, discountOptions))
    decisionInitialized.current = true
  }, [discountOptions, item, selected, unitPrice, values.cantidad])
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
  const changeProduct = useCallback((product) => {
    const id = product ? String(product.id_producto) : ''
    const originalProduct = product && item && String(product.id_producto) === String(item.producto?.id_producto)
    setSelected(product)
    setValues((current) => ({ ...current, id_producto: id }))
    setErrors((current) => ({ ...current, id_producto: '', cantidad: '' }))
    if (originalProduct) { decisionInitialized.current = false; setSelectedPercent(null) }
    else { decisionInitialized.current = Boolean(product); setSelectedPercent(product ? '0.00' : null) }
  }, [item])
  const changeQuantity = (value) => {
    setValues((current) => ({ ...current, cantidad: value }))
    setErrors((current) => ({ ...current, cantidad: value ? quantityValidation(value) : '' }))
  }
  const submit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!/^[1-9]\d*$/.test(values.id_producto)) nextErrors.id_producto = 'Selecciona un producto.'
    const quantityError = quantityValidation(values.cantidad)
    if (quantityError) nextErrors.cantidad = quantityError
    if (!selectedPercent || currentSpecial) nextErrors.descuento = 'Selecciona un porcentaje vigente antes de guardar.'
    if (appliedDiscount === null) nextErrors.descuento = 'No es posible calcular el descuento con los datos actuales.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit({ id_producto: Number(values.id_producto), cantidad: Number(values.cantidad), descuento: Number(appliedDiscount) })
  }
  return <form className="sale-form" onSubmit={submit} noValidate>
    <div className="sale-form-grid">
      <div className="sale-form-span-2"><ProductSearchSelect selectedId={values.id_producto} selectedProduct={selected} busy={busy} onSelect={changeProduct} />{errors.id_producto && <span className="form-message--error">{errors.id_producto}</span>}</div>
      {selected && <div className={`sale-product-summary sale-product-summary--${availabilityTone} sale-form-span-2`} role="status" aria-live="polite"><div><span>Precio</span><strong>{formatMoney(unitPrice)}</strong></div><div><span>Disponible</span><strong>{availabilityTone === 'empty' ? `0 ${unitLabel}` : `${formattedStock} ${unitLabel}`}</strong></div></div>}
      <FormField label="Cantidad" name="sale_cantidad" error={errors.cantidad} help={selected?.unidad?.permite_decimales === false ? 'Esta unidad admite únicamente enteros.' : 'Mayor que cero · máximo 3 decimales'}><input id="sale_cantidad" className="form-control" type="number" min={selected?.unidad?.permite_decimales === false ? '1' : '0.001'} max={Number.isFinite(stock) ? stock : undefined} step={selected?.unidad?.permite_decimales === false ? '1' : '0.001'} value={values.cantidad} disabled={busy || availabilityTone === 'empty'} onChange={(event) => changeQuantity(event.target.value)} /></FormField>
      {currentSpecial && <div className="inline-alert inline-alert--warning sale-form-span-2" role="alert">El descuento almacenado no coincide con una opción permitida por la política vigente. Se conserva visualmente en {formatMoney(item.descuento)}; selecciona un porcentaje vigente antes de guardar.</div>}
      <FormField label="Descuento" name="sale_discount_percent" error={errors.descuento} help={maxPercent === undefined ? 'La política de descuento no está disponible.' : undefined}><select id="sale_discount_percent" className="form-control" value={selectedPercent ?? ''} disabled={busy || !selected || !discountOptions.length} onChange={(event) => { setSelectedPercent(event.target.value); setErrors((current) => ({ ...current, descuento: '' })) }}><option value="" disabled>Selecciona una opción</option>{currentSpecial && <option value="current">Descuento actual: {formatMoney(item.descuento)}</option>}{discountOptions.map((percent) => <option key={percent} value={percent}>{percent === '0.00' ? 'Sin descuento' : `${Number(percent).toLocaleString('es-NI', { maximumFractionDigits: 2 })} %`}</option>)}</select></FormField>
    </div>
    <div className="modal-footer sale-form-actions"><button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button><button className="button button--primary" type="submit" disabled={busy || availabilityTone === 'empty' || !selectedPercent || currentSpecial || appliedDiscount === null}>{busy ? 'Guardando…' : 'Guardar línea'}</button></div>
  </form>
}

export function SaleCancellationForm({ busy, onCancel, onSubmit }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const submit = (event) => { event.preventDefault(); const value = reason.trim(); if (!value) return setError('El motivo de anulación es obligatorio.'); if (value.length > 500) return setError('Máximo 500 caracteres.'); onSubmit(value) }
  return <form className="sale-form" onSubmit={submit} noValidate><p className="warning-copy">Al anular la venta se restaurará el inventario. Si existió efectivo, la devolución se registrará en la caja abierta del usuario que realiza la anulación.</p><FormField label="Motivo" name="sale_motivo" error={error} help="Obligatorio · máximo 500 caracteres"><textarea id="sale_motivo" className="form-control form-control--textarea" maxLength="500" value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} /></FormField><div className="modal-footer sale-form-actions"><button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button><button className="button button--danger" type="submit" disabled={busy}>{busy ? 'Anulando…' : 'Anular venta'}</button></div></form>
}
