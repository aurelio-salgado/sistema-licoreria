import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function NotFoundPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="result-page result-page--standalone">
      <span className="result-brand">LIQUORIX · SISTEMA DE GESTIÓN</span>
      <span className="result-code">404</span>
      <h1>Página no encontrada</h1>
      <p>La dirección que intentas visitar no existe en Liquorix.</p>
      <Link className="button button--primary" to={isAuthenticated ? '/' : '/login'}>
        {isAuthenticated ? 'Volver al inicio' : 'Ir al acceso'}
      </Link>
    </div>
  )
}
