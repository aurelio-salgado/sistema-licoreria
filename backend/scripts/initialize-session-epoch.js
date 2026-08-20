const pool = require('../src/config/database');
const sessionEpoch = require('../src/services/sessionEpoch');

async function main() {
  await sessionEpoch.initialize();
  console.log('Version global de sesiones inicializada correctamente.');
}

main().catch(() => {
  console.error('No fue posible inicializar la version global de sesiones.');
  process.exitCode = 1;
}).finally(() => pool.end());
