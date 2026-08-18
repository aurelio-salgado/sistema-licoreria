import { useMemo, useState } from 'react'
import { FormField } from '../CatalogUi'
import { formatInventoryQuantity, quantityWithUnit } from '../../utils/inventory'

const initialValues = { id_producto: '', naturaleza: 'entrada', cantidad: '', motivo: '' }

function validate(values, product) {
  const errors = {}
  if (!product) errors.id_producto = 'Selecciona un producto activo.'
  const quantity = String(values.cantidad).trim()
  if (!quantity) errors.cantidad = 'La cantidad es obligatoria.'
  else if (!/^\d+(?:\.\d{1,3})?$/.test(quantity) || Number(quantity) <= 0) errors.cantidad = 'Ingresa una cantidad mayor que cero con máximo 3 decimales.'
  else if (product && !product.permite_decimales && !/^\d+$/.test(quantity)) errors.cantidad = 'La unidad seleccionada no permite cantidades decimales.'
  else if (Number(quantity) > 999999999.999) errors.cantidad = 'La cantidad está fuera del rango permitido.'
  else if (values.naturaleza === 'salida' && Number(quantity) > Number(product?.existencia ?? 0)) {
    errors.cantidad = `Solo hay ${formatInventoryQuantity(product.existencia, product.permite_decimales)} unidades disponibles.`
  }
  const reason = values.motivo.trim()
  if (!reason) errors.motivo = 'El motivo es obligatorio.'
  else if (reason.length > 500) errors.motivo = 'El motivo no puede superar 500 caracteres.'
  return errors
}

export function AdjustmentForm({ products, busy, onCancel, onSubmit }) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const selectedProduct = useMemo(() => products.find((item) => String(item.id_producto) === values.id_producto), [products, values.id_producto])
  const quantity = Number(values.cantidad)
  const estimated = selectedProduct && Number.isFinite(quantity) && quantity > 0
    ? Number(selectedProduct.existencia) + (values.naturaleza === 'entrada' ? quantity : -quantity)
    : null
  const setValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: '' }))
  }
  const submit = (event) => {
    event.preventDefault()
    const nextErrors = validate(values, selectedProduct)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit({ id_producto: Number(values.id_producto), naturaleza: values.naturaleza, cantidad: Number(values.cantidad), motivo: values.motivo.trim() })
  }

  return (
    <form className="adjustment-form" onSubmit={submit} noValidate>
      <FormField label="Producto" name="adjustment-product" error={errors.id_producto}>
        <select id="adjustment-product" className="form-control" value={values.id_producto} disabled={busy} onChange={(event) => setValue('id_producto', event.target.value)}>
          <option value="">Selecciona un producto</option>
          {products.map((item) => <option key={item.id_producto} value={item.id_producto}>{item.codigo} · {item.nombre}</option>)}
        </select>
      </FormField>
      {selectedProduct && <div className="adjustment-stock-summary"><div><span>Existencia actual</span><strong>{quantityWithUnit(selectedProduct.existencia, selectedProduct)}</strong></div><div><span>Existencia mínima</span><strong>{quantityWithUnit(selectedProduct.existencia_minima, selectedProduct)}</strong></div><div><span>Unidad</span><strong>{selectedProduct.unidad_nombre}</strong></div></div>}
      <div className="adjustment-form-grid">
        <FormField label="Naturaleza" name="adjustment-nature">
          <select id="adjustment-nature" className="form-control" value={values.naturaleza} disabled={busy} onChange={(event) => setValue('naturaleza', event.target.value)}><option value="entrada">Entrada</option><option value="salida">Salida</option></select>
        </FormField>
        <FormField label="Cantidad" name="adjustment-quantity" error={errors.cantidad} help={selectedProduct?.permite_decimales ? 'Admite hasta 3 decimales.' : selectedProduct ? 'Esta unidad requiere cantidades enteras.' : 'Selecciona primero un producto.'}>
          <input id="adjustment-quantity" className="form-control" type="number" min="0" max="999999999.999" step={selectedProduct?.permite_decimales ? '0.001' : '1'} value={values.cantidad} disabled={busy} onChange={(event) => setValue('cantidad', event.target.value)} />
        </FormField>
      </div>
      {selectedProduct && estimated !== null && <div className={`adjustment-preview${estimated < 0 ? ' adjustment-preview--danger' : ''}`}><span>Resultado estimado</span><strong>{values.naturaleza === 'entrada' ? '+' : '−'} {formatInventoryQuantity(quantity, selectedProduct.permite_decimales)} → {formatInventoryQuantity(estimated, selectedProduct.permite_decimales)} {selectedProduct.abreviatura}</strong><small>El backend calculará y validará la existencia definitiva.</small></div>}
      <FormField label="Motivo" name="adjustment-reason" error={errors.motivo} help="Obligatorio · máximo 500 caracteres">
        <textarea id="adjustment-reason" className="form-control form-control--textarea" maxLength="500" placeholder="Ej. Corrección por conteo físico" value={values.motivo} disabled={busy} onChange={(event) => setValue('motivo', event.target.value)} />
      </FormField>
      <p className="adjustment-cost-note">Los ajustes modifican existencias, no el costo promedio.</p>
      <div className="modal-footer adjustment-form-actions"><button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Registrar ajuste'}</button></div>
    </form>
  )
}
