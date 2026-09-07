import { Link, Outlet } from 'react-router-dom'

function BottleMark() {
  return <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M11 5h10M13 5v5l-4 5v10c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2V15l-4-5V5M9 19h14" /></svg></span>
}

function scrollToSection(event, sectionId) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

  const section = document.getElementById(sectionId)
  if (!section) return

  event.preventDefault()
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.history.pushState(null, '', `#${sectionId}`)
  section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}

export function PublicCatalogLayout() {
  return <div className="public-shell">
    <header className="public-header">
      <div className="public-header-inner">
        <div className="public-brand"><BottleMark /><span><strong>LIQUORIX</strong><small>CATÁLOGO</small></span></div>
        <nav className="public-navigation" aria-label="Acciones del catálogo">
          <a href="#inicio" onClick={(event) => scrollToSection(event, 'inicio')}>Inicio</a>
          <a href="#marcas" onClick={(event) => scrollToSection(event, 'marcas')}>Buscar por marca</a>
          <a className="button button--primary public-header-cta" href="#productos" onClick={(event) => scrollToSection(event, 'productos')}>Explorar catálogo</a>
          <Link className="public-system-link" to="/login">Iniciar sesión</Link>
        </nav>
      </div>
    </header>
    <main className="public-main"><Outlet /></main>
    <footer className="public-footer">
      <div className="public-footer-grid">
        <div className="public-footer-brand"><strong>LIQUORIX</strong><p>Selección y calidad en un solo lugar.</p></div>
        <div className="public-footer-note"><strong>Catálogo</strong><span>Productos, marcas y disponibilidad general.</span></div>
      </div>
      <div className="public-footer-bottom"><span>© 2026 LIQUORIX</span><span>Catálogo informativo</span></div>
    </footer>
  </div>
}
