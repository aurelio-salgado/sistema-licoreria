const assert = require('node:assert/strict');
const test = require('node:test');

const app = require('../../app');

test('la ruta temporal /auth/check-permission ya no existe', async () => {
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const { port } = server.address();
    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/auth/check-permission`,
    );
    const body = await response.json();
    assert.equal(response.status, 404);
    assert.deepEqual(body, {
      success: false,
      message: 'Recurso no encontrado',
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
