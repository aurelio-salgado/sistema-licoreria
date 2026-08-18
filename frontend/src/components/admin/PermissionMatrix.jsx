import { useMemo } from 'react'

function moduleLabel(value) {
  if (!value) return 'General'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function PermissionMatrix({ permissions, selectedIds, disabled, onChange }) {
  const groups = useMemo(() => {
    const grouped = new Map()
    permissions.forEach((permission) => {
      const module = permission.modulo || permission.codigo.split('.')[0]
      if (!grouped.has(module)) grouped.set(module, [])
      grouped.get(module).push(permission)
    })
    return [...grouped.entries()]
  }, [permissions])

  const toggle = (permissionId) => {
    const next = new Set(selectedIds)
    if (next.has(permissionId)) next.delete(permissionId)
    else next.add(permissionId)
    onChange(next)
  }

  return <div className="permission-matrix">{groups.map(([module, items]) => <fieldset className="permission-group" key={module} disabled={disabled}><legend>{moduleLabel(module)}</legend><div>{items.map((permission) => <label className="permission-option" key={permission.id_permiso}><input type="checkbox" checked={selectedIds.has(permission.id_permiso)} onChange={() => toggle(permission.id_permiso)} /><span><strong>{permission.codigo}</strong><small>{permission.descripcion || permission.nombre}</small></span></label>)}</div></fieldset>)}</div>
}
