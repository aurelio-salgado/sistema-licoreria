import { useLayoutEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
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
  const location = useLocation()
  const navigationRef = useRef(null)
  const pendingScrollTopRef = useRef(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, roles, hasPermission, logout } = useAuth()
  const visibleItems = navigationItems.filter((item) => hasPermission(item.permission))
  const displayName = user?.nombre_completo || user?.nombre_usuario || 'Usuario'
  const roleLabel = roles.length > 0 ? roles.join(', ') : 'Sin rol asignado'

  const handleNavigation = () => {
    pendingScrollTopRef.current = navigationRef.current?.scrollTop ?? null
    setIsMenuOpen(false)
  }

  useLayoutEffect(() => {
    const navigation = navigationRef.current
    if (!navigation) return

    if (pendingScrollTopRef.current !== null) {
      navigation.scrollTop = pendingScrollTopRef.current
      pendingScrollTopRef.current = null
      return
    }

    const activeItem = navigation.querySelector('[aria-current="page"]')
    if (!activeItem) return

    const navigationBounds = navigation.getBoundingClientRect()
    const itemBounds = activeItem.getBoundingClientRect()
    if (itemBounds.top < navigationBounds.top) {
      navigation.scrollTop -= navigationBounds.top - itemBounds.top + 8
    } else if (itemBounds.bottom > navigationBounds.bottom) {
      navigation.scrollTop += itemBounds.bottom - navigationBounds.bottom + 8
    }
  }, [location.pathname])

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

        <nav ref={navigationRef} className="sidebar-nav" aria-label="Navegación principal">
          <p className="nav-caption">MENÚ PRINCIPAL</p>
          {visibleItems.map((item) =>
            item.children ? (
              <div className="nav-group" key={item.label}>
                <div className="nav-item nav-item--group">
                  <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                <div className="nav-submenu">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.path}
                      className={({ isActive }) => `nav-subitem${isActive ? ' nav-subitem--active' : ''}`}
                      to={child.path}
                      onClick={handleNavigation}
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ) : item.available ? (
              <NavLink
                key={item.label}
                className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
                to={item.path}
                end={item.path === '/'}
                onClick={handleNavigation}
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
