import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../api/dashboard'
import { salesApi } from '../api/sales'
import { useAuth } from '../auth/useAuth'
import { CategoryDonutChart, SalesTrendChart, TopProductsChart } from '../components/dashboard/DashboardCharts'
import { ErrorState, LoadingState } from '../components/FeedbackStates'
import { formatDateTime, formatMoney } from '../utils/formatters'
import { getQuickAccess, shouldLoadDashboardAnalytics } from '../utils/dashboardAccess'

function iso(date) { return date.toISOString().slice(0, 10) }
function presetRange(preset) { const end=new Date(),start=new Date(end); if(preset==='7')start.setDate(end.getDate()-6);else if(preset==='30')start.setDate(end.getDate()-29); return {date_from:iso(start),date_to:iso(end)} }
function MetricIcon({ type }) {
  if(type==='sales')return <svg viewBox="0 0 24 24"><path d="M4 19V8m0 11h16M8 15l3-3 3 2 5-6"/><path d="M16 8h3v3"/></svg>
  if(type==='count')return <svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h3m3 0h2M8 16h3m3 0h2"/></svg>
  return <svg viewBox="0 0 24 24"><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4m0 3h.01"/></svg>
}
function MetricCard({ tone, icon, label, value, detail }) {
  return <article className={`dashboard-metric dashboard-metric--${tone}`}><div className="metric-icon" aria-hidden="true"><MetricIcon type={icon}/></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>
}
function RecentSales({ rows=[] }) {
  return <article className="analytics-panel recent-sales-panel"><header><div><span className="panel-kicker">ACTIVIDAD</span><h2>Ventas recientes</h2></div><small>Últimas 5 completadas</small></header>{rows.length?<ul className="recent-sales-list">{rows.map((sale)=><li key={sale.id_venta}><div className="recent-sale-mark" aria-hidden="true">$</div><div><strong>{sale.numero_factura||sale.numero_venta}</strong><span>{sale.cliente}</span><small>{formatDateTime(sale.fecha_venta)}</small></div><div><strong>{formatMoney(sale.total)}</strong><Link to={`/sales/${sale.id_venta}`}>Ver venta</Link></div></li>)}</ul>:<div className="dashboard-chart-empty"><span aria-hidden="true">—</span><p>No hay ventas completadas recientes.</p></div>}</article>
}

function BasicDashboard({ user, roles, hasPermission }) {
  const displayName = user?.nombre_completo || [user?.nombre, user?.apellido].filter(Boolean).join(' ') || user?.nombre_usuario || 'usuario'
  const canCreate=hasPermission('ventas.crear'),canOpenCash=hasPermission('caja.abrir')
  const [operationalStatus,setOperationalStatus]=useState(null),[operationError,setOperationError]=useState('')
  const loadOperationalStatus=useCallback(async()=>{if(!canCreate)return;setOperationError('');try{setOperationalStatus((await salesApi.getOperationalStatus())?.data)}catch(error){setOperationError(error.message||'No fue posible consultar el estado operativo de caja.')}},[canCreate])
  useEffect(()=>{loadOperationalStatus()},[loadOperationalStatus])
  const cashRequired=operationalStatus?.control_caja_activo&&!operationalStatus?.caja_abierta
  const accesses = getQuickAccess(hasPermission, operationalStatus).filter((item)=>!(canCreate&&!operationalStatus&&item.permission==='ventas.crear'))
  return <div className="basic-dashboard page-stack"><section className="basic-dashboard-hero"><div className="basic-hero-copy"><div className="basic-brand"><span aria-hidden="true">L</span><strong>LIQUORIX</strong></div><p className="basic-kicker">GESTIÓN INTELIGENTE PARA TU NEGOCIO</p><h1>Bienvenido, {displayName}</h1><p className="basic-welcome">Todo listo para comenzar tu jornada.</p>{roles?.length>0&&<span className="basic-role">{roles.join(' · ')}</span>}<blockquote>Control, claridad y confianza en cada operación.</blockquote></div><div className="basic-hero-art" aria-hidden="true"><svg viewBox="0 0 360 300"><circle cx="210" cy="140" r="108"/><circle cx="210" cy="140" r="76"/><path d="M32 236 152 116l62 62 114-114"/><path d="m288 64h40v40"/><rect x="73" y="185" width="34" height="51" rx="5"/><rect x="119" y="157" width="34" height="79" rx="5"/><rect x="165" y="126" width="34" height="110" rx="5"/></svg><span>OPERACIÓN SEGURA</span></div></section>{operationError&&<div className="inline-alert inline-alert--error" role="alert">{operationError} <button className="link-button" type="button" onClick={loadOperationalStatus}>Reintentar</button></div>}{cashRequired&&<section className="cash-operation-card" aria-labelledby="cash-operation-title"><div><span>CAJA NO ABIERTA</span><h2 id="cash-operation-title">Abre tu caja para comenzar a registrar ventas.</h2>{!canOpenCash&&<p>Solicita a un usuario autorizado que habilite tu operación de caja.</p>}</div>{canOpenCash&&<Link className="button button--primary" to="/cash">Abrir caja</Link>}</section>}{accesses.length>0&&<section className="quick-access-section"><header><span>ACCESOS RÁPIDOS</span><h2>Continúa tu jornada</h2></header><div className="quick-access-grid">{accesses.map((item)=><Link key={item.permission} className="quick-access-card" to={item.path}><span aria-hidden="true">{item.icon}</span><div><strong>{item.label}</strong><small>{item.detail}</small></div><i aria-hidden="true">→</i></Link>)}</div></section>}</div>
}

export function DashboardPage() {
  const { hasPermission, user, roles }=useAuth(),canCharts=shouldLoadDashboardAnalytics(hasPermission)
  const [overview,setOverview]=useState(null),[charts,setCharts]=useState(null),[preset,setPreset]=useState('30'),[custom,setCustom]=useState(presetRange('30')),[seller,setSeller]=useState(''),[loading,setLoading]=useState(canCharts),[error,setError]=useState('')
  const filters=useMemo(()=>({...(preset==='custom'?custom:presetRange(preset)),seller}),[preset,custom,seller])
  const loadOverview=useCallback(async()=>{try{setOverview((await dashboardApi.overview())?.data)}catch(requestError){setError(requestError.message)}},[])
  const loadCharts=useCallback(async()=>{try{setCharts((await dashboardApi.charts(filters))?.data)}catch(requestError){setError(requestError.message)}},[filters])
  useEffect(()=>{if(!canCharts)return;setLoading(true);setError('');Promise.all([loadOverview(),loadCharts()]).finally(()=>setLoading(false))},[canCharts,loadOverview,loadCharts])
  if(!canCharts)return <BasicDashboard user={user} roles={roles} hasPermission={hasPermission}/>
  if(loading&&!overview)return <LoadingState fullPage message="Cargando dashboard…" />
  if(error&&!overview)return <ErrorState fullPage message={error} actionLabel="Reintentar" onAction={loadOverview} />
  const period=charts?`${charts.period.date_from} — ${charts.period.date_to}`:''
  return <div className="dashboard-shell page-stack">
    <header className="dashboard-heading"><div><span className="eyebrow">DASHBOARD</span><h1>Resumen del negocio</h1><p>Indicadores del día y comportamiento comercial de LIQUORIX.</p></div><span className="dashboard-live"><i/> Datos actualizados</span></header>
    {error&&<div className="dashboard-alert" role="alert">{error}</div>}
    <section className="dashboard-metrics" aria-label="Indicadores de hoy"><MetricCard tone="gold" icon="sales" label="Ventas hoy" value={formatMoney(overview?.sales_total)} detail="Total de ventas completadas"/><MetricCard tone="blue" icon="count" label="Número de ventas" value={(overview?.sales_count??0).toLocaleString('es-NI')} detail="Operaciones completadas hoy"/><MetricCard tone="violet" icon="stock" label="Stock bajo" value={(overview?.low_stock_count??0).toLocaleString('es-NI')} detail="Productos activos por reponer"/></section>
    <section className="dashboard-period" aria-label="Filtros de gráficos"><div className="period-segments" role="group" aria-label="Seleccionar período">{[['today','Hoy'],['7','7 días'],['30','30 días'],['custom','Personalizado']].map(([value,label])=><button key={value} className={preset===value?'period-button period-button--active':'period-button'} type="button" aria-pressed={preset===value} onClick={()=>setPreset(value)}>{label}</button>)}</div><div className="dashboard-filter-fields"><label>Vendedor<select value={seller} onChange={(event)=>setSeller(event.target.value)}><option value="">Todos</option>{charts?.sellers?.map((item)=><option key={item.id_usuario} value={item.id_usuario}>{item.nombre}</option>)}</select></label>{preset==='custom'&&<div className="custom-period"><label>Desde<input type="date" value={custom.date_from} onChange={(event)=>setCustom((value)=>({...value,date_from:event.target.value}))}/></label><label>Hasta<input type="date" value={custom.date_to} onChange={(event)=>setCustom((value)=>({...value,date_to:event.target.value}))}/></label></div>}</div></section>
    <div className="dashboard-analytics"><SalesTrendChart rows={charts?.sales_by_period??[]} period={period}/><TopProductsChart rows={charts?.top_products??[]} period={period}/><CategoryDonutChart rows={charts?.sales_by_category??[]} period={period}/><RecentSales rows={overview?.recent_sales}/></div>
  </div>
}
