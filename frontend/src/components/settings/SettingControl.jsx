import { useEffect, useState } from 'react'

const editableKeys = new Set(['nombre_negocio', 'impuesto_activo', 'tasa_impuesto', 'descuento_maximo', 'control_caja_activo', 'serie_comprobante'])

function validate(key, value) {
  const normalized = String(value ?? '').trim()
  if (key === 'nombre_negocio') {
    if (!normalized) return 'El nombre del negocio es obligatorio.'
    if (normalized.length > 150) return 'No puede superar 150 caracteres.'
  }
  if (key === 'tasa_impuesto' || key === 'descuento_maximo') {
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized) || Number(normalized) < 0 || Number(normalized) > 100) return 'Ingresa un porcentaje entre 0 y 100 con máximo 2 decimales.'
  }
  if (key === 'serie_comprobante') {
    if (!normalized || normalized.length > 20 || !/^[A-Za-z0-9-]+$/.test(normalized)) return 'Usa de 1 a 20 letras, números o guiones.'
  }
  return ''
}

export function SettingControl({ setting, label, help, canEdit, busy, onSave }) {
  const [value, setValue] = useState(setting.valor)
  const [error, setError] = useState('')
  const editable = editableKeys.has(setting.clave)
  useEffect(() => { setValue(setting.valor); setError('') }, [setting.clave, setting.valor])
  const submit = (event) => {
    event.preventDefault()
    const validationError = validate(setting.clave, value)
    setError(validationError)
    if (validationError) return
    const payload = ['tasa_impuesto', 'descuento_maximo'].includes(setting.clave) ? Number(value) : String(value).trim()
    onSave(setting, payload)
  }

  if (!editable) return <article className="setting-item setting-item--readonly"><div className="setting-copy"><div><h3>{label}</h3><span className="readonly-badge">Solo lectura</span></div><p>{help}</p></div><strong className="setting-readonly-value">{setting.valor}</strong></article>

  const logical = ['impuesto_activo', 'control_caja_activo'].includes(setting.clave)
  const percentage = ['tasa_impuesto', 'descuento_maximo'].includes(setting.clave)
  return <form className="setting-item" onSubmit={submit} noValidate><div className="setting-copy"><h3>{label}</h3><p>{help}</p></div><div className="setting-editor">{logical ? <select className="form-control" aria-label={label} value={value} disabled={!canEdit || busy} onChange={(event) => { setValue(event.target.value); setError('') }}><option value="true">Sí</option><option value="false">No</option></select> : <input className="form-control" aria-label={label} type={percentage ? 'number' : 'text'} min={percentage ? '0' : undefined} max={percentage ? '100' : undefined} step={percentage ? '0.01' : undefined} maxLength={setting.clave === 'nombre_negocio' ? 150 : setting.clave === 'serie_comprobante' ? 20 : undefined} placeholder={setting.clave === 'serie_comprobante' ? 'FAC' : undefined} value={value} disabled={!canEdit || busy} onChange={(event) => { setValue(event.target.value); setError('') }} />}{percentage && <span className="setting-input-suffix">%</span>}</div>{error && <span className="form-message--error setting-error">{error}</span>}{canEdit ? <button className="button button--secondary button--compact" type="submit" disabled={busy || String(value) === String(setting.valor)}>{busy ? 'Guardando…' : 'Guardar'}</button> : <span className="readonly-badge">Sin permiso de edición</span>}</form>
}
