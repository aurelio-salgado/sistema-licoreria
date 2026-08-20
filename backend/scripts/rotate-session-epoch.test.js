const assert = require('node:assert/strict');
const test = require('node:test');

const { run } = require('./rotate-session-epoch');

const SECRET_UUID = '6e3fd108-6bb1-45f3-95bf-dc89753be859';

function outputCapture() {
  const stdout = [];
  const stderr = [];
  return {
    stdout,
    stderr,
    writeOut: (message) => stdout.push(message),
    writeError: (message) => stderr.push(message),
  };
}

test('rota mediante el servicio, cierra el pool y no expone el UUID', async () => {
  const output = outputCapture();
  let rotations = 0;
  let closes = 0;

  const exitCode = await run({
    rotate: async () => { rotations += 1; return SECRET_UUID; },
    closePool: async () => { closes += 1; },
    argumentCount: 0,
    stdout: output.writeOut,
    stderr: output.writeError,
  });

  assert.equal(exitCode, 0);
  assert.equal(rotations, 1);
  assert.equal(closes, 1);
  assert.deepEqual(output.stdout, ['Version global de sesiones rotada correctamente.']);
  assert.deepEqual(output.stderr, []);
  assert.doesNotMatch(`${output.stdout}\n${output.stderr}`, new RegExp(SECRET_UUID, 'i'));
});

test('un fallo devuelve codigo distinto de cero, cierra el pool y usa error generico', async () => {
  const output = outputCapture();
  let closes = 0;

  const exitCode = await run({
    rotate: async () => { throw new Error(`Fallo con ${SECRET_UUID}`); },
    closePool: async () => { closes += 1; },
    argumentCount: 0,
    stdout: output.writeOut,
    stderr: output.writeError,
  });

  assert.equal(exitCode, 1);
  assert.equal(closes, 1);
  assert.deepEqual(output.stdout, []);
  assert.deepEqual(output.stderr, ['No fue posible rotar la version global de sesiones.']);
  assert.doesNotMatch(`${output.stdout}\n${output.stderr}`, new RegExp(SECRET_UUID, 'i'));
});

test('rechaza argumentos de conexion sin intentar la rotacion', async () => {
  const output = outputCapture();
  let rotations = 0;
  let closes = 0;

  const exitCode = await run({
    rotate: async () => { rotations += 1; },
    closePool: async () => { closes += 1; },
    argumentCount: 2,
    stdout: output.writeOut,
    stderr: output.writeError,
  });

  assert.equal(exitCode, 1);
  assert.equal(rotations, 0);
  assert.equal(closes, 1);
  assert.deepEqual(output.stdout, []);
  assert.deepEqual(output.stderr, ['No fue posible rotar la version global de sesiones.']);
});

test('un fallo al cerrar el pool impide declarar exito', async () => {
  const output = outputCapture();

  const exitCode = await run({
    rotate: async () => SECRET_UUID,
    closePool: async () => { throw new Error('No se pudo cerrar'); },
    argumentCount: 0,
    stdout: output.writeOut,
    stderr: output.writeError,
  });

  assert.equal(exitCode, 1);
  assert.deepEqual(output.stdout, []);
  assert.deepEqual(output.stderr, ['No fue posible rotar la version global de sesiones.']);
});
