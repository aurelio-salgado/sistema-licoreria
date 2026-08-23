import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { publicCatalogApi, publicImageUrl } from '../api/publicCatalog'
import { EmptyState, Pagination } from '../components/CatalogUi'
import { ErrorState, LoadingState } from '../components/FeedbackStates'
import { formatMoney } from '../utils/formatters'

const initial = { page: 1, limit: 12, search: '', categoryId: '', brandId: '' }

function ProductPlaceholder({ name }) {
  return <div className="public-product-placeholder" role="img" aria-label={`Sin imagen para ${name}`}><svg viewBox="0 0 120 160" aria-hidden="true"><path d="M46 16h28M50 16v25L35 59v73c0 8 6 14 14 14h22c8 0 14-6 14-14V59L70 41V16M35 92h50" /></svg><span>LIQUORIX</span></div>
}

function ProductImage({ product }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [product.imagen])
  const source = publicImageUrl(product.imagen)
  return source && !failed
    ? <img src={source} alt={product.nombre} loading="lazy" onError={() => setFailed(true)} />
    : <ProductPlaceholder name={product.nombre} />
}

function ProductCard({ product }) {
  return <article className="public-product-card">
    <div className="public-product-media"><ProductImage product={product} /></div>
    <div className="public-product-copy"><span>{product.categoria.nombre}</span><small>{product.marca.nombre}</small><h2>{product.nombre}</h2><div className="public-product-meta"><strong>{formatMoney(product.precio_venta)}</strong><p className={product.disponible ? 'public-stock public-stock--available' : 'public-stock public-stock--empty'}><i aria-hidden="true" />{product.disponible ? 'Disponible' : 'Agotado'}</p></div></div>
  </article>
}

function HeroCarousel({ products }) {
  const slides = useMemo(() => products.filter((product) => product.imagen).slice(0, 5), [products])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [pageVisible, setPageVisible] = useState(() => !document.hidden)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [failedImages, setFailedImages] = useState(() => new Set())
  const [autoplayCycle, setAutoplayCycle] = useState(0)
  const activeProduct = slides[index]

  useEffect(() => { setIndex(0); setFailedImages(new Set()) }, [slides])
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateVisibility = () => setPageVisible(!document.hidden)
    const updateMotion = (event) => setReducedMotion(event.matches)
    document.addEventListener('visibilitychange', updateVisibility)
    motionQuery.addEventListener('change', updateMotion)
    return () => {
      document.removeEventListener('visibilitychange', updateVisibility)
      motionQuery.removeEventListener('change', updateMotion)
    }
  }, [])
  useEffect(() => {
    if (slides.length < 2 || paused || !pageVisible || reducedMotion) return undefined
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), 3000)
    return () => window.clearInterval(timer)
  }, [autoplayCycle, pageVisible, paused, reducedMotion, slides.length])

  const move = (step) => {
    setIndex((current) => (current + step + slides.length) % slides.length)
    setAutoplayCycle((current) => current + 1)
  }
  const selectSlide = (slideIndex) => {
    setIndex(slideIndex)
    setAutoplayCycle((current) => current + 1)
  }
  const imageFailed = activeProduct && failedImages.has(activeProduct.id_producto)

  if (!activeProduct) {
    return <div className="public-hero-carousel public-hero-carousel--fallback"><span className="public-hero-halo" /><ProductPlaceholder name="el catálogo LIQUORIX" /></div>
  }

  return (
    <div className="public-hero-carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false) }}>
      <div className="public-hero-slide" key={activeProduct.id_producto}>
        <div className="public-hero-product-media">
          {!imageFailed ? <img src={publicImageUrl(activeProduct.imagen)} alt={activeProduct.nombre} loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'} onError={() => setFailedImages((current) => new Set(current).add(activeProduct.id_producto))} /> : <ProductPlaceholder name={activeProduct.nombre} />}
        </div>
        <span className="public-hero-product-overlay" aria-hidden="true" />
        <div className="public-hero-product-copy"><strong>{activeProduct.nombre}</strong><span>{formatMoney(activeProduct.precio_venta)}</span></div>
      </div>
      {slides.length > 1 && <><button className="public-hero-carousel-control public-hero-carousel-control--previous" type="button" aria-label="Producto anterior" onClick={() => move(-1)}>‹</button><button className="public-hero-carousel-control public-hero-carousel-control--next" type="button" aria-label="Producto siguiente" onClick={() => move(1)}>›</button><div className="public-hero-carousel-indicators" aria-label="Seleccionar producto">{slides.map((product, slideIndex) => <button key={product.id_producto} type="button" className={slideIndex === index ? 'is-active' : ''} aria-label={`Mostrar ${product.nombre}`} aria-current={slideIndex === index ? 'true' : undefined} onClick={() => selectSlide(slideIndex)} />)}</div></>}
    </div>
  )
}

function BrandCard({ brand, selected, onSelect }) {
  const [failed, setFailed] = useState(false)
  const source = publicImageUrl(brand.imagen)
  return <button className={`public-brand-card${selected ? ' public-brand-card--selected' : ''}`} type="button" aria-pressed={selected} onClick={() => onSelect(brand)}><span className="public-brand-logo">{source && !failed ? <img src={source} alt="" loading="lazy" onError={() => setFailed(true)} /> : <strong aria-hidden="true">{brand.nombre.charAt(0).toUpperCase()}</strong>}</span><span className="public-brand-name"><span>{brand.nombre}</span>{selected && <i aria-hidden="true">✓</i>}</span></button>
}

export function PublicCatalogPage() {
  const [filters, setFilters] = useState(initial)
  const [draft, setDraft] = useState(initial)
  const [products, setProducts] = useState([])
  const [facets, setFacets] = useState({ categories: [], brands: [] })
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadedPage, setLoadedPage] = useState(null)
  const [pageAnnouncement, setPageAnnouncement] = useState('')
  const pendingScrollPage = useRef(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await publicCatalogApi.list(filters)
      setProducts(response?.data?.products ?? [])
      setFacets(response?.data?.filters ?? { categories: [], brands: [] })
      setPagination(response?.data?.pagination ?? null)
      setLoadedPage(response?.data?.pagination?.page ?? filters.page)
    } catch (requestError) { setError(requestError.message || 'No fue posible consultar el catálogo.') }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (pendingScrollPage.current !== loadedPage || error) return undefined
    pendingScrollPage.current = null
    setPageAnnouncement(`Página ${loadedPage} cargada`)
    const frame = window.requestAnimationFrame(() => {
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      document.querySelector('#productos')?.scrollIntoView({ behavior, block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [error, loadedPage, products])
  const apply = (event) => { event.preventDefault(); setFilters({ ...draft, page: 1 }) }
  const clear = () => { setDraft(initial); setFilters(initial) }
  const selectBrand = (brand) => {
    const brandId = String(brand.id_marca)
    setDraft((current) => ({ ...current, brandId }))
    setFilters((current) => ({ ...current, brandId, page: 1 }))
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    window.requestAnimationFrame(() => document.querySelector('#productos')?.scrollIntoView({ behavior, block: 'start' }))
  }
  const clearBrand = () => { setDraft((current) => ({ ...current, brandId: '' })); setFilters((current) => ({ ...current, brandId: '', page: 1 })) }
  const changePage = (page) => {
    pendingScrollPage.current = page
    setPageAnnouncement('')
    setFilters((current) => ({ ...current, page }))
  }

  return <div className="public-catalog-page">
    <section id="inicio" className="public-catalog-hero"><div className="public-hero-copy"><span>LIQUORIX</span><h1>Encuentra tu<br /><em>próxima elección</em></h1><p>Explora nuestra selección de bebidas disponibles.</p></div><HeroCarousel products={products} /></section>
    <div className="public-info-strip" aria-label="Información del catálogo"><span>Catálogo actualizado</span><i aria-hidden="true">◆</i><span>Precios visibles</span><i aria-hidden="true">◆</i><span>Disponibilidad general</span></div>
    <section id="marcas" className="public-brands" aria-labelledby="brands-title"><header><span className="eyebrow">MARCAS</span><h2 id="brands-title">Nuestras marcas</h2><p>Selecciona una marca para explorar sus productos.</p>{filters.brandId && <button className="button button--secondary button--compact" type="button" onClick={clearBrand}>Ver todas las marcas</button>}</header><div className="public-brand-grid">{facets.brands.map((brand) => <BrandCard key={brand.id_marca} brand={brand} selected={String(brand.id_marca) === filters.brandId} onSelect={selectBrand} />)}</div></section>
    <section id="productos" className="public-catalog-content" aria-labelledby="catalog-title">
      <header><div><span className="eyebrow">NUESTRA SELECCIÓN</span><h2 id="catalog-title">Explora nuestros productos</h2><p>Consulta precios y disponibilidad general.</p></div></header>
      <form className="public-catalog-filters" onSubmit={apply}>
        <label className="filter-field"><span>Buscar por nombre</span><input className="form-control" type="search" maxLength="150" value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value })} /></label>
        <label id="categorias" className="filter-field"><span>Categoría</span><select className="form-control" value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}><option value="">Todas</option>{facets.categories.map((item) => <option key={item.id_categoria} value={item.id_categoria}>{item.nombre}</option>)}</select></label>
        <label className="filter-field"><span>Marca</span><select className="form-control" value={draft.brandId} onChange={(event) => setDraft({ ...draft, brandId: event.target.value })}><option value="">Todas</option>{facets.brands.map((item) => <option key={item.id_marca} value={item.id_marca}>{item.nombre}</option>)}</select></label>
        <div className="public-filter-actions"><button className="button button--secondary" type="button" onClick={clear}>Limpiar</button><button className="button button--primary" type="submit">Buscar</button></div>
      </form>
      {loading ? <LoadingState message="Cargando catálogo…" /> : error ? <ErrorState title="No se pudo cargar el catálogo" message={error} actionLabel="Reintentar" onAction={load} /> : products.length === 0 ? <EmptyState message="No hay productos para los filtros seleccionados." /> : <div className="public-products-grid">{products.map((product) => <ProductCard key={product.id_producto} product={product} />)}</div>}
      {!error && <Pagination pagination={pagination} disabled={loading} onPageChange={changePage} />}
      <span className="sr-only" role="status" aria-live="polite">{pageAnnouncement}</span>
    </section>
  </div>
}
