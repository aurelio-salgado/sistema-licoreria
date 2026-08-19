const test=require('node:test'),assert=require('node:assert/strict');
const { build }=require('./report.repository');
const base={dateFrom:'2026-08-01',dateTo:'2026-08-18',status:null,product:null,seller:null,supplier:null};
test('agregados financieros excluyen anuladas y usan costo histórico',()=>{for(const type of ['top-products','sales-by-seller','gross-profit'])assert.match(build({...base,type}).sql,/estado='completada'/);const sql=build({...base,type:'gross-profit'}).sql;assert.match(sql,/costo_unitario_historico\*dv\.cantidad/);assert.match(sql,/precio_unitario\*dv\.cantidad\)-dv\.descuento/);});
test('stock bajo exige producto activo y umbral de existencia',()=>{const sql=build({...base,type:'low-stock'}).sql;assert.match(sql,/p\.estado='activo'/);assert.match(sql,/p\.existencia<=p\.existencia_minima/);});
test('productos y vendedores usan agrupaciones aprobadas',()=>{assert.match(build({...base,type:'top-products'}).sql,/GROUP BY p\.id_producto/);assert.match(build({...base,type:'sales-by-seller'}).sql,/GROUP BY u\.id_usuario/);});
