import { useState } from 'react'
import { FormField } from '../CatalogUi'
import { formatMoney } from '../../utils/formatters'

function moneyError(value, label, positive = false) {
  const text = String(value).trim()
  if (!text) return `${label} es obligatorio.`
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return `${label} admite máximo 2 decimales.`
  const amount = Number(text)
  if (positive ? amount <= 0 : amount < 0) return `${label} debe ser ${positive ? 'mayor que cero' : 'mayor o igual que cero'}.`
  if (amount > 9999999999.99) return `${label} está fuera del rango permitido.`
  return ''
}

function CashAmountForm({ mode, expected = 0, busy, onCancel, onSubmit }) {
  const isOpen = mode === 'open'
  const [amount, setAmount] = useState('')
  const [observation, setObservation] = useState('')
  const [errors, setErrors] = useState({})
  const difference = Number(amount || 0) - Number(expected || 0)
  const submit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    const amountError = moneyError(amount, isOpen ? 'El monto de apertura' : 'El monto contado')
    if (amountError) nextErrors.amount = amountError
    if (observation.trim().length > 500) nextErrors.observation = 'Máximo 500 caracteres.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit({ [isOpen ? 'monto_apertura' : 'monto_contado']: Number(amount), observacion: observation.trim() || null })
  }
  return <form className="cash-form" onSubmit={submit} noValidate>
    {!isOpen && <div className="cash-close-preview"><span>Monto esperado</span><strong>{formatMoney(expected)}</strong><span>Diferencia estimada</span><strong className={difference > 0 ? 'cash-positive' : difference < 0 ? 'cash-negative' : ''}>{formatMoney(difference)}</strong></div>}
    <FormField label={isOpen ? 'Monto de apertura' : 'Monto contado'} name="cash_amount" error={errors.amount} help="Monto no negativo · máximo 2 decimales"><input id="cash_amount" className="form-control" type="number" min="0" step="0.01" value={amount} disabled={busy} onChange={(event) => setAmount(event.target.value)} /></FormField>
    <FormField label="Observación" name="cash_observation" error={errors.observation} help="Opcional · máximo 500 caracteres"><textarea id="cash_observation" className="form-control form-control--textarea" maxLength="500" value={observation} disabled={busy} onChange={(event) => setObservation(event.target.value)} /></FormField>
    <div className="modal-footer cash-form-actions"><button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button><button className={`button button--${isOpen ? 'primary' : 'danger'}`} type="submit" disabled={busy}>{busy ? 'Guardando…' : isOpen ? 'Abrir caja' : 'Cerrar caja'}</button></div>
  </form>
}

export function OpenCashForm(props) { return <CashAmountForm {...props} mode="open" /> }
export function CloseCashForm(props) { return <CashAmountForm {...props} mode="close" /> }

export function CashMovementForm({ type, busy, onCancel, onSubmit }) {
  const isIncome = type === 'ingreso'
  const [amount, setAmount] = useState('')
  const [concept, setConcept] = useState('')
  const [errors, setErrors] = useState({})
  const submit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    const amountError = moneyError(amount, 'El monto', true)
    if (amountError) nextErrors.amount = amountError
    if (!concept.trim()) nextErrors.concept = 'El concepto es obligatorio.'
    else if (concept.trim().length > 255) nextErrors.concept = 'Máximo 255 caracteres.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit({ tipo_movimiento: type, monto: Number(amount), concepto: concept.trim() })
  }
  return <form className="cash-form" onSubmit={submit} noValidate>
    <FormField label="Monto" name="movement_amount" error={errors.amount} help="Mayor que cero · máximo 2 decimales"><input id="movement_amount" className="form-control" type="number" min="0.01" step="0.01" value={amount} disabled={busy} onChange={(event) => setAmount(event.target.value)} /></FormField>
    <FormField label="Concepto" name="movement_concept" error={errors.concept} help={`Ejemplo: ${isIncome ? 'Fondo adicional' : 'Compra menor'}`}><input id="movement_concept" className="form-control" maxLength="255" value={concept} disabled={busy} onChange={(event) => setConcept(event.target.value)} /></FormField>
    <div className="modal-footer cash-form-actions"><button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button><button className={`button button--${isIncome ? 'success' : 'danger'}`} type="submit" disabled={busy}>{busy ? 'Registrando…' : `Registrar ${type}`}</button></div>
  </form>
}
