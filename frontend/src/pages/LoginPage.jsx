import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [credentials, setCredentials] = useState({ nombre_usuario: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  useEffect(() => {
    setCredentials({ nombre_usuario: '', password: '' })
    setError('')
    setIsSubmitting(false)
    setIsPasswordVisible(false)
  }, [location.key])

  const handleChange = (event) => {
    setCredentials((current) => ({ ...current, [event.target.name]: event.target.value }))
    if (error) setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!credentials.nombre_usuario.trim() || !credentials.password) {
      setError('Ingresa tu usuario y contraseña.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await login({
        nombre_usuario: credentials.nombre_usuario.trim(),
        password: credentials.password,
      })
      const destination = location.state?.from?.pathname || '/dashboard'
      navigate(destination, { replace: true })
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        setError('Usuario o contraseña incorrectos.')
      } else {
        setError(requestError.message || 'No fue posible iniciar sesión.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <section className="login-intro">
        <div className="login-brand">
          <span className="login-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32">
              <path d="M11 5h10M13 5v5l-4 5v10c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2V15l-4-5V5" />
              <path d="M9 19h14" />
            </svg>
          </span>
          <div>
            <strong>LIQUORIX</strong>
            <span>SISTEMA DE GESTIÓN</span>
          </div>
        </div>
        <div className="login-intro-copy">
          <span className="eyebrow eyebrow--light">CONTROL PARA TU NEGOCIO</span>
          <h1>Tu operación, clara y bajo control.</h1>
          <p>Gestión integral para el control de inventario, ventas y operaciones de tu negocio.</p>
          <ul className="login-benefits" aria-label="Características de Liquorix">
            <li>Control de inventario</li>
            <li>Ventas y facturación</li>
            <li>Gestión centralizada</li>
          </ul>
        </div>
        <small>Administración segura para licorerías</small>
      </section>

      <main className="login-panel">
        <form className="login-card" onSubmit={handleSubmit} noValidate>
          <div>
            <span className="eyebrow">ACCESO SEGURO</span>
            <h2>Bienvenido de vuelta</h2>
            <p>Inicia sesión para continuar en Liquorix.</p>
          </div>

          <label className="field">
            <span>Usuario</span>
            <input
              autoComplete="username"
              autoFocus
              name="nombre_usuario"
              onChange={handleChange}
              placeholder="Tu nombre de usuario"
              value={credentials.nombre_usuario}
            />
          </label>

          <div className="field">
            <label htmlFor="login-password">Contraseña</label>
            <div className="password-input">
              <input
                autoComplete="current-password"
                id="login-password"
                name="password"
                onChange={handleChange}
                placeholder="Tu contraseña"
                type={isPasswordVisible ? 'text' : 'password'}
                value={credentials.password}
              />
              <button
                aria-label={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="password-toggle"
                onClick={() => setIsPasswordVisible((visible) => !visible)}
                type="button"
              >
                {isPasswordVisible ? (
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9 5.2 9 5.2a14.5 14.5 0 0 1-2.2 2.7M6.3 6.3C4.2 7.7 3 9.2 3 9.2S6.5 16 12 16c1 0 2-.2 2.9-.6" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <div className="form-error" role="alert">{error}</div>}

          <button className="button button--primary button--wide" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
          </button>

          <p className="login-help">¿Problemas para acceder? Contacta al administrador.</p>
        </form>
      </main>
    </div>
  )
}
