import { useCallback, useEffect, useMemo, useState } from 'react'
import { catalogsApi } from '../api/catalogs'
import { useAuth } from '../auth/useAuth'
import { ErrorState, LoadingState } from '../components/FeedbackStates'
import { ConfirmDialog, EmptyState, ErrorDialog, FormField, Modal, PageHeader, Pagination, StatusBadge } from '../components/CatalogUi'
import { createActionError } from '../utils/actionErrors'

const PAGE_LIMIT = 10

const catalogConfigs = {
  categories: {
    endpoint: '/categories', collection: 'categories', idField: 'id_categoria', singular: 'categoría', plural: 'Categorías',
    description: 'Organiza los productos por familias para facilitar su consulta.',
    searchPlaceholder: 'Buscar por nombre',
    searchMaxLength: 100,
    fields: [
      { name: 'nombre', label: 'Nombre', required: true, maxLength: 100 },
      { name: 'descripcion', label: 'Descripción', maxLength: 255, multiline: true },
    ],
  },
  brands: {
    endpoint: '/brands', collection: 'brands', idField: 'id_marca', singular: 'marca', plural: 'Marcas',
    description: 'Administra las marcas disponibles en el catálogo comercial.',
    searchPlaceholder: 'Buscar por nombre',
    searchMaxLength: 100,
    fields: [
      { name: 'nombre', label: 'Nombre', required: true, maxLength: 100 },
      { name: 'descripcion', label: 'Descripción', maxLength: 255, multiline: true },
    ],
  },
  units: {
    endpoint: '/units', collection: 'units', idField: 'id_unidad', singular: 'unidad', plural: 'Unidades de medida',
    description: 'Define cómo se expresan y fraccionan las existencias de productos.',
    searchPlaceholder: 'Buscar por nombre o abreviatura',
    searchMaxLength: 80,
    fields: [
      { name: 'nombre', label: 'Nombre', required: true, maxLength: 80 },
      { name: 'abreviatura', label: 'Abreviatura', required: true, maxLength: 20 },
      { name: 'permite_decimales', label: 'Permite decimales', type: 'boolean' },
    ],
  },
}

function initialValues(config, record) {
  return Object.fromEntries(config.fields.map((field) => [field.name, field.type === 'boolean' ? Boolean(record?.[field.name]) : (record?.[field.name] ?? '')]))
}

function validate(config, values) {
  const errors = {}
  config.fields.forEach((field) => {
    if (field.type === 'boolean') {
      if (typeof values[field.name] !== 'boolean') errors[field.name] = 'Selecciona una opción válida.'
      return
    }
    const value = values[field.name].trim()
    if (field.required && !value) errors[field.name] = 'Este campo es obligatorio.'
    else if (value.length > field.maxLength) errors[field.name] = `Máximo ${field.maxLength} caracteres.`
  })
  return errors
}

function CatalogForm({ config, record, busy, onCancel, onSubmit }) {
  const [values, setValues] = useState(() => initialValues(config, record))
  const [errors, setErrors] = useState({})
  const setValue = (name, value) => setValues((current) => ({ ...current, [name]: value }))
  const submit = (event) => {
    event.preventDefault()
    const nextErrors = validate(config, values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const payload = Object.fromEntries(config.fields.map((field) => [field.name, field.type === 'boolean' ? values[field.name] : (values[field.name].trim() || null)]))
    onSubmit(payload)
  }

  return (
    <form id="catalog-form" className="catalog-form" onSubmit={submit} noValidate>
      {config.fields.map((field) => (
        <FormField key={field.name} label={field.label} name={field.name} error={errors[field.name]} help={field.maxLength ? `${field.required ? 'Obligatorio' : 'Opcional'} · máximo ${field.maxLength} caracteres` : undefined}>
          {field.type === 'boolean' ? (
            <select id={field.name} className="form-control" value={String(values[field.name])} disabled={busy} onChange={(event) => setValue(field.name, event.target.value === 'true')}>
              <option value="false">No</option><option value="true">Sí</option>
            </select>
          ) : field.multiline ? (
            <textarea id={field.name} className="form-control form-control--textarea" maxLength={field.maxLength} value={values[field.name]} disabled={busy} onChange={(event) => setValue(field.name, event.target.value)} />
          ) : (
            <input id={field.name} className="form-control" maxLength={field.maxLength} value={values[field.name]} disabled={busy} onChange={(event) => setValue(field.name, event.target.value)} />
          )}
        </FormField>
      ))}
      <div className="modal-footer catalog-form-actions">
        <button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button>
        <button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  )
}

export function CatalogPage({ type }) {
  const config = catalogConfigs[type]
  const { hasPermission } = useAuth()
  const [filters, setFilters] = useState({ page: 1, limit: PAGE_LIMIT, search: '', status: '' })
  const [searchInput, setSearchInput] = useState('')
  const [records, setRecords] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [editing, setEditing] = useState(null)
  const [statusRecord, setStatusRecord] = useState(null)
  const [saving, setSaving] = useState(false)
  const [mutationError, setMutationError] = useState(null)

  const canCreate = hasPermission('productos.crear')
  const canEdit = hasPermission('productos.editar')
  const canChangeStatus = hasPermission('productos.desactivar')
  const loadRecords = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await catalogsApi.list(config.endpoint, filters)
      setRecords(response?.data?.[config.collection] ?? [])
      setPagination(response?.data?.pagination ?? null)
    } catch (requestError) {
      setError(requestError.message || 'No fue posible cargar la información.')
    } finally { setLoading(false) }
  }, [config, filters])

  useEffect(() => { loadRecords() }, [loadRecords])
  useEffect(() => { if (!feedback) return undefined; const timer = window.setTimeout(() => setFeedback(''), 4500); return () => window.clearTimeout(timer) }, [feedback])

  const columns = useMemo(() => config.fields.map((field) => field.name), [config])
  const closeEditor = () => { setEditing(null); setMutationError(null) }
  const saveRecord = async (payload) => {
    setSaving(true); setMutationError(null)
    try {
      if (editing?.record) await catalogsApi.update(config.endpoint, editing.record[config.idField], payload)
      else await catalogsApi.create(config.endpoint, payload)
      setFeedback(`${config.singular.charAt(0).toUpperCase() + config.singular.slice(1)} ${editing?.record ? 'actualizada' : 'creada'} correctamente.`)
      closeEditor(); await loadRecords()
    } catch (requestError) {
      setMutationError(createActionError(requestError, editing?.record ? 'No se pudieron guardar los cambios' : `No se pudo crear la ${config.singular}`, 'No fue posible guardar los cambios.'))
    }
    finally { setSaving(false) }
  }
  const changeStatus = async () => {
    const nextStatus = statusRecord.estado === 'activo' ? 'inactivo' : 'activo'
    setSaving(true); setMutationError(null)
    try {
      await catalogsApi.updateStatus(config.endpoint, statusRecord[config.idField], nextStatus)
      setFeedback(`${config.singular.charAt(0).toUpperCase() + config.singular.slice(1)} ${nextStatus === 'activo' ? 'reactivada' : 'desactivada'} correctamente.`)
      setStatusRecord(null); await loadRecords()
    } catch (requestError) {
      setMutationError(createActionError(requestError, `No se pudo ${actionLabel.toLowerCase()} la ${config.singular}`, 'No fue posible cambiar el estado.'))
    }
    finally { setSaving(false) }
  }

  const actionLabel = statusRecord?.estado === 'activo' ? 'Desactivar' : 'Reactivar'
  return (
    <div className="page-stack">
      <PageHeader eyebrow="PRODUCTOS / CATÁLOGOS" title={config.plural} description={config.description} action={canCreate ? <button className="button button--primary" type="button" onClick={() => setEditing({ record: null })}>Nueva {config.singular}</button> : null} />
      {feedback && <div className="inline-alert inline-alert--success" role="status">{feedback}</div>}
      <section className="catalog-panel" aria-label={`Listado de ${config.plural.toLowerCase()}`}>
        <form className="catalog-filters" onSubmit={(event) => { event.preventDefault(); setFilters((current) => ({ ...current, page: 1, search: searchInput.trim() })) }}>
          <label className="search-field"><span className="sr-only">Buscar</span><input className="form-control" type="search" maxLength={config.searchMaxLength} placeholder={config.searchPlaceholder} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></label>
          <button className="button button--secondary" type="submit">Buscar</button>
          <label className="status-filter"><span>Estado</span><select className="form-control" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, page: 1, status: event.target.value }))}><option value="">Todos</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select></label>
        </form>
        {loading ? <LoadingState message={`Cargando ${config.plural.toLowerCase()}…`} /> : error ? <ErrorState title="No se pudo cargar el catálogo" message={error} actionLabel="Reintentar" onAction={loadRecords} /> : records.length === 0 ? <EmptyState message="Prueba con otros términos de búsqueda o filtros." /> : (
          <div className="table-container"><table className="data-table catalog-table"><thead><tr>{columns.map((column) => <th key={column}>{column === 'permite_decimales' ? 'Permite decimales' : column.charAt(0).toUpperCase() + column.slice(1)}</th>)}<th>Estado</th>{(canEdit || canChangeStatus) && <th className="actions-column">Acciones</th>}</tr></thead><tbody>{records.map((record) => <tr key={record[config.idField]}>{columns.map((column) => <td key={column}>{column === 'permite_decimales' ? (record[column] ? 'Sí' : 'No') : (record[column] || '—')}</td>)}<td><StatusBadge status={record.estado} /></td>{(canEdit || canChangeStatus) && <td><div className="table-actions">{canEdit && <button className="button button--secondary button--compact" type="button" onClick={() => setEditing({ record })}>Editar</button>}{canChangeStatus && <button className={`button button--compact button--${record.estado === 'activo' ? 'danger' : 'success'}`} type="button" onClick={() => { setMutationError(''); setStatusRecord(record) }}>{record.estado === 'activo' ? 'Desactivar' : 'Reactivar'}</button>}</div></td>}</tr>)}</tbody></table></div>
        )}
        {!error && <Pagination pagination={pagination} disabled={loading} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />}
      </section>
      {editing && <Modal title={`${editing.record ? 'Editar' : 'Nueva'} ${config.singular}`} onClose={closeEditor} busy={saving}><CatalogForm config={config} record={editing.record} busy={saving} onCancel={closeEditor} onSubmit={saveRecord} /></Modal>}
      {statusRecord && <ConfirmDialog title={`${actionLabel} ${config.singular}`} message={`¿Confirmas que deseas ${actionLabel.toLowerCase()} “${statusRecord.nombre}”?`} confirmLabel={actionLabel} tone={statusRecord.estado === 'activo' ? 'danger' : 'success'} busy={saving} onCancel={() => { setStatusRecord(null); setMutationError(null) }} onConfirm={changeStatus} />}
      <ErrorDialog open={Boolean(mutationError)} title={mutationError?.title} message={mutationError?.message} onClose={() => setMutationError(null)} />
    </div>
  )
}
