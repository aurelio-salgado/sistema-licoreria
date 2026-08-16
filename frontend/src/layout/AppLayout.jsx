import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { navigationItems } from '../navigation/navigation'

function LiquorixMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32">
        <path d="M11 5h10M13 5v5l-4 5v10c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2V15l-4-5V5M9 19h14" />
      </svg>
    </span>
  )
}

export function AppLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, roles, hasPermission, logout } = useAuth()
  const visibleItems = navigationItems.filter((item) => hasPermission(item.permission))
  const displayName = user?.nombre_completo || user?.nombre_usuario || 'Usuario'
  const roleLabel = roles.length > 0 ? roles.join(', ') : 'Sin rol asignado'

  return (
    <div className="app-shell">
      <aside className={isMenuOpen ? 'sidebar sidebar--open' : 'sidebar'}>
        <div className="sidebar-brand">
          <LiquorixMark />
          <div>
            <strong>LIQUORIX</strong>
            <span>Sistema de gestión</span>
          </div>
          <button
            className="icon-button sidebar-close"
            type="button"
            aria-label="Cerrar navegación"
            onClick={() => setIsMenuOpen(false)}
          >
            ×
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          <p className="nav-caption">MENÚ PRINCIPAL</p>
          {visibleItems.map((item) =>
            item.available ? (
              <NavLink
                key={item.label}
                className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
                to={item.path}
                end
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ) : (
              <div className="nav-item nav-item--pending" key={item.label} aria-disabled="true">
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
                <small>Próximamente</small>
              </div>
            ),
          )}
        </nav>

        <div className="sidebar-footer">
          <span>Operación centralizada</span>
          <small>Inventario y facturación</small>
        </div>
      </aside>

      {isMenuOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Cerrar navegación"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            type="button"
            aria-label="Abrir navegación"
            onClick={() => setIsMenuOpen(true)}
          >
            ☰
          </button>
          <div className="topbar-title">
            <span>Área administrativa</span>
            <strong>Panel principal</strong>
          </div>
          <div className="user-menu">
            <span className="user-avatar" aria-hidden="true">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <div className="user-copy">
              <strong>{displayName}</strong>
              <span>{roleLabel}</span>
            </div>
            <button className="button button--ghost logout-button" type="button" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
