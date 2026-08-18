import { formatDateTime } from '../../utils/formatters'
import { quantityWithUnit } from '../../utils/inventory'

const movementLabels = {
  compra: 'Compra',
  venta: 'Venta',
  anulacion_compra: 'Anulación de compra',
  anulacion_venta: 'Anulación de venta',
  ajuste: 'Ajuste',
}

function getStockStatus(item) {
  const stock = Number(item.existencia)
  const minimum = Number(item.existencia_minima)
  if (stock === 0) return { key: 'empty', label: 'Agotado' }
  if (stock <= minimum) return { key: 'low', label: 'Stock bajo' }
  return { key: 'normal', label: 'Normal' }
}

export function StockBadge({ item }) {
  const status = getStockStatus(item)
  return <span className={`stock-badge stock-badge--${status.key}`}>{status.label}</span>
}

export function InventoryTable({ items }) {
  return (
    <div className="table-container">
      <table className="data-table inventory-stock-table">
        <thead><tr><th>Código</th><th>Producto</th><th>Unidad</th><th>Existencia</th><th>Mínimo</th><th>Estado de stock</th><th>Estado producto</th></tr></thead>
        <tbody>{items.map((item) => (
          <tr key={item.id_producto}>
            <td><strong>{item.codigo}</strong>{item.codigo_barras && <small className="table-secondary">{item.codigo_barras}</small>}</td>
            <td>{item.nombre}</td>
            <td>{item.unidad_nombre}<small className="table-secondary">{item.abreviatura}</small></td>
            <td>{quantityWithUnit(item.existencia, item)}</td>
            <td>{quantityWithUnit(item.existencia_minima, item)}</td>
            <td><StockBadge item={item} /></td>
            <td><span className={`badge badge--${item.estado === 'activo' ? 'active' : 'inactive'}`}>{item.estado === 'activo' ? 'Activo' : 'Inactivo'}</span></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export function LowStockTable({ items }) {
  return (
    <div className="table-container">
      <table className="data-table inventory-low-table">
        <thead><tr><th>Producto</th><th>Existencia</th><th>Mínimo</th><th>Unidad</th><th>Estado</th></tr></thead>
        <tbody>{items.map((item) => (
          <tr key={item.id_producto}>
            <td><strong>{item.nombre}</strong><small className="table-secondary">{item.codigo}</small></td>
            <td>{quantityWithUnit(item.existencia, item)}</td>
            <td>{quantityWithUnit(item.existencia_minima, item)}</td>
            <td>{item.unidad_nombre}</td>
            <td><StockBadge item={item} /></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function movementReference(movement) {
  if (!movement.tipo_referencia || !movement.id_referencia) return '—'
  const label = movementLabels[movement.tipo_referencia] || movement.tipo_referencia
  return `${label} #${movement.id_referencia}`
}

export function MovementsTable({ items, productsById }) {
  return (
    <div className="table-container">
      <table className="data-table inventory-movements-table">
        <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Naturaleza</th><th>Cantidad</th><th>Anterior</th><th>Posterior</th><th>Referencia</th><th>Motivo</th><th>Usuario</th></tr></thead>
        <tbody>{items.map((movement) => {
          const unit = productsById.get(String(movement.id_producto)) || {}
          const isEntry = movement.naturaleza === 'entrada'
          return (
            <tr key={movement.id_movimiento_inventario}>
              <td>{formatDateTime(movement.fecha_movimiento)}</td>
              <td><strong>{movement.producto_nombre}</strong><small className="table-secondary">{movement.producto_codigo}</small></td>
              <td>{movementLabels[movement.tipo_movimiento] || movement.tipo_movimiento}</td>
              <td><span className={`movement-nature movement-nature--${movement.naturaleza}`}>{isEntry ? 'Entrada' : 'Salida'}</span></td>
              <td className={isEntry ? 'inventory-positive' : 'inventory-negative'}><strong>{isEntry ? '+' : '−'} {quantityWithUnit(movement.cantidad, unit)}</strong></td>
              <td>{quantityWithUnit(movement.existencia_anterior, unit)}</td>
              <td>{quantityWithUnit(movement.existencia_posterior, unit)}</td>
              <td>{movementReference(movement)}</td>
              <td className="inventory-reason">{movement.motivo}</td>
              <td>{[movement.usuario_nombre, movement.usuario_apellido].filter(Boolean).join(' ') || movement.nombre_usuario}</td>
            </tr>
          )
        })}</tbody>
      </table>
    </div>
  )
}
