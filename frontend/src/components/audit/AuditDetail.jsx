import { Link } from 'react-router-dom'
import { formatDateTime } from '../../utils/formatters'

const entityRoutes = { venta: '/sales', compra: '/purchases', caja: '/cash' }

function JsonSnapshot({ title, value }) {
  let content = 'Sin datos registrados.'
  if (value !== null && value !== undefined) content = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return <section className="audit-snapshot"><h3>{title}</h3><pre tabIndex="0">{content}</pre></section>
}

export function AuditDetail({ event }) {
  const baseRoute = entityRoutes[String(event.entidad ?? '').toLowerCase()]
  const userName = event.user?.nombre_usuario ?? event.user?.nombre ?? 'Sistema / No disponible'
  return (
    <div className="audit-detail">
      <dl className="audit-metadata">
        <div><dt>Fecha y hora</dt><dd>{formatDateTime(event.fecha_evento)}</dd></div><div><dt>Usuario</dt><dd>{userName}</dd></div>
        <div><dt>Módulo</dt><dd>{event.modulo || '—'}</dd></div><div><dt>Acción</dt><dd>{event.accion || '—'}</dd></div>
        <div><dt>Entidad</dt><dd>{event.entidad || '—'}</dd></div><div><dt>ID entidad</dt><dd>{event.id_entidad ?? '—'}</dd></div>
        <div><dt>Resultado</dt><dd><span className={`audit-result audit-result--${String(event.resultado ?? '').toLowerCase()}`}>{event.resultado || 'No disponible'}</span></dd></div><div><dt>Dirección IP</dt><dd>{event.direccion_ip || 'No disponible'}</dd></div>
      </dl>
      {baseRoute && event.id_entidad && <Link className="button button--secondary audit-entity-link" to={`${baseRoute}/${event.id_entidad}`}>Abrir registro relacionado</Link>}
      <div className="audit-snapshots"><JsonSnapshot title="Datos anteriores" value={event.datos_anteriores} /><JsonSnapshot title="Datos nuevos" value={event.datos_nuevos} /></div>
    </div>
  )
}
