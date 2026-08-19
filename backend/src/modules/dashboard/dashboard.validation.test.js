const test=require('node:test'),assert=require('node:assert/strict');
const { chartQuery }=require('./dashboard.validation');
test('dashboard valida períodos y conserva treinta días inclusivos',()=>{assert.deepEqual(chartQuery({date_from:'2026-07-20',date_to:'2026-08-18'}),{dateFrom:'2026-07-20',dateTo:'2026-08-18',seller:null});assert.throws(()=>chartQuery({date_from:'2026-08-19',date_to:'2026-08-18'}),/posterior/);});
test('dashboard valida el filtro vendedor y rechaza filtros arbitrarios',()=>{assert.equal(chartQuery({seller:'7'}).seller,7);assert.throws(()=>chartQuery({seller:'Administrador'}),/entero positivo/);assert.throws(()=>chartQuery({role:'Administrador'}),/Filtro no permitido/);});
