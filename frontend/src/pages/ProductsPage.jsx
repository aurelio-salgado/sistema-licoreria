import { useCallback, useEffect, useMemo, useState } from 'react'
import { catalogsApi } from '../api/catalogs'
import { productsApi } from '../api/products'
import { useAuth } from '../auth/useAuth'
import { ConfirmDialog, EmptyState, FormField, Modal, PageHeader, Pagination, StatusBadge } from '../components/CatalogUi'
import { ErrorState, LoadingState } from '../components/FeedbackStates'
import { formatMoney, formatQuantity } from '../utils/formatters'

const PAGE_LIMIT = 10
const emptyFilters = {
  page: 1,
  limit: PAGE_LIMIT,
  search: '',
  status: '',
  categoryId: '',
  brandId: '',
}

const catalogDefinitions = [
  { key: 'categories', endpoint: '/categories', idField: 'id_categoria' },
  { key: 'brands', endpoint: '/brands', idField: 'id_marca' },
  { key: 'units', endpoint: '/units', idField: 'id_unidad' },
]

async function loadActiveCatalog(definition) {
  const firstResponse = await catalogsApi.list(definition.endpoint, {
    page: 1,
    limit: 100,
    search: '',
    status: 'activo',
  })
  const firstData = firstResponse?.data
  const records = [...(firstData?.[definition.key] ?? [])]
  const totalPages = firstData?.pagination?.total_pages ?? 1

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await catalogsApi.list(definition.endpoint, {
      page,
      limit: 100,
      search: '',
      status: 'activo',
    })
    records.push(...(response?.data?.[definition.key] ?? []))
  }
  return records
}

function decimalError(value, { label, scale, maximum, required = false, positive = false }) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return required ? `${label} es obligatorio.` : ''
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${scale}})?$`).test(normalized)) {
    return `${label} admite como máximo ${scale} decimales.`
  }
  const number = Number(normalized)
  if (!Number.isFinite(number) || (positive ? number <= 0 : number < 0)) {
    return `${label} debe ser ${positive ? 'mayor que cero' : 'mayor o igual que cero'}.`
  }
  if (number > maximum) return `${label} está fuera del rango permitido.`
  return ''
}

function createInitialValues(product) {
  return {
    codigo: product?.codigo ?? '',
    codigo_barras: product?.codigo_barras ?? '',
    nombre: product?.nombre ?? '',
    descripcion: product?.descripcion ?? '',
    id_categoria: product?.categoria?.id_categoria ? String(product.categoria.id_categoria) : '',
    id_marca: product?.marca?.id_marca ? String(product.marca.id_marca) : '',
    id_unidad: product?.unidad?.id_unidad ? String(product.unidad.id_unidad) : '',
    costo_promedio: product?.costo_promedio ?? '',
    precio_venta: product?.precio_venta ?? '',
    existencia_minima: product?.existencia_minima ?? '0',
    porcentaje_impuesto: product?.porcentaje_impuesto ?? '0',
  }
}

function validateProduct(values) {
  const errors = {}
  const textFields = [
    ['codigo', 'El código', 60, true],
    ['codigo_barras', 'El código de barras', 80, false],
    ['nombre', 'El nombre', 150, true],
  ]
  textFields.forEach(([field, label, maximum, required]) => {
    const value = values[field].trim()
    if (required && !value) errors[field] = `${label} es obligatorio.`
    else if (value.length > maximum) errors[field] = `${label} no puede superar ${maximum} caracteres.`
  })
  if (new TextEncoder().encode(values.descripcion.trim()).length > 65535) {
    errors.descripcion = 'La descripción supera el tamaño permitido.'
  }
  ;['id_categoria', 'id_marca', 'id_unidad'].forEach((field) => {
    if (!/^[1-9]\d*$/.test(values[field])) errors[field] = 'Selecciona una opción válida.'
  })
  const decimalFields = {
    costo_promedio: { label: 'El costo promedio', scale: 2, maximum: 9999999999.99 },
    precio_venta: { label: 'El precio de venta', scale: 2, maximum: 9999999999.99, required: true, positive: true },
    existencia_minima: { label: 'La existencia mínima', scale: 3, maximum: 999999999.999 },
    porcentaje_impuesto: { label: 'El porcentaje de impuesto', scale: 2, maximum: 999.99 },
  }
  Object.entries(decimalFields).forEach(([field, options]) => {
    const error = decimalError(values[field], options)
    if (error) errors[field] = error
  })
  return errors
}

function buildPayload(values, { omitAverageCost }) {
  const payload = {
    codigo: values.codigo.trim(),
    codigo_barras: values.codigo_barras.trim() || null,
    nombre: values.nombre.trim(),
    descripcion: values.descripcion.trim() || null,
    id_categoria: Number(values.id_categoria),
    id_marca: Number(values.id_marca),
    id_unidad: Number(values.id_unidad),
    precio_venta: Number(values.precio_venta),
    existencia_minima: values.existencia_minima.trim() ? Number(values.existencia_minima) : 0,
    porcentaje_impuesto: values.porcentaje_impuesto.trim() ? Number(values.porcentaje_impuesto) : 0,
  }
  if (!omitAverageCost && values.costo_promedio.trim()) {
    payload.costo_promedio = Number(values.costo_promedio)
  }
  return payload
}

function ProductForm({ product, catalogs, busy, apiError, onCancel, onSubmit }) {
  const [values, setValues] = useState(() => createInitialValues(product))
  const [errors, setErrors] = useState({})
  const hasStock = Number(product?.existencia ?? 0) > 0
  const selectedUnit = catalogs.units.find((unit) => String(unit.id_unidad) === values.id_unidad)
  const setValue = (field, value) => setValues((current) => ({ ...current, [field]: value }))
  const submit = (event) => {
    event.preventDefault()
    const nextErrors = validateProduct(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit(buildPayload(values, { omitAverageCost: hasStock || !values.costo_promedio.trim() }))
  }

  return (
    <form className="product-form" onSubmit={submit} noValidate>
      {product && (
        <div className="readonly-summary">
          <span>Existencia actual</span>
          <strong>{formatQuantity(product.existencia, product.unidad?.permite_decimales)} {product.unidad?.abreviatura}</strong>
          <small>La existencia solo cambia mediante operaciones de inventario.</small>
        </div>
      )}
      <div className="product-form-grid">
        <FormField label="Código" name="codigo" error={errors.codigo} help="Obligatorio · máximo 60 caracteres">
          <input id="codigo" className="form-control" maxLength="60" value={values.codigo} disabled={busy} onChange={(event) => setValue('codigo', event.target.value)} />
        </FormField>
        <FormField label="Código de barras" name="codigo_barras" error={errors.codigo_barras} help="Opcional · máximo 80 caracteres">
          <input id="codigo_barras" className="form-control" maxLength="80" value={values.codigo_barras} disabled={busy} onChange={(event) => setValue('codigo_barras', event.target.value)} />
        </FormField>
        <div className="product-form-span-2">
          <FormField label="Nombre" name="nombre" error={errors.nombre} help="Obligatorio · máximo 150 caracteres">
            <input id="nombre" className="form-control" maxLength="150" value={values.nombre} disabled={busy} onChange={(event) => setValue('nombre', event.target.value)} />
          </FormField>
        </div>
        <div className="product-form-span-2">
          <FormField label="Descripción" name="descripcion" error={errors.descripcion} help="Opcional">
            <textarea id="descripcion" className="form-control form-control--textarea" value={values.descripcion} disabled={busy} onChange={(event) => setValue('descripcion', event.target.value)} />
          </FormField>
        </div>
        <FormField label="Categoría" name="id_categoria" error={errors.id_categoria}>
          <select id="id_categoria" className="form-control" value={values.id_categoria} disabled={busy} onChange={(event) => setValue('id_categoria', event.target.value)}><option value="">Selecciona una categoría</option>{catalogs.categories.map((item) => <option key={item.id_categoria} value={item.id_categoria}>{item.nombre}</option>)}</select>
        </FormField>
        <FormField label="Marca" name="id_marca" error={errors.id_marca}>
          <select id="id_marca" className="form-control" value={values.id_marca} disabled={busy} onChange={(event) => setValue('id_marca', event.target.value)}><option value="">Selecciona una marca</option>{catalogs.brands.map((item) => <option key={item.id_marca} value={item.id_marca}>{item.nombre}</option>)}</select>
        </FormField>
        <FormField label="Unidad de medida" name="id_unidad" error={errors.id_unidad} help={selectedUnit ? `Permite cantidades decimales: ${selectedUnit.permite_decimales ? 'Sí' : 'No'}` : undefined}>
          <select id="id_unidad" className="form-control" value={values.id_unidad} disabled={busy} onChange={(event) => setValue('id_unidad', event.target.value)}><option value="">Selecciona una unidad</option>{catalogs.units.map((item) => <option key={item.id_unidad} value={item.id_unidad}>{item.nombre} ({item.abreviatura})</option>)}</select>
        </FormField>
        <FormField label="Existencia mínima" name="existencia_minima" error={errors.existencia_minima} help={`No negativa · máximo 3 decimales${selectedUnit && !selectedUnit.permite_decimales ? ' · esta unidad se expresa normalmente en enteros' : ''}`}>
          <input id="existencia_minima" className="form-control" type="number" min="0" step={selectedUnit?.permite_decimales === false ? '1' : '0.001'} value={values.existencia_minima} disabled={busy} onChange={(event) => setValue('existencia_minima', event.target.value)} />
        </FormField>
        <FormField label="Costo promedio" name="costo_promedio" error={errors.costo_promedio} help={hasStock ? 'El costo promedio se actualiza mediante compras.' : 'Opcional · no negativo · máximo 2 decimales'}>
          <input id="costo_promedio" className="form-control" type="number" min="0" step="0.01" value={values.costo_promedio} readOnly={hasStock} aria-readonly={hasStock} disabled={busy} onChange={(event) => setValue('costo_promedio', event.target.value)} />
        </FormField>
        <FormField label="Precio de venta" name="precio_venta" error={errors.precio_venta} help="Obligatorio · mayor que cero · máximo 2 decimales">
          <input id="precio_venta" className="form-control" type="number" min="0.01" step="0.01" value={values.precio_venta} disabled={busy} onChange={(event) => setValue('precio_venta', event.target.value)} />
        </FormField>
        <FormField label="Porcentaje de impuesto" name="porcentaje_impuesto" error={errors.porcentaje_impuesto} help="Valor informativo del producto; la tasa operativa actual se configura de forma global.">
          <input id="porcentaje_impuesto" className="form-control" type="number" min="0" step="0.01" value={values.porcentaje_impuesto} disabled={busy} onChange={(event) => setValue('porcentaje_impuesto', event.target.value)} />
        </FormField>
      </div>
      {apiError && <div className="inline-alert inline-alert--error" role="alert">{apiError}</div>}
      <div className="modal-footer product-form-actions">
        <button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button>
        <button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar producto'}</button>
      </div>
    </form>
  )
}

export function ProductsPage() {
  const { hasPermission } = useAuth()
  const [filters, setFilters] = useState(emptyFilters)
  const [searchInput, setSearchInput] = useState('')
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [catalogs, setCatalogs] = useState({ categories: [], brands: [], units: [] })
  const [loading, setLoading] = useState(true)
  const [catalogsLoading, setCatalogsLoading] = useState(true)
  const [error, setError] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [editingProduct, setEditingProduct] = useState(undefined)
  const [statusProduct, setStatusProduct] = useState(null)
  const [saving, setSaving] = useState(false)
  const [mutationError, setMutationError] = useState('')

  const canCreate = hasPermission('productos.crear')
  const canEdit = hasPermission('productos.editar')
  const canChangeStatus = hasPermission('productos.desactivar')
  const loadProducts = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await productsApi.list(filters)
      setProducts(response?.data?.products ?? [])
      setPagination(response?.data?.pagination ?? null)
    } catch (requestError) { setError(requestError.message || 'No fue posible cargar los productos.') }
    finally { setLoading(false) }
  }, [filters])
  const loadCatalogs = useCallback(async () => {
    setCatalogsLoading(true); setCatalogError('')
    try {
      const results = await Promise.all(catalogDefinitions.map(loadActiveCatalog))
      setCatalogs(Object.fromEntries(catalogDefinitions.map((definition, index) => [definition.key, results[index]])))
    } catch (requestError) { setCatalogError(requestError.message || 'No fue posible cargar los catálogos.') }
    finally { setCatalogsLoading(false) }
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { loadCatalogs() }, [loadCatalogs])
  useEffect(() => { if (!feedback) return undefined; const timer = window.setTimeout(() => setFeedback(''), 4500); return () => window.clearTimeout(timer) }, [feedback])

  const closeEditor = () => { setEditingProduct(undefined); setMutationError('') }
  const saveProduct = async (payload) => {
    setSaving(true); setMutationError('')
    try {
      if (editingProduct) await productsApi.update(editingProduct.id_producto, payload)
      else await productsApi.create(payload)
      setFeedback(`Producto ${editingProduct ? 'actualizado' : 'creado'} correctamente.`)
      closeEditor(); await loadProducts()
    } catch (requestError) { setMutationError(requestError.message || 'No fue posible guardar el producto.') }
    finally { setSaving(false) }
  }
  const changeStatus = async () => {
    const nextStatus = statusProduct.estado === 'activo' ? 'inactivo' : 'activo'
    setSaving(true); setMutationError('')
    try {
      await productsApi.updateStatus(statusProduct.id_producto, nextStatus)
      setFeedback(`Producto ${nextStatus === 'activo' ? 'reactivado' : 'desactivado'} correctamente.`)
      setStatusProduct(null); await loadProducts()
    } catch (requestError) { setMutationError(requestError.message || 'No fue posible cambiar el estado.') }
    finally { setSaving(false) }
  }
  const catalogOptions = useMemo(() => ({ categories: catalogs.categories, brands: catalogs.brands }), [catalogs])
  const statusAction = statusProduct?.estado === 'activo' ? 'Desactivar' : 'Reactivar'

  return (
    <div className="page-stack products-page">
      <PageHeader eyebrow="PRODUCTOS" title="Productos" description="Administra los artículos disponibles, sus precios y datos de clasificación." action={canCreate ? <button className="button button--primary" type="button" disabled={catalogsLoading || Boolean(catalogError)} onClick={() => setEditingProduct(null)}>Nuevo producto</button> : null} />
      {feedback && <div className="inline-alert inline-alert--success" role="status">{feedback}</div>}
      {catalogError && <div className="inline-alert inline-alert--error" role="alert">{catalogError} <button className="link-button" type="button" onClick={loadCatalogs}>Reintentar</button></div>}
      <section className="catalog-panel" aria-label="Listado de productos">
        <form className="product-filters" onSubmit={(event) => { event.preventDefault(); setFilters((current) => ({ ...current, page: 1, search: searchInput.trim() })) }}>
          <label className="search-field"><span>Buscar</span><input className="form-control" type="search" maxLength="150" placeholder="Buscar por nombre, código o código de barras" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></label>
          <button className="button button--secondary product-search-button" type="submit">Buscar</button>
          <label className="filter-field"><span>Categoría</span><select className="form-control" value={filters.categoryId} disabled={catalogsLoading} onChange={(event) => setFilters((current) => ({ ...current, page: 1, categoryId: event.target.value }))}><option value="">Todas</option>{catalogOptions.categories.map((item) => <option key={item.id_categoria} value={item.id_categoria}>{item.nombre}</option>)}</select></label>
          <label className="filter-field"><span>Marca</span><select className="form-control" value={filters.brandId} disabled={catalogsLoading} onChange={(event) => setFilters((current) => ({ ...current, page: 1, brandId: event.target.value }))}><option value="">Todas</option>{catalogOptions.brands.map((item) => <option key={item.id_marca} value={item.id_marca}>{item.nombre}</option>)}</select></label>
          <label className="filter-field filter-field--status"><span>Estado</span><select className="form-control" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, page: 1, status: event.target.value }))}><option value="">Todos</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select></label>
        </form>
        {loading ? <LoadingState message="Cargando productos…" /> : error ? <ErrorState title="No se pudieron cargar los productos" message={error} actionLabel="Reintentar" onAction={loadProducts} /> : products.length === 0 ? <EmptyState message="Prueba con otros términos de búsqueda o filtros." /> : (
          <div className="table-container"><table className="data-table products-table"><thead><tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Marca</th><th>Unidad</th><th>Existencia</th><th>Costo promedio</th><th>Precio de venta</th><th>Estado</th>{(canEdit || canChangeStatus) && <th className="actions-column">Acciones</th>}</tr></thead><tbody>{products.map((product) => <tr key={product.id_producto}><td>{product.codigo}</td><td><strong>{product.nombre}</strong>{product.codigo_barras && <small className="table-secondary">{product.codigo_barras}</small>}</td><td>{product.categoria?.nombre}</td><td>{product.marca?.nombre}</td><td>{product.unidad?.abreviatura || product.unidad?.nombre}</td><td>{formatQuantity(product.existencia, product.unidad?.permite_decimales)}</td><td>{formatMoney(product.costo_promedio)}</td><td>{formatMoney(product.precio_venta)}</td><td><StatusBadge status={product.estado} /></td>{(canEdit || canChangeStatus) && <td><div className="table-actions">{canEdit && <button className="button button--secondary button--compact" type="button" disabled={catalogsLoading || Boolean(catalogError)} onClick={() => setEditingProduct(product)}>Editar</button>}{canChangeStatus && <button className={`button button--compact button--${product.estado === 'activo' ? 'danger' : 'success'}`} type="button" onClick={() => { setMutationError(''); setStatusProduct(product) }}>{product.estado === 'activo' ? 'Desactivar' : 'Reactivar'}</button>}</div></td>}</tr>)}</tbody></table></div>
        )}
        {!error && <Pagination pagination={pagination} disabled={loading} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />}
      </section>
      {editingProduct !== undefined && <Modal title={editingProduct ? 'Editar producto' : 'Nuevo producto'} onClose={closeEditor} busy={saving} wide><ProductForm key={editingProduct?.id_producto ?? 'new'} product={editingProduct} catalogs={catalogs} busy={saving} apiError={mutationError} onCancel={closeEditor} onSubmit={saveProduct} /></Modal>}
      {statusProduct && <ConfirmDialog title={`${statusAction} producto`} message={`¿Confirmas que deseas ${statusAction.toLowerCase()} “${statusProduct.nombre}”?`} confirmLabel={statusAction} tone={statusProduct.estado === 'activo' ? 'danger' : 'success'} busy={saving} onCancel={() => { setStatusProduct(null); setMutationError('') }} onConfirm={changeStatus} />}
      {statusProduct && mutationError && <div className="floating-error" role="alert">{mutationError}</div>}
    </div>
  )
}
