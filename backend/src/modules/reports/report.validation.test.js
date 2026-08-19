const test=require('node:test'),assert=require('node:assert/strict');
const { REPORT_TYPES,reportQuery,reportType }=require('./report.validation');
test('whitelist contiene exactamente los ocho reportes',()=>assert.equal(REPORT_TYPES.length,8));
test('rechaza tipos y filtros arbitrarios',()=>{assert.throws(()=>reportType('otro'),/no encontrado/);assert.throws(()=>reportQuery('low-stock',{seller:'1'}),/Filtro no permitido/);});
test('aplica estados y paginación predeterminados',()=>{const sales=reportQuery('sales-by-date',{}),purchases=reportQuery('purchases-by-supplier',{});assert.equal(sales.status,'completada');assert.equal(purchases.status,'recibida');assert.deepEqual([sales.page,sales.limit],[1,20]);});
test('valida fechas, ids y límite máximo',()=>{assert.throws(()=>reportQuery('top-products',{date_from:'2026-08-20',date_to:'2026-08-18'}),/posterior/);assert.throws(()=>reportQuery('gross-profit',{product:'x'}),/entero positivo/);assert.throws(()=>reportQuery('low-stock',{limit:'101'}),/entre 1 y 100/);});
