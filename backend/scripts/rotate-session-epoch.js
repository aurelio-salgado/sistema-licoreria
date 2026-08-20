const pool = require('../src/config/database');
const sessionEpoch = require('../src/services/sessionEpoch');

async function run({
  rotate = sessionEpoch.rotate,
  closePool = () => pool.end(),
  argumentCount = process.argv.slice(2).length,
  stdout = (message) => console.log(message),
  stderr = (message) => console.error(message),
} = {}) {
  let failure = argumentCount === 0 ? null : new Error('Argumentos no permitidos');

  if (!failure) {
    try {
      await rotate();
    } catch (error) {
      failure = error;
    }
  }

  try {
    await closePool();
  } catch (error) {
    failure ||= error;
  }

  if (failure) {
    stderr('No fue posible rotar la version global de sesiones.');
    return 1;
  }

  stdout('Version global de sesiones rotada correctamente.');
  return 0;
}

if (require.main === module) {
  run().then((exitCode) => { process.exitCode = exitCode; });
}

module.exports = { run };
