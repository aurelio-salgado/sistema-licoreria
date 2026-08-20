const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const coordinator = require('./operationCoordinator');

function response() { const res = new EventEmitter(); res.status = () => res; res.json = (body) => body; return res; }

test.beforeEach(() => coordinator.resetForTests());

test('impide restaurar con mutaciones activas y libera al finalizar', () => {
  const res = response(); let next = false;
  coordinator.maintenanceMiddleware({ method: 'POST', originalUrl: '/api/v1/sales' }, res, () => { next = true; });
  assert.equal(next, true); assert.equal(coordinator.getState().activeMutations, 1); assert.equal(coordinator.beginRestore(), false);
  res.emit('finish'); assert.equal(coordinator.getState().activeMutations, 0); assert.equal(coordinator.beginRestore(), true);
  coordinator.endRestore(); assert.equal(coordinator.getState().maintenance, false);
});

test('mantenimiento usa whitelist explicita y no cuenta la propia restauracion', () => {
  assert.equal(coordinator.beginRestore(), true);
  const allowed = response(); let allowedNext = false;
  coordinator.maintenanceMiddleware({ method: 'OPTIONS', originalUrl: '/api/v1/backups' }, allowed, () => { allowedNext = true; });
  assert.equal(allowedNext, true);
  const blocked = response(); const result = coordinator.maintenanceMiddleware({ method: 'POST', originalUrl: '/api/v1/sales' }, blocked, () => {});
  assert.equal(result.message.includes('mantenimiento'), true);
});
