const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'report.routes.js'),'utf8');
test('consulta exige reportes.ver y exportación exige ambos permisos',()=>{assert.match(source,/\/:type'.*reportes\.ver/s);assert.match(source,/\/:type\/export'.*reportes\.ver.*reportes\.exportar/s);});
