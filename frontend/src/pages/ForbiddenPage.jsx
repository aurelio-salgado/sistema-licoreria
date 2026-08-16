import { Link } from 'react-router-dom'

export function ForbiddenPage() {
  return (
    <div className="result-page">
      <span className="result-brand">LIQUORIX · SISTEMA DE GESTIÓN</span>
      <span className="result-code">403</span>
      <h1>Acceso no autorizado</h1>
      <p>Tu perfil no cuenta con el permiso necesario para consultar esta sección.</p>
      <Link className="button button--primary" to="/">Volver al inicio</Link>
    </div>
  )
}
