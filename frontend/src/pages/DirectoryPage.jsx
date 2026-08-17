import { useCallback, useEffect, useState } from 'react'
import { clientsApi } from '../api/clients'
import { suppliersApi } from '../api/suppliers'
import { useAuth } from '../auth/useAuth'
import { ConfirmDialog, EmptyState, ErrorDialog, FormField, Modal, PageHeader, Pagination, StatusBadge } from '../components/CatalogUi'
import { ErrorState, LoadingState } from '../components/FeedbackStates'
import { createActionError } from '../utils/actionErrors'

const PAGE_LIMIT = 10
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const directoryConfigs = {
  clients: {
    api: clientsApi,
    collection: 'clients',
    idField: 'id_cliente',
    singular: 'cliente',
    createdLabel: 'creado',
    updatedLabel: 'actualizado',
    reactivatedLabel: 'reactivado',
    deactivatedLabel: 'desactivado',
    plural: 'Clientes',
    permissionPrefix: 'clientes',
    description: 'Administra los clientes disponibles para las operaciones comerciales.',
    searchPlaceholder: 'Buscar por nombre, identificación, correo o teléfono',
    protectedRecord: (record) => Boolean(record.es_consumidor_final),
    fields: [
      { name: 'nombre', label: 'Nombre', required: true, maxLength: 150 },
      { name: 'identificacion', label: 'Identificación', maxLength: 50 },
      { name: 'telefono', label: 'Teléfono', maxLength: 30 },
      { name: 'correo', label: 'Correo', maxLength: 150, type: 'email' },
      { name: 'direccion', label: 'Dirección', maxLength: 255, multiline: true, fullWidth: true },
    ],
    columns: [
      { field: 'nombre', label: 'Nombre' },
      { field: 'identificacion', label: 'Identificación' },
      { field: 'telefono', label: 'Teléfono' },
      { field: 'correo', label: 'Correo' },
      { field: 'es_consumidor_final', label: 'Tipo', render: (record) => record.es_consumidor_final ? <span className="special-record-badge">Cliente predeterminado</span> : 'Cliente' },
    ],
  },
  suppliers: {
    api: suppliersApi,
    collection: 'suppliers',
    idField: 'id_proveedor',
    singular: 'proveedor',
    createdLabel: 'creado',
    updatedLabel: 'actualizado',
    reactivatedLabel: 'reactivado',
    deactivatedLabel: 'desactivado',
    plural: 'Proveedores',
    permissionPrefix: 'proveedores',
    description: 'Administra los proveedores disponibles para abastecimiento.',
    searchPlaceholder: 'Buscar por nombre, identificación fiscal, contacto, correo o teléfono',
    protectedRecord: () => false,
    fields: [
      { name: 'nombre', label: 'Nombre', required: true, maxLength: 150 },
      { name: 'identificacion_fiscal', label: 'Identificación fiscal', maxLength: 50 },
      { name: 'contacto', label: 'Contacto', maxLength: 150 },
      { name: 'telefono', label: 'Teléfono', maxLength: 30 },
      { name: 'correo', label: 'Correo', maxLength: 150, type: 'email' },
      { name: 'direccion', label: 'Dirección', maxLength: 255, multiline: true, fullWidth: true },
    ],
    columns: [
      { field: 'nombre', label: 'Nombre' },
      { field: 'identificacion_fiscal', label: 'Identificación fiscal' },
      { field: 'contacto', label: 'Contacto' },
      { field: 'telefono', label: 'Teléfono' },
      { field: 'correo', label: 'Correo' },
    ],
  },
}

function initialValues(config, record) {
  return Object.fromEntries(
    config.fields.map((field) => [field.name, record?.[field.name] ?? '']),
  )
}

function validate(config, values) {
  const errors = {}
  config.fields.forEach((field) => {
    const value = values[field.name].trim()
    if (field.required && !value) {
      errors[field.name] = 'Este campo es obligatorio.'
    } else if (value.length > field.maxLength) {
      errors[field.name] = `Máximo ${field.maxLength} caracteres.`
    } else if (field.type === 'email' && value && !EMAIL_PATTERN.test(value)) {
      errors[field.name] = 'El correo no tiene un formato válido.'
    }
  })
  return errors
}

function DirectoryForm({ config, record, busy, onCancel, onSubmit }) {
  const [values, setValues] = useState(() => initialValues(config, record))
  const [errors, setErrors] = useState({})
  const setValue = (field, value) =>
    setValues((current) => ({ ...current, [field]: value }))
  const submit = (event) => {
    event.preventDefault()
    const nextErrors = validate(config, values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit(
      Object.fromEntries(
        config.fields.map((field) => {
          const value = values[field.name].trim()
          return [field.name, value || null]
        }),
      ),
    )
  }

  return (
    <form className="directory-form" onSubmit={submit} noValidate>
      <div className="directory-form-grid">
        {config.fields.map((field) => (
          <div className={field.fullWidth ? 'directory-form-span-2' : ''} key={field.name}>
            <FormField
              label={field.label}
              name={field.name}
              error={errors[field.name]}
              help={`${field.required ? 'Obligatorio' : 'Opcional'} · máximo ${field.maxLength} caracteres`}
            >
              {field.multiline ? (
                <textarea id={field.name} className="form-control form-control--textarea" maxLength={field.maxLength} value={values[field.name]} disabled={busy} onChange={(event) => setValue(field.name, event.target.value)} />
              ) : (
                <input id={field.name} className="form-control" type={field.type === 'email' ? 'email' : 'text'} maxLength={field.maxLength} value={values[field.name]} disabled={busy} onChange={(event) => setValue(field.name, event.target.value)} />
              )}
            </FormField>
          </div>
        ))}
      </div>
      <div className="modal-footer directory-form-actions">
        <button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button>
        <button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : `Guardar ${config.singular}`}</button>
      </div>
    </form>
  )
}

export function DirectoryPage({ type }) {
  const config = directoryConfigs[type]
  const { hasPermission } = useAuth()
  const [filters, setFilters] = useState({ page: 1, limit: PAGE_LIMIT, search: '', status: '' })
  const [searchInput, setSearchInput] = useState('')
  const [records, setRecords] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [editing, setEditing] = useState(undefined)
  const [statusRecord, setStatusRecord] = useState(null)
  const [saving, setSaving] = useState(false)
  const [mutationError, setMutationError] = useState(null)

  const canCreate = hasPermission(`${config.permissionPrefix}.crear`)
  const canEdit = hasPermission(`${config.permissionPrefix}.editar`)
  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await config.api.list(filters)
      setRecords(response?.data?.[config.collection] ?? [])
      setPagination(response?.data?.pagination ?? null)
    } catch (requestError) {
      setError(requestError.message || `No fue posible cargar los ${config.plural.toLowerCase()}.`)
    } finally {
      setLoading(false)
    }
  }, [config, filters])

  useEffect(() => { loadRecords() }, [loadRecords])
  useEffect(() => {
    if (!feedback) return undefined
    const timer = window.setTimeout(() => setFeedback(''), 4500)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const closeEditor = () => { setEditing(undefined); setMutationError(null) }
  const saveRecord = async (payload) => {
    setSaving(true)
    setMutationError(null)
    try {
      if (editing) await config.api.update(editing[config.idField], payload)
      else await config.api.create(payload)
      setFeedback(`${config.singular.charAt(0).toUpperCase() + config.singular.slice(1)} ${editing ? config.updatedLabel : config.createdLabel} correctamente.`)
      closeEditor()
      await loadRecords()
    } catch (requestError) {
      setMutationError(createActionError(requestError, editing ? 'No se pudieron guardar los cambios' : `No se pudo crear el ${config.singular}`, `No fue posible guardar el ${config.singular}.`))
    } finally {
      setSaving(false)
    }
  }
  const changeStatus = async () => {
    const nextStatus = statusRecord.estado === 'activo' ? 'inactivo' : 'activo'
    setSaving(true)
    setMutationError(null)
    try {
      await config.api.updateStatus(statusRecord[config.idField], nextStatus)
      setFeedback(`${config.singular.charAt(0).toUpperCase() + config.singular.slice(1)} ${nextStatus === 'activo' ? config.reactivatedLabel : config.deactivatedLabel} correctamente.`)
      setStatusRecord(null)
      await loadRecords()
    } catch (requestError) {
      setMutationError(createActionError(requestError, `No se pudo ${statusAction.toLowerCase()} el ${config.singular}`, 'No fue posible cambiar el estado.'))
    } finally {
      setSaving(false)
    }
  }
  const statusAction = statusRecord?.estado === 'activo' ? 'Desactivar' : 'Reactivar'

  return (
    <div className="page-stack directory-page">
      <PageHeader eyebrow="DIRECTORIO" title={config.plural} description={config.description} action={canCreate ? <button className="button button--primary" type="button" onClick={() => setEditing(null)}>Nuevo {config.singular}</button> : null} />
      {feedback && <div className="inline-alert inline-alert--success" role="status">{feedback}</div>}
      <section className="catalog-panel" aria-label={`Listado de ${config.plural.toLowerCase()}`}>
        <form className="catalog-filters" onSubmit={(event) => { event.preventDefault(); setFilters((current) => ({ ...current, page: 1, search: searchInput.trim() })) }}>
          <label className="search-field"><span className="sr-only">Buscar</span><input className="form-control" type="search" maxLength="150" placeholder={config.searchPlaceholder} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></label>
          <button className="button button--secondary" type="submit">Buscar</button>
          <label className="status-filter"><span>Estado</span><select className="form-control" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, page: 1, status: event.target.value }))}><option value="">Todos</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select></label>
        </form>
        {loading ? <LoadingState message={`Cargando ${config.plural.toLowerCase()}…`} /> : error ? <ErrorState title={`No se pudieron cargar los ${config.plural.toLowerCase()}`} message={error} actionLabel="Reintentar" onAction={loadRecords} /> : records.length === 0 ? <EmptyState message="Prueba con otros términos de búsqueda o filtros." /> : (
          <div className="table-container"><table className="data-table directory-table"><thead><tr>{config.columns.map((column) => <th key={column.field}>{column.label}</th>)}<th>Estado</th>{canEdit && <th className="actions-column">Acciones</th>}</tr></thead><tbody>{records.map((record) => { const isProtected = config.protectedRecord(record); return <tr key={record[config.idField]}>{config.columns.map((column) => <td key={column.field}>{column.render ? column.render(record) : (record[column.field] || '—')}</td>)}<td><StatusBadge status={record.estado} /></td>{canEdit && <td><div className="table-actions">{isProtected ? <span className="protected-copy">Protegido</span> : <><button className="button button--secondary button--compact" type="button" onClick={() => setEditing(record)}>Editar</button><button className={`button button--compact button--${record.estado === 'activo' ? 'danger' : 'success'}`} type="button" onClick={() => { setMutationError(''); setStatusRecord(record) }}>{record.estado === 'activo' ? 'Desactivar' : 'Reactivar'}</button></>}</div></td>}</tr> })}</tbody></table></div>
        )}
        {!error && <Pagination pagination={pagination} disabled={loading} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />}
      </section>
      {editing !== undefined && <Modal title={editing ? `Editar ${config.singular}` : `Nuevo ${config.singular}`} onClose={closeEditor} busy={saving} wide><DirectoryForm key={editing?.[config.idField] ?? 'new'} config={config} record={editing} busy={saving} onCancel={closeEditor} onSubmit={saveRecord} /></Modal>}
      {statusRecord && <ConfirmDialog title={`${statusAction} ${config.singular}`} message={`¿Confirmas que deseas ${statusAction.toLowerCase()} “${statusRecord.nombre}”?`} confirmLabel={statusAction} tone={statusRecord.estado === 'activo' ? 'danger' : 'success'} busy={saving} onCancel={() => { setStatusRecord(null); setMutationError(null) }} onConfirm={changeStatus} />}
      <ErrorDialog open={Boolean(mutationError)} title={mutationError?.title} message={mutationError?.message} onClose={() => setMutationError(null)} />
    </div>
  )
}
