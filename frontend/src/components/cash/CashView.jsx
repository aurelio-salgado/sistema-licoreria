import { Link } from 'react-router-dom'
import { EmptyState, StatusBadge } from '../CatalogUi'
import { formatDateTime, formatMoney } from '../../utils/formatters'

export function Difference({ value }) {
  const amount = Number(value ?? 0)
  const label = amount > 0 ? 'Sobrante' : amount < 0 ? 'Faltante' : 'Caja cuadrada'
  return <span className={`cash-difference cash-difference--${amount > 0 ? 'positive' : amount < 0 ? 'negative' : 'balanced'}`}><strong>{label}</strong> · {formatMoney(amount)}</span>
}

export function CashSummaryCards({ cash, summary }) {
  const expected = cash.estado === 'cerrada' && cash.monto_esperado !== null ? cash.monto_esperado : summary.expected
  return <div className="cash-summary-grid"><article><span>Monto apertura</span><strong>{formatMoney(cash.monto_apertura)}</strong></article><article><span>Entradas</span><strong className="cash-positive">+ {formatMoney(summary.entries)}</strong></article><article><span>Salidas</span><strong className="cash-negative">− {formatMoney(summary.exits)}</strong></article><article className="cash-summary-main"><span>{cash.estado === 'abierta' ? 'Esperado actual' : 'Monto esperado'}</span><strong>{formatMoney(expected)}</strong><small>{cash.estado === 'abierta' && 'Ayuda visual calculada con los movimientos actuales.'}</small></article></div>
}

export function CashMovements({ movements }) {
  if (!movements?.length) return <EmptyState message="Esta caja todavía no tiene movimientos." />
  return <div className="table-container"><table className="data-table cash-movements-table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Naturaleza</th><th>Concepto</th><th>Venta</th><th>Monto</th></tr></thead><tbody>{movements.map((movement) => { const entry = movement.naturaleza === 'entrada'; return <tr key={movement.id_movimiento_caja}><td>{formatDateTime(movement.fecha_movimiento)}</td><td>{movement.tipo_movimiento}</td><td>{entry ? 'Entrada' : 'Salida'}</td><td>{movement.concepto}</td><td>{movement.id_venta ? <Link to={`/sales/${movement.id_venta}`}>Venta #{movement.id_venta}</Link> : '—'}</td><td className={entry ? 'cash-positive' : 'cash-negative'}><strong>{entry ? '+' : '−'} {formatMoney(movement.monto)}</strong></td></tr> })}</tbody></table></div>
}

export function CashMetadata({ cash }) {
  const user = [cash.usuario?.nombre, cash.usuario?.apellido].filter(Boolean).join(' ') || cash.usuario?.nombre_usuario
  return <dl className="purchase-metadata"><div><dt>ID caja</dt><dd>#{cash.id_caja}</dd></div><div><dt>Estado</dt><dd><StatusBadge status={cash.estado} /></dd></div><div><dt>Apertura</dt><dd>{formatDateTime(cash.fecha_apertura)}</dd></div><div><dt>Cierre</dt><dd>{formatDateTime(cash.fecha_cierre)}</dd></div>{user && <div><dt>Usuario</dt><dd>{user}</dd></div>}<div className="metadata-span-2"><dt>Observación</dt><dd>{cash.observacion || 'Sin observación'}</dd></div>{cash.estado === 'cerrada' && <><div><dt>Monto contado</dt><dd>{formatMoney(cash.monto_contado)}</dd></div><div><dt>Monto cierre</dt><dd>{formatMoney(cash.monto_cierre)}</dd></div><div className="metadata-span-2"><dt>Resultado</dt><dd><Difference value={cash.diferencia} /></dd></div></>}</dl>
}
