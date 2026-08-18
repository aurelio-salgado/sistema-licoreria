import { useState } from 'react'
import { FormField } from '../CatalogUi'

function initialProfile(user) {
  return {
    nombre: user?.nombre ?? '',
    apellido: user?.apellido ?? '',
    nombre_usuario: user?.nombre_usuario ?? '',
    correo: user?.correo ?? '',
    password: '',
    id_rol: user?.role?.id_rol ? String(user.role.id_rol) : '',
  }
}

function validateProfile(values, creating) {
  const errors = {}
  for (const [field, label, maximum] of [['nombre', 'El nombre', 100], ['apellido', 'El apellido', 100], ['nombre_usuario', 'El nombre de usuario', 80]]) {
    const value = values[field].trim()
    if (!value) errors[field] = `${label} es obligatorio.`
    else if (value.length > maximum) errors[field] = `${label} no puede superar ${maximum} caracteres.`
  }
  const email = values.correo.trim()
  if (email && (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) errors.correo = 'Ingresa un correo válido de hasta 150 caracteres.'
  if (creating) {
    const passwordBytes = new TextEncoder().encode(values.password).length
    if (values.password.length < 12) errors.password = 'La contraseña debe tener al menos 12 caracteres.'
    else if (passwordBytes > 72) errors.password = 'La contraseña no puede superar 72 bytes UTF-8.'
    if (!/^[1-9]\d*$/.test(values.id_rol)) errors.id_rol = 'Selecciona un rol activo.'
  }
  return errors
}

export function UserForm({ user, roles, busy, onCancel, onSubmit }) {
  const creating = !user
  const [values, setValues] = useState(() => initialProfile(user))
  const [errors, setErrors] = useState({})
  const [passwordVisible, setPasswordVisible] = useState(false)
  const setValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: '' }))
  }
  const submit = (event) => {
    event.preventDefault()
    const nextErrors = validateProfile(values, creating)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const payload = {
      nombre: values.nombre.trim(),
      apellido: values.apellido.trim(),
      nombre_usuario: values.nombre_usuario.trim(),
      correo: values.correo.trim() || null,
    }
    if (creating) {
      payload.password = values.password
      payload.id_rol = Number(values.id_rol)
      setValues((current) => ({ ...current, password: '' }))
      setPasswordVisible(false)
    }
    onSubmit(payload)
  }

  return (
    <form className="admin-form" onSubmit={submit} noValidate>
      <div className="admin-form-grid">
        <FormField label="Nombre" name="user-name" error={errors.nombre}><input id="user-name" className="form-control" maxLength="100" autoComplete="off" value={values.nombre} disabled={busy} onChange={(event) => setValue('nombre', event.target.value)} /></FormField>
        <FormField label="Apellido" name="user-last-name" error={errors.apellido}><input id="user-last-name" className="form-control" maxLength="100" autoComplete="off" value={values.apellido} disabled={busy} onChange={(event) => setValue('apellido', event.target.value)} /></FormField>
        <FormField label="Nombre de usuario" name="user-username" error={errors.nombre_usuario} help="Máximo 80 caracteres"><input id="user-username" className="form-control" maxLength="80" autoComplete="off" value={values.nombre_usuario} disabled={busy} onChange={(event) => setValue('nombre_usuario', event.target.value)} /></FormField>
        <FormField label="Correo" name="user-email" error={errors.correo} help="Opcional"><input id="user-email" className="form-control" type="email" maxLength="150" autoComplete="off" value={values.correo} disabled={busy} onChange={(event) => setValue('correo', event.target.value)} /></FormField>
        {creating && <>
          <FormField label="Contraseña inicial" name="user-password" error={errors.password} help="Entre 12 caracteres y 72 bytes UTF-8">
            <div className="password-input admin-password-input"><input id="user-password" className="form-control" type={passwordVisible ? 'text' : 'password'} autoComplete="new-password" value={values.password} disabled={busy} onChange={(event) => setValue('password', event.target.value)} /><button className="password-toggle" type="button" disabled={busy} aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setPasswordVisible((visible) => !visible)}><svg aria-hidden="true" viewBox="0 0 24 24">{passwordVisible ? <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9 5.2 9 5.2a14.5 14.5 0 0 1-2.2 2.7M6.3 6.3C4.2 7.7 3 9.2 3 9.2S6.5 16 12 16c1 0 2-.2 2.9-.6" /> : <><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" /><circle cx="12" cy="12" r="2.5" /></>}</svg></button></div>
          </FormField>
          <FormField label="Rol inicial" name="user-role" error={errors.id_rol}><select id="user-role" className="form-control" value={values.id_rol} disabled={busy} onChange={(event) => setValue('id_rol', event.target.value)}><option value="">Selecciona un rol</option>{roles.map((role) => <option key={role.id_rol} value={role.id_rol}>{role.nombre}</option>)}</select></FormField>
        </>}
      </div>
      {!creating && <p className="admin-form-note">La contraseña y el rol se administran mediante operaciones separadas.</p>}
      <div className="modal-footer admin-form-actions"><button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : creating ? 'Crear usuario' : 'Guardar cambios'}</button></div>
    </form>
  )
}

export function UserRoleForm({ user, roles, busy, onCancel, onSubmit }) {
  const [roleId, setRoleId] = useState(String(user.role.id_rol))
  const [error, setError] = useState('')
  const submit = (event) => {
    event.preventDefault()
    if (!/^[1-9]\d*$/.test(roleId)) { setError('Selecciona un rol activo.'); return }
    if (Number(roleId) === user.role.id_rol) { setError('Selecciona un rol diferente al actual.'); return }
    onSubmit(Number(roleId))
  }
  return <form className="admin-form" onSubmit={submit} noValidate><div className="role-current-summary"><span>Rol actual</span><strong>{user.role.nombre}</strong></div><FormField label="Nuevo rol" name="replacement-role" error={error} help="Esta operación reemplazará el único rol asignado al usuario."><select id="replacement-role" className="form-control" value={roleId} disabled={busy} onChange={(event) => { setRoleId(event.target.value); setError('') }}><option value="">Selecciona un rol</option>{roles.map((role) => <option key={role.id_rol} value={role.id_rol}>{role.nombre}</option>)}</select></FormField><div className="modal-footer admin-form-actions"><button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button><button className="button button--primary" type="submit" disabled={busy}>Continuar</button></div></form>
}
