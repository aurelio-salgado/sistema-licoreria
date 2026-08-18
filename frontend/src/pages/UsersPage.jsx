import { useCallback, useEffect, useMemo, useState } from 'react'
import { rolesApi } from '../api/roles'
import { usersApi } from '../api/users'
import { useAuth } from '../auth/useAuth'
import { ConfirmDialog, EmptyState, ErrorDialog, Modal, PageHeader, Pagination } from '../components/CatalogUi'
import { ErrorState, LoadingState } from '../components/FeedbackStates'
import { UserForm, UserRoleForm } from '../components/admin/UserForms'
import { createActionError } from '../utils/actionErrors'
import { formatDateTime } from '../utils/formatters'

const PAGE_LIMIT = 20
const initialFilters = { page: 1, limit: PAGE_LIMIT, search: '', status: '', role: '' }

function SecurityState({ user }) {
  if (user.bloqueado_hasta) return <span className="user-security user-security--blocked">Bloqueado hasta {formatDateTime(user.bloqueado_hasta)}</span>
  if (Number(user.intentos_fallidos) > 0) return <span className="user-security user-security--warning">{user.intentos_fallidos} intento(s) fallido(s)</span>
  return <span className="user-security">Sin bloqueo</span>
}

export function UsersPage() {
  const { user: currentUser, hasPermission } = useAuth()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [pagination, setPagination] = useState(null)
  const [filters, setFilters] = useState(initialFilters)
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rolesError, setRolesError] = useState('')
  const [editor, setEditor] = useState(undefined)
  const [roleEditor, setRoleEditor] = useState(null)
  const [statusUser, setStatusUser] = useState(null)
  const [pendingRole, setPendingRole] = useState(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [mutationError, setMutationError] = useState(null)
  const canCreate = hasPermission('usuarios.crear')
  const canEdit = hasPermission('usuarios.editar')
  const canChangeStatus = hasPermission('usuarios.desactivar')
  const canViewRoles = hasPermission('roles.ver')

  const loadUsers = useCallback(async () => {
    setLoading(true); setError('')
    try { const response = await usersApi.list(filters); setUsers(response?.data?.users ?? []); setPagination(response?.data?.pagination ?? null) }
    catch (requestError) { setError(requestError.message || 'No fue posible cargar los usuarios.') }
    finally { setLoading(false) }
  }, [filters])
  const loadRoles = useCallback(async () => {
    if (!canViewRoles) { setRoles([]); return }
    setRolesError('')
    try { const response = await rolesApi.list(); setRoles(response?.data?.roles ?? []) }
    catch (requestError) { setRolesError(requestError.message || 'No fue posible cargar los roles.') }
  }, [canViewRoles])
  useEffect(() => { loadUsers() }, [loadUsers])
  useEffect(() => { loadRoles() }, [loadRoles])
  useEffect(() => { if (!feedback) return undefined; const timer = window.setTimeout(() => setFeedback(''), 4500); return () => window.clearTimeout(timer) }, [feedback])
  const activeRoles = useMemo(() => roles.filter((role) => role.estado === 'activo'), [roles])

  const saveUser = async (values) => {
    const creating = !editor
    setSaving(true); setMutationError(null)
    try {
      if (creating) await usersApi.create(values)
      else await usersApi.update(editor.id_usuario, values)
      setEditor(undefined)
      setFeedback(`Usuario ${creating ? 'creado' : 'actualizado'} correctamente.`)
      await loadUsers()
    } catch (requestError) { setMutationError(createActionError(requestError, `No se pudo ${creating ? 'crear' : 'actualizar'} el usuario`)) }
    finally { setSaving(false) }
  }
  const changeStatus = async () => {
    const nextStatus = statusUser.estado === 'activo' ? 'inactivo' : 'activo'
    setSaving(true); setMutationError(null)
    try { await usersApi.updateStatus(statusUser.id_usuario, nextStatus); setFeedback(`Usuario ${nextStatus === 'activo' ? 'reactivado' : 'desactivado'} correctamente.`); setStatusUser(null); await loadUsers() }
    catch (requestError) { setMutationError(createActionError(requestError, `No se pudo ${nextStatus === 'activo' ? 'reactivar' : 'desactivar'} el usuario`)) }
    finally { setSaving(false) }
  }
  const changeRole = async () => {
    setSaving(true); setMutationError(null)
    try { await usersApi.updateRole(pendingRole.user.id_usuario, pendingRole.role.id_rol); setFeedback('Rol actualizado correctamente.'); setPendingRole(null); await loadUsers() }
    catch (requestError) { setMutationError(createActionError(requestError, 'No se pudo cambiar el rol del usuario')) }
    finally { setSaving(false) }
  }
  const selectRole = (roleId) => {
    const role = activeRoles.find((item) => item.id_rol === roleId)
    setRoleEditor(null)
    setPendingRole({ user: roleEditor, role })
  }
  const statusAction = statusUser?.estado === 'activo' ? 'Desactivar' : 'Reactivar'

  return <div className="page-stack users-page">
    <PageHeader eyebrow="ADMINISTRACIÓN" title="Usuarios" description="Administra perfiles, estado operativo y el rol único asignado a cada usuario." action={canCreate ? <button className="button button--primary" type="button" disabled={!activeRoles.length || Boolean(rolesError)} onClick={() => setEditor(null)}>Nuevo usuario</button> : null} />
    {feedback && <div className="inline-alert inline-alert--success" role="status">{feedback}</div>}
    {rolesError && <div className="inline-alert inline-alert--error" role="alert">{rolesError} <button className="link-button" type="button" onClick={loadRoles}>Reintentar</button></div>}
    {!canViewRoles && (canCreate || canEdit) && <div className="inline-alert inline-alert--error" role="alert">Se requiere el permiso roles.ver para seleccionar roles desde esta interfaz.</div>}
    <section className="catalog-panel">
      <form className="user-filters" onSubmit={(event) => { event.preventDefault(); setFilters((current) => ({ ...current, page: 1, search: searchInput.trim() })) }}>
        <label className="search-field"><span>Buscar</span><input className="form-control" type="search" maxLength="150" placeholder="Nombre, usuario o correo" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></label>
        <button className="button button--secondary" type="submit">Buscar</button>
        <label className="filter-field"><span>Estado</span><select className="form-control" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, page: 1, status: event.target.value }))}><option value="">Todos</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select></label>
        <label className="filter-field"><span>Rol</span><select className="form-control" value={filters.role} disabled={!roles.length} onChange={(event) => setFilters((current) => ({ ...current, page: 1, role: event.target.value }))}><option value="">Todos</option>{roles.map((role) => <option key={role.id_rol} value={role.id_rol}>{role.nombre}</option>)}</select></label>
      </form>
      {loading ? <LoadingState message="Cargando usuarios…" /> : error ? <ErrorState title="No se pudieron cargar los usuarios" message={error} actionLabel="Reintentar" onAction={loadUsers} /> : !users.length ? <EmptyState message="No hay usuarios para los filtros seleccionados." /> : <div className="table-container"><table className="data-table users-table"><thead><tr><th>Usuario</th><th>Nombre completo</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Seguridad</th><th>Último acceso</th>{(canEdit || canChangeStatus) && <th className="actions-column">Acciones</th>}</tr></thead><tbody>{users.map((item) => <tr key={item.id_usuario}><td><strong>{item.nombre_usuario}</strong>{item.id_usuario === currentUser?.id_usuario && <small className="table-secondary">Tu usuario</small>}</td><td>{item.nombre} {item.apellido}</td><td>{item.correo || '—'}</td><td><span className="role-chip">{item.role.nombre}</span></td><td><span className={`badge badge--${item.estado === 'activo' ? 'active' : 'inactive'}`}>{item.estado === 'activo' ? 'Activo' : 'Inactivo'}</span></td><td><SecurityState user={item} /></td><td>{formatDateTime(item.ultimo_acceso)}</td>{(canEdit || canChangeStatus) && <td><div className="table-actions">{canEdit && <><button className="button button--secondary button--compact" type="button" onClick={() => setEditor(item)}>Editar</button><button className="button button--secondary button--compact" type="button" disabled={!activeRoles.length} onClick={() => setRoleEditor(item)}>Cambiar rol</button></>}{canChangeStatus && <button className={`button button--compact button--${item.estado === 'activo' ? 'danger' : 'success'}`} type="button" onClick={() => setStatusUser(item)}>{item.estado === 'activo' ? 'Desactivar' : 'Reactivar'}</button>}</div></td>}</tr>)}</tbody></table></div>}
      {!error && <Pagination pagination={pagination} disabled={loading} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />}
    </section>
    {editor !== undefined && <Modal title={editor ? 'Editar usuario' : 'Nuevo usuario'} onClose={() => setEditor(undefined)} busy={saving} wide><UserForm key={editor?.id_usuario ?? 'new'} user={editor} roles={activeRoles} busy={saving} onCancel={() => setEditor(undefined)} onSubmit={saveUser} /></Modal>}
    {roleEditor && <Modal title="Cambiar rol" onClose={() => setRoleEditor(null)} busy={saving}><UserRoleForm user={roleEditor} roles={activeRoles} busy={saving} onCancel={() => setRoleEditor(null)} onSubmit={selectRole} /></Modal>}
    {statusUser && <ConfirmDialog title={`${statusAction} usuario`} message={statusUser.estado === 'activo' ? `¿Confirmas que deseas desactivar a “${statusUser.nombre_usuario}”? El usuario dejará de poder operar en el sistema.` : `¿Confirmas que deseas reactivar a “${statusUser.nombre_usuario}”?`} confirmLabel={statusAction} tone={statusUser.estado === 'activo' ? 'danger' : 'success'} busy={saving} onCancel={() => setStatusUser(null)} onConfirm={changeStatus} />}
    {pendingRole && <ConfirmDialog title="Reemplazar rol" message={`¿Confirmas reemplazar el rol “${pendingRole.user.role.nombre}” por “${pendingRole.role?.nombre}” para ${pendingRole.user.nombre_usuario}?`} confirmLabel="Cambiar rol" tone="danger" busy={saving} onCancel={() => setPendingRole(null)} onConfirm={changeRole} />}
    <ErrorDialog open={Boolean(mutationError)} title={mutationError?.title} message={mutationError?.message} onClose={() => setMutationError(null)} />
  </div>
}
