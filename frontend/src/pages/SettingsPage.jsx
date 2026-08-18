import { useCallback, useEffect, useMemo, useState } from 'react'
import { settingsApi } from '../api/settings'
import { useAuth } from '../auth/useAuth'
import { ConfirmDialog, ErrorDialog, PageHeader } from '../components/CatalogUi'
import { ErrorState, LoadingState } from '../components/FeedbackStates'
import { SettingControl } from '../components/settings/SettingControl'
import { createActionError } from '../utils/actionErrors'

const groups = [
  { title: 'General', keys: [{ key: 'nombre_negocio', label: 'Nombre del negocio', help: 'Identifica el negocio dentro de Liquorix.' }] },
  { title: 'Fiscal', keys: [
    { key: 'impuesto_activo', label: 'Aplicar impuesto', help: 'Define si las nuevas compras y ventas aplican la política fiscal configurada.' },
    { key: 'tasa_impuesto', label: 'Tasa de impuesto', help: 'Porcentaje aplicado al confirmar nuevas compras y ventas cuando el impuesto está activo.' },
    { key: 'descuento_maximo', label: 'Descuento máximo permitido en ventas', help: 'Porcentaje global máximo que puede concederse al cliente en cada línea de venta. No limita descuentos recibidos de proveedores en compras.' },
  ] },
  { title: 'Caja', keys: [{ key: 'control_caja_activo', label: 'Control de caja activo', help: 'Cuando está activo, las ventas en efectivo requieren una caja válida según las reglas del sistema.' }] },
  { title: 'Comprobantes', keys: [
    { key: 'serie_comprobante', label: 'Serie de comprobante', help: 'Prefijo usado para generar los nuevos números de factura.' },
    { key: 'siguiente_numero_comprobante', label: 'Siguiente comprobante', help: 'La secuencia se incrementa automáticamente al confirmar ventas.' },
  ] },
]
const confirmations = {
  impuesto_activo: 'Cambiar la aplicación del impuesto afectará las nuevas compras y ventas al momento de confirmarlas.',
  tasa_impuesto: 'Cambiar la tasa de impuesto afectará las nuevas compras y ventas al momento de confirmarlas.',
  descuento_maximo: 'Cambiar el descuento máximo afectará las nuevas líneas de venta y volverá a validarse al confirmar cada venta.',
  control_caja_activo: 'Cambiar el control de caja afectará las reglas aplicadas a nuevas ventas en efectivo.',
  serie_comprobante: 'Cambiar la serie modificará la numeración utilizada en los nuevos comprobantes.',
}

export function SettingsPage() {
  const { hasPermission } = useAuth()
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingKey, setSavingKey] = useState('')
  const [pending, setPending] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [mutationError, setMutationError] = useState(null)
  const canEdit = hasPermission('configuracion.editar')
  const loadSettings = useCallback(async () => {
    setLoading(true); setError('')
    try { const response = await settingsApi.list(); setSettings(response?.data?.settings ?? []) }
    catch (requestError) { setError(requestError.message || 'No fue posible cargar la configuración.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { loadSettings() }, [loadSettings])
  useEffect(() => { if (!feedback) return undefined; const timer = window.setTimeout(() => setFeedback(''), 4500); return () => window.clearTimeout(timer) }, [feedback])
  const byKey = useMemo(() => new Map(settings.map((setting) => [setting.clave, setting])), [settings])
  const taxEnabled = byKey.get('impuesto_activo')?.valor === 'true'
  const requestSave = (setting, value) => {
    if (confirmations[setting.clave]) setPending({ setting, value })
    else saveSetting(setting, value)
  }
  const saveSetting = async (setting, value) => {
    setSavingKey(setting.clave); setMutationError(null)
    try { await settingsApi.update(setting.clave, value); setPending(null); setFeedback(`${setting.clave} actualizado correctamente.`); await loadSettings() }
    catch (requestError) { setPending(null); setMutationError(createActionError(requestError, 'No se pudo actualizar la configuración')) }
    finally { setSavingKey('') }
  }

  return <div className="page-stack settings-page"><PageHeader eyebrow="ADMINISTRACIÓN" title="Configuración" description="Administra parámetros generales que controlan las nuevas operaciones de Liquorix." />{feedback && <div className="inline-alert inline-alert--success" role="status">{feedback}</div>}{loading ? <LoadingState message="Cargando configuración…" /> : error ? <ErrorState title="No se pudo cargar la configuración" message={error} actionLabel="Reintentar" onAction={loadSettings} /> : <>{!taxEnabled && <div className="inline-alert inline-alert--warning" role="status">El impuesto está desactivado. La tasa permanece configurada, pero actualmente no se aplica.</div>}<div className="settings-groups">{groups.map((group) => <section className="settings-card" key={group.title}><div className="settings-card-heading"><span className="eyebrow">{group.title.toUpperCase()}</span><h2>{group.title}</h2></div><div>{group.keys.map((definition) => { const setting = byKey.get(definition.key); return setting ? <SettingControl key={definition.key} setting={setting} label={definition.label} help={definition.help} canEdit={canEdit} busy={savingKey === definition.key} onSave={requestSave} /> : null })}</div></section>)}</div></>}{pending && <ConfirmDialog title="Confirmar cambio de configuración" message={confirmations[pending.setting.clave]} confirmLabel="Guardar cambio" tone="danger" busy={Boolean(savingKey)} onCancel={() => setPending(null)} onConfirm={() => saveSetting(pending.setting, pending.value)} />}<ErrorDialog open={Boolean(mutationError)} title={mutationError?.title} message={mutationError?.message} onClose={() => setMutationError(null)} /></div>
}
