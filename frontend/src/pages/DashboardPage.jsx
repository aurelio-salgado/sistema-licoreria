import { useAuth } from '../auth/useAuth'

export function DashboardPage() {
  const { user } = useAuth()
  const displayName = user?.nombre_completo || user?.nombre_usuario || 'usuario'

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">INICIO</span>
          <h1>Panel principal</h1>
          <p>Bienvenido, {displayName}. Tu espacio de trabajo está listo.</p>
        </div>
        <span className="status-pill"><i /> Sesión activa</span>
      </div>

      <section className="welcome-card">
        <div>
          <span className="welcome-icon" aria-hidden="true">L</span>
          <div>
            <h2>Administración clara y segura</h2>
            <p>
              Esta primera fase valida el acceso, la sesión y la navegación segura. Los
              indicadores del negocio se incorporarán en una etapa posterior.
            </p>
          </div>
        </div>
        <span className="phase-badge">Entorno seguro</span>
      </section>

      <section className="placeholder-grid" aria-label="Próximas capacidades">
        <article><span>01</span><h3>Navegación por permisos</h3><p>Solo ves los módulos autorizados para tu perfil.</p></article>
        <article><span>02</span><h3>Sesión protegida</h3><p>La identidad se valida nuevamente al actualizar la página.</p></article>
        <article><span>03</span><h3>Base preparada</h3><p>El layout está listo para integrar los módulos del negocio.</p></article>
      </section>
    </div>
  )
}
