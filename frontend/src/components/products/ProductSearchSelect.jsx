import { useEffect, useId, useRef, useState } from 'react'
import { productsApi } from '../../api/products'
import { formatMoney, formatQuantity } from '../../utils/formatters'
import { createProductSearchFilters } from '../../utils/productSearch'

export function ProductSearchSelect({ selectedId, selectedProduct, busy, onSelect }) {
  const listboxId = useId()
  const searchId = useId()
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const searchRef = useRef(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    if (!selectedId || selectedProduct) return
    let active = true
    setLoading(true)
    setError('')
    productsApi.getById(selectedId).then((response) => {
      if (!active) return
      const product = response?.data?.product
      if (product) onSelect(product)
    }).catch((requestError) => {
      if (active) setError(requestError.message || 'No fue posible cargar el producto seleccionado.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [onSelect, selectedId, selectedProduct])

  useEffect(() => {
    if (!open) return undefined
    let active = true
    const search = query.trim()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const response = await productsApi.list(createProductSearchFilters(search))
        if (active) {
          setResults(response?.data?.products ?? [])
          setActiveIndex(-1)
        }
      } catch (requestError) {
        if (active) {
          setResults([])
          setError(requestError.message || 'No fue posible buscar productos.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }, search ? 300 : 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [open, query])

  useEffect(() => {
    if (!open) return undefined
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  const closeDropdown = (restoreFocus = false) => {
    setOpen(false)
    setActiveIndex(-1)
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const openDropdown = () => {
    setQuery('')
    setResults([])
    setError('')
    setActiveIndex(-1)
    setOpen(true)
  }

  const choose = (product) => {
    if (Number(product.existencia) <= 0) return
    onSelect(product)
    closeDropdown(true)
  }

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeDropdown(true)
      return
    }
    if (!results.length) return
    const selectable = results
      .map((product, index) => Number(product.existencia) > 0 ? index : -1)
      .filter((index) => index >= 0)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!selectable.length) return
      setActiveIndex((current) => {
        const position = selectable.indexOf(current)
        return event.key === 'ArrowDown'
          ? selectable[(position + 1) % selectable.length]
          : selectable[(position <= 0 ? selectable.length : position) - 1]
      })
    }
    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      choose(results[activeIndex])
    }
  }

  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) closeDropdown()
  }

  return <div className="product-combobox" ref={rootRef} onBlur={handleBlur}>
    <span className="product-select-label">Producto</span>
    <button
      ref={triggerRef}
      className="product-select-trigger"
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? listboxId : undefined}
      disabled={busy}
      onClick={() => open ? closeDropdown() : openDropdown()}
      onKeyDown={(event) => {
        if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
          event.preventDefault()
          openDropdown()
        }
      }}
    >
      <span className={selectedProduct ? '' : 'product-select-placeholder'}>
        {selectedProduct?.nombre ?? 'Seleccionar producto'}
      </span>
      <span className="product-select-chevron" aria-hidden="true">⌄</span>
    </button>

    {open && <div className="product-search-panel">
      <label className="form-field" htmlFor={searchId}>
        <span>Buscar producto</span>
        <input
          ref={searchRef}
          id={searchId}
          className="form-control"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${results[activeIndex]?.id_producto}` : undefined}
          autoComplete="off"
          placeholder="Nombre, código o código de barras"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
        <span className="form-help">{loading ? 'Cargando productos…' : query.trim() ? 'Resultados de búsqueda remota.' : 'Productos activos disponibles.'}</span>
      </label>

      <div id={listboxId} className="product-search-results" role="listbox" aria-label="Resultados de productos">
        <strong className="product-search-heading">{query.trim() ? 'Resultados' : 'Productos disponibles'}</strong>
        {error
          ? <p className="product-search-message product-search-message--error" role="alert">{error}</p>
          : !loading && !results.length
            ? <p className="product-search-message">No se encontraron productos.</p>
            : results.map((product, index) => {
              const unit = product.unidad?.abreviatura || product.unidad?.nombre || 'unidades'
              const exhausted = Number(product.existencia) <= 0
              return <button
                id={`${listboxId}-${product.id_producto}`}
                key={product.id_producto}
                className={index === activeIndex ? 'product-search-option product-search-option--active' : 'product-search-option'}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                aria-disabled={exhausted}
                disabled={exhausted}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(product)}
              >
                <strong>{product.nombre}</strong>
                <span>Código: {product.codigo}</span>
                <span>{exhausted ? 'Agotado' : `${formatQuantity(product.existencia, product.unidad?.permite_decimales)} ${unit} disponibles`}</span>
                <span>{formatMoney(product.precio_venta)}</span>
              </button>
            })}
      </div>
    </div>}
  </div>
}
