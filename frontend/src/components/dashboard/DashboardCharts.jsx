import { formatMoney } from '../../utils/formatters'

const palette = ['#d9a441', '#35b7a5', '#5f8ee4', '#8b70d1', '#55a874', '#d56f76']

function EmptyChart() {
  return <div className="dashboard-chart-empty"><span aria-hidden="true">—</span><p>No hay datos para este período.</p></div>
}

function chartDescription(title, rows, labelKey, valueKey, money = false) {
  if (!rows.length) return `${title}. No hay datos para este período.`
  return `${title}. ${rows.map((row) => `${row[labelKey]}: ${money ? formatMoney(row[valueKey]) : row[valueKey]}`).join('. ')}`
}

export function SalesTrendChart({ rows, period }) {
  const width = 720, height = 250, left = 42, right = 18, top = 20, bottom = 38
  const values = rows.map((row) => Number(row.total) || 0)
  const maximum = Math.max(...values, 1)
  const points = rows.map((row, index) => ({
    x: left + (rows.length === 1 ? (width - left - right) / 2 : index * (width - left - right) / (rows.length - 1)),
    y: top + (1 - values[index] / maximum) * (height - top - bottom),
    row,
  }))
  const line = points.length ? points.slice(1).reduce((path, point, index) => {
    const previous = points[index], middle = (previous.x + point.x) / 2
    return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`
  }, `M ${points[0].x} ${points[0].y}`) : ''
  const area = points.length ? `${line} L ${points.at(-1).x} ${height - bottom} L ${points[0].x} ${height - bottom} Z` : ''
  const labelStep = Math.max(1, Math.ceil(rows.length / 6))

  return <article className="analytics-panel sales-trend-panel">
    <header><div><span className="panel-kicker">TENDENCIA</span><h2>Ventas por período</h2></div><small>{period}</small></header>
    {!rows.length ? <EmptyChart /> : <div className="trend-chart" role="img" aria-label={chartDescription('Ventas por período', rows, 'date', 'total', true)}>
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" preserveAspectRatio="none">
        <defs><linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d9a441" stopOpacity=".34"/><stop offset="1" stopColor="#d9a441" stopOpacity="0"/></linearGradient></defs>
        {[0, .25, .5, .75, 1].map((ratio) => <line key={ratio} className="trend-grid-line" x1={left} x2={width-right} y1={top+ratio*(height-top-bottom)} y2={top+ratio*(height-top-bottom)} />)}
        <path className="trend-area" d={area} />
        <path className="trend-line" d={line} />
        {points.map(({ x, y, row }, index) => <g key={`${row.date}-${index}`}><circle className="trend-point-halo" cx={x} cy={y} r="8"/><circle className="trend-point" cx={x} cy={y} r="3.5"><title>{row.date}: {formatMoney(row.total)}</title></circle>{(index % labelStep === 0 || index === points.length-1) && <text className="trend-label" x={x} y={height-12} textAnchor={index===0?'start':index===points.length-1?'end':'middle'}>{String(row.date).slice(5)}</text>}</g>)}
      </svg>
      <p className="sr-only">{chartDescription('Ventas por período', rows, 'date', 'total', true)}</p>
    </div>}
  </article>
}

export function TopProductsChart({ rows, period }) {
  const maximum = Math.max(...rows.map((row) => Number(row.quantity_sold) || 0), 1)
  return <article className="analytics-panel top-products-panel"><header><div><span className="panel-kicker">ROTACIÓN</span><h2>Productos más vendidos</h2></div><small>{period}</small></header>
    {!rows.length ? <EmptyChart /> : <div className="product-bars" role="img" aria-label={chartDescription('Productos más vendidos', rows, 'product', 'quantity_sold')}>{rows.map((row, index) => <div className="product-bar" key={row.id_producto ?? row.product}><div><span title={row.product}>{row.product}</span><strong>{Number(row.quantity_sold).toLocaleString('es-NI')}</strong></div><div className="product-bar-track"><i style={{ width: `${Math.max(Number(row.quantity_sold) / maximum * 100, 2)}%`, background: palette[index % palette.length] }} /></div></div>)}</div>}
  </article>
}

export function CategoryDonutChart({ rows, period }) {
  const sorted = [...rows].sort((a, b) => Number(b.net_amount) - Number(a.net_amount))
  const displayed = sorted.length > 6 ? [...sorted.slice(0, 5), { category: 'Otros', net_amount: sorted.slice(5).reduce((sum, row) => sum + Number(row.net_amount || 0), 0) }] : sorted
  const total = displayed.reduce((sum, row) => sum + Number(row.net_amount || 0), 0)
  const radius = 70, circumference = 2 * Math.PI * radius
  let accumulated = 0
  return <article className="analytics-panel category-panel"><header><div><span className="panel-kicker">DISTRIBUCIÓN</span><h2>Ventas por categoría</h2></div><small>{period}</small></header>
    {!displayed.length || total <= 0 ? <EmptyChart /> : <div className="donut-layout"><div className="donut-chart" role="img" aria-label={chartDescription('Ventas por categoría', displayed, 'category', 'net_amount', true)}><svg viewBox="0 0 190 190" aria-hidden="true"><circle className="donut-track" cx="95" cy="95" r={radius}/>{displayed.map((row, index) => { const fraction=Number(row.net_amount)/total, length=fraction*circumference, offset=-accumulated*circumference; accumulated+=fraction; return <circle key={row.category} className="donut-segment" cx="95" cy="95" r={radius} stroke={palette[index%palette.length]} strokeDasharray={`${length} ${circumference-length}`} strokeDashoffset={offset}><title>{row.category}: {formatMoney(row.net_amount)} ({(fraction*100).toFixed(1)}%)</title></circle> })}</svg><div><span>Total vendido</span><strong>{formatMoney(total)}</strong></div></div><ul className="donut-legend">{displayed.map((row,index)=>{const percent=Number(row.net_amount)/total*100;return <li key={row.category}><i style={{background:palette[index%palette.length]}}/><div><span>{row.category}</span><small>{formatMoney(row.net_amount)}</small></div><strong>{percent.toLocaleString('es-NI',{maximumFractionDigits:1})}%</strong></li>})}</ul></div>}
  </article>
}
