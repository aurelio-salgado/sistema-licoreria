import { useCallback, useEffect, useMemo, useState } from 'react'
import { rolesApi } from '../api/roles'
import { useAuth } from '../auth/useAuth'
import { ConfirmDialog, EmptyState, ErrorDialog, Modal, PageHeader } from '../components/CatalogUi'
import { ErrorState, LoadingState } from '../components/FeedbackStates'
import { PermissionMatrix } from '../components/admin/PermissionMatrix'
import { createActionError } from '../utils/actionErrors'

function isEditableRole(role) {
  return ['Vendedor', 'Consulta'].includes(role.nombre)
}

export function RolesPage() {
  const { hasPermission } = useAuth()
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRole, setSelectedRole] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [pendingSave, setPendingSave] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [mutationError, setMutationError] = useState(null)
  const canAdminister = hasPermission('roles.administrar')

  const loadAccess = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([rolesApi.list(), rolesApi.listPermissions()])
      setRoles(rolesResponse?.data?.roles ?? [])
      setPermissions(permissionsResponse?.data?.permissions ?? [])
    } catch (requestError) { setError(requestError.message || 'No fue posible cargar los roles y permisos.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { loadAccess() }, [loadAccess])
  useEffect(() => { if (!feedback) return undefined; const timer = window.setTimeout(() => setFeedback(''), 4500); return () => window.clearTimeout(timer) }, [feedback])

  const permissionCount = useMemo(() => permissions.length, [permissions])
  const openPermissions = async (role) => {
    setMutationError(null)
    try {
      const response = await rolesApi.getById(role.id_rol)
      const currentRole = response?.data?.role
      setSelectedRole(currentRole)
      setSelectedIds(new Set((currentRole?.permissions ?? []).map((permission) => permission.id_permiso)))
    } catch (requestError) { setMutationError(createActionError(requestError, 'No se pudo consultar el rol')) }
  }
  const savePermissions = async () => {
    setSaving(true); setMutationError(null)
    try {
      await rolesApi.updatePermissions(selectedRole.id_rol, [...selectedIds].sort((a, b) => a - b))
      const [roleResponse, permissionsResponse, rolesResponse] = await Promise.all([rolesApi.getById(selectedRole.id_rol), rolesApi.listPermissions(), rolesApi.list()])
      setSelectedRole(roleResponse?.data?.role ?? null)
      setSelectedIds(new Set((roleResponse?.data?.role?.permissions ?? []).map((permission) => permission.id_permiso)))
      setPermissions(permissionsResponse?.data?.permissions ?? [])
      setRoles(rolesResponse?.data?.roles ?? [])
      setPendingSave(false)
      setFeedback('Permisos del rol actualizados correctamente.')
    } catch (requestError) { setPendingSave(false); setMutationError(createActionError(requestError, 'No se pudieron actualizar los permisos')) }
    finally { setSaving(false) }
  }
  const closeEditor = () => { if (!saving) { setSelectedRole(null); setSelectedIds(new Set()); setPendingSave(false) } }

  return <div className="page-stack roles-page">
    <PageHeader eyebrow="ADMINISTRACIÓN" title="Roles y permisos" description="Consulta los roles existentes y administra sus permisos efectivos según las reglas del sistema." />
    {feedback && <div className="inline-alert inline-alert--success" role="status">{feedback}</div>}
    <section className="catalog-panel">
      <div className="roles-summary"><div><span>Roles registrados</span><strong>{roles.length}</strong></div><div><span>Permisos disponibles</span><strong>{permissionCount}</strong></div><p>Los roles y permisos son catálogos controlados por el backend. No se crean ni eliminan desde esta interfaz.</p></div>
      {loading ? <LoadingState message="Cargando roles y permisos…" /> : error ? <ErrorState title="No se pudieron cargar los roles" message={error} actionLabel="Reintentar" onAction={loadAccess} /> : !roles.length ? <EmptyState message="No hay roles registrados." /> : <div className="table-container"><table className="data-table roles-table"><thead><tr><th>Rol</th><th>Descripción</th><th>Estado</th><th>Administración</th><th>Permisos</th><th className="actions-column">Acción</th></tr></thead><tbody>{roles.map((role) => <tr key={role.id_rol}><td><strong>{role.nombre}</strong></td><td>{role.descripcion || '—'}</td><td><span className={`badge badge--${role.estado === 'activo' ? 'active' : 'inactive'}`}>{role.estado === 'activo' ? 'Activo' : 'Inactivo'}</span></td><td><span className="role-chip">{isEditableRole(role) ? 'Configurable' : 'Protegido'}</span></td><td><strong>{role.permissions?.length ?? 0}</strong></td><td><div className="table-actions"><button className="button button--secondary button--compact" type="button" onClick={() => openPermissions(role)}>{canAdminister && isEditableRole(role) ? 'Administrar permisos' : 'Ver permisos'}</button></div></td></tr>)}</tbody></table></div>}
    </section>
    {selectedRole && <Modal title={`Permisos · ${selectedRole.nombre}`} onClose={closeEditor} busy={saving} wide footer={<><button className="button button--secondary" type="button" disabled={saving} onClick={closeEditor}>Cerrar</button>{canAdminister && isEditableRole(selectedRole) && <button className="button button--primary" type="button" disabled={saving} onClick={() => setPendingSave(true)}>Guardar asignación</button>}</>}><div className="permission-editor-heading"><div><span className={`badge badge--${selectedRole.estado === 'activo' ? 'active' : 'inactive'}`}>{selectedRole.estado === 'activo' ? 'Activo' : 'Inactivo'}</span><span>{selectedIds.size} de {permissions.length} permisos seleccionados</span></div>{selectedRole.nombre === 'Administrador' && <p className="warning-copy">Los permisos del rol Administrador están protegidos y son únicamente de consulta.</p>}{!isEditableRole(selectedRole) && selectedRole.nombre !== 'Administrador' && <p className="warning-copy">Este rol no admite cambios de permisos según las reglas actuales del backend.</p>}</div><PermissionMatrix permissions={permissions} selectedIds={selectedIds} disabled={!canAdminister || !isEditableRole(selectedRole) || saving} onChange={setSelectedIds} /></Modal>}
    {pendingSave && <ConfirmDialog title="Reemplazar permisos del rol" message={`Se guardará la selección completa de ${selectedIds.size} permisos para “${selectedRole.nombre}”. Los permisos desmarcados serán retirados.`} confirmLabel="Guardar permisos" tone="danger" busy={saving} onCancel={() => setPendingSave(false)} onConfirm={savePermissions} />}
    <ErrorDialog open={Boolean(mutationError)} title={mutationError?.title} message={mutationError?.message} onClose={() => setMutationError(null)} />
  </div>
}
