import { useState } from 'react'
import { FormField } from '../CatalogUi'
import { formatMoney } from '../../utils/formatters'

let paymentRowSequence = 0
const newRow = (methodId = '', amount = '') => ({ key: ++paymentRowSequence, id_metodo_pago: String(methodId), monto: amount, referencia: '', monto_recibido: '' })

export function PaymentForm({ total, methods, busy, onCancel, onSubmit }) {
  const [rows, setRows] = useState(() => [newRow(methods[0]?.id_metodo_pago, total)])
  const [errors, setErrors] = useState({})
  const totalNumber = Number(total || 0)
  const applied = rows.reduce((sum, row) => sum + (Number(row.monto) || 0), 0)
  const pending = totalNumber - applied
  const setRow = (key, field, value) => setRows((current) => current.map((row) => row.key === key ? { ...row, [field]: value } : row))
  const submit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    const usedMethods = new Set()
    rows.forEach((row) => {
      const method = methods.find((candidate) => String(candidate.id_metodo_pago) === row.id_metodo_pago)
      if (!method) nextErrors[`${row.key}-method`] = 'Selecciona un método.'
      else if (usedMethods.has(row.id_metodo_pago)) nextErrors[`${row.key}-method`] = 'No se permite repetir el método.'
      else usedMethods.add(row.id_metodo_pago)
      if (!/^\d+(?:\.\d{1,2})?$/.test(row.monto) || Number(row.monto) <= 0) nextErrors[`${row.key}-amount`] = 'Indica un monto mayor que cero con máximo 2 decimales.'
      if (method?.requiere_referencia && !row.referencia.trim()) nextErrors[`${row.key}-reference`] = 'La referencia es obligatoria.'
      if (row.referencia.trim().length > 120) nextErrors[`${row.key}-reference`] = 'Máximo 120 caracteres.'
      if (method?.es_efectivo && (!/^\d+(?:\.\d{1,2})?$/.test(row.monto_recibido) || Number(row.monto_recibido) < Number(row.monto))) nextErrors[`${row.key}-received`] = 'El monto recibido debe cubrir el efectivo aplicado.'
    })
    if (Math.abs(pending) > 0.005) nextErrors.summary = 'El total aplicado debe coincidir con el total de la venta.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit(rows.map((row) => {
      const method = methods.find((candidate) => String(candidate.id_metodo_pago) === row.id_metodo_pago)
      const payment = { id_metodo_pago: Number(row.id_metodo_pago), monto: Number(row.monto), referencia: row.referencia.trim() || null }
      if (method.es_efectivo) payment.monto_recibido = Number(row.monto_recibido)
      return payment
    }))
  }
  if (totalNumber === 0) return <div className="payment-empty"><p>La venta tiene total cero y debe confirmarse sin pagos.</p><div className="payment-zero-actions"><button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button><button className="button button--success" type="button" disabled={busy} onClick={() => onSubmit([])}>{busy ? 'Confirmando…' : 'Confirmar venta'}</button></div></div>
  if (!methods.length) return <div className="payment-empty" role="status"><p>No hay métodos de pago activos disponibles.</p><button className="button button--secondary" type="button" onClick={onCancel}>Cerrar</button></div>
  return <form className="payment-form" onSubmit={submit} noValidate>
    <div className="payment-summary"><div><span>Total venta</span><strong>{formatMoney(totalNumber)}</strong></div><div><span>Total aplicado</span><strong>{formatMoney(applied)}</strong></div><div className={Math.abs(pending) > 0.005 ? 'payment-pending' : ''}><span>{pending < 0 ? 'Exceso' : 'Pendiente'}</span><strong>{formatMoney(Math.abs(pending))}</strong></div></div>
    {errors.summary && <p className="form-message--error" role="alert">{errors.summary}</p>}
    <div className="payment-rows">{rows.map((row, index) => { const method = methods.find((candidate) => String(candidate.id_metodo_pago) === row.id_metodo_pago); const change = method?.es_efectivo ? Math.max(0, (Number(row.monto_recibido) || 0) - (Number(row.monto) || 0)) : 0; return <fieldset className="payment-row" key={row.key}><legend>Pago {index + 1}</legend><div className="payment-row-grid"><FormField label="Método" name={`method-${row.key}`} error={errors[`${row.key}-method`]}><select id={`method-${row.key}`} className="form-control" value={row.id_metodo_pago} disabled={busy} onChange={(event) => setRow(row.key, 'id_metodo_pago', event.target.value)}><option value="">Selecciona un método</option>{methods.map((candidate) => <option key={candidate.id_metodo_pago} value={candidate.id_metodo_pago}>{candidate.nombre}</option>)}</select></FormField><FormField label="Monto aplicado" name={`amount-${row.key}`} error={errors[`${row.key}-amount`]}><input id={`amount-${row.key}`} className="form-control" type="number" min="0.01" step="0.01" value={row.monto} disabled={busy} onChange={(event) => setRow(row.key, 'monto', event.target.value)} /></FormField>{method?.requiere_referencia && <FormField label="Referencia" name={`reference-${row.key}`} error={errors[`${row.key}-reference`]}><input id={`reference-${row.key}`} className="form-control" maxLength="120" value={row.referencia} disabled={busy} onChange={(event) => setRow(row.key, 'referencia', event.target.value)} /></FormField>}{method?.es_efectivo && <FormField label="Monto recibido" name={`received-${row.key}`} error={errors[`${row.key}-received`]} help={`Cambio estimado: ${formatMoney(change)}`}><input id={`received-${row.key}`} className="form-control" type="number" min="0" step="0.01" value={row.monto_recibido} disabled={busy} onChange={(event) => setRow(row.key, 'monto_recibido', event.target.value)} /></FormField>}</div>{rows.length > 1 && <button className="link-button payment-remove" type="button" disabled={busy} onClick={() => setRows((current) => current.filter((candidate) => candidate.key !== row.key))}>Retirar pago</button>}</fieldset> })}</div>
    <button className="button button--secondary" type="button" disabled={busy || rows.length >= methods.length} onClick={() => setRows((current) => [...current, newRow()])}>Agregar otro método</button>
    <div className="modal-footer payment-form-actions"><button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button><button className="button button--success" type="submit" disabled={busy}>{busy ? 'Confirmando…' : 'Confirmar venta'}</button></div>
  </form>
}
