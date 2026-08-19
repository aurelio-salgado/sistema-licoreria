const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'dashboard.routes.js'),'utf8');
const repository=fs.readFileSync(path.join(__dirname,'dashboard.repository.js'),'utf8');
test('ambos endpoints analíticos exigen dashboard.graficos',()=>{assert.match(source,/\/charts'.*dashboard\.graficos/s);assert.match(source,/\/'\s*,\s*requirePermission\('dashboard\.graficos'\)/s);assert.doesNotMatch(source,/requirePermission\('dashboard\.ver'\)/);});
test('indicadores diarios y recientes excluyen ventas anuladas',()=>{assert.equal((repository.match(/estado='completada'/g)||[]).length>=4,true);assert.match(repository,/LIMIT 5/);assert.match(repository,/CURDATE\(\)/);});
test('filtro vendedor se aplica por id y no por nombre de rol',()=>{assert.match(repository,/v\.id_usuario=\?/);assert.doesNotMatch(repository,/Administrador|Vendedor|Consulta/);});
