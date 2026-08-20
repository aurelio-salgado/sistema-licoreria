let maintenance = false;
let activeMutations = 0;
let backupBusy = false;

const maintenanceAllowlist = [
  { method: 'OPTIONS', pattern: /^\/api\/v1\// },
];

function requestPath(req) {
  return req.originalUrl.split('?')[0];
}

function isAllowedDuringMaintenance(req) {
  return maintenanceAllowlist.some(
    ({ method, pattern }) => req.method === method && pattern.test(requestPath(req)),
  );
}

function isRestoreRequest(req) {
  return req.method === 'POST' && /^\/api\/v1\/backups\/\d+\/restore$/.test(requestPath(req));
}

function maintenanceMiddleware(req, res, next) {
  if (maintenance && !isAllowedDuringMaintenance(req)) {
    return res.status(503).json({
      success: false,
      message: 'El sistema se encuentra temporalmente en mantenimiento',
    });
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !isRestoreRequest(req)) {
    activeMutations += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      activeMutations = Math.max(0, activeMutations - 1);
    };
    res.once('finish', release);
    res.once('close', release);
  }
  return next();
}

function acquireBackup() {
  if (maintenance || backupBusy) return false;
  backupBusy = true;
  return true;
}

function releaseBackup() { backupBusy = false; }

function beginRestore() {
  if (maintenance || backupBusy || activeMutations > 0) return false;
  maintenance = true;
  return true;
}

function endRestore() { maintenance = false; }
function getState() { return { maintenance, activeMutations, backupBusy }; }
function resetForTests() { maintenance = false; activeMutations = 0; backupBusy = false; }

module.exports = {
  acquireBackup,
  beginRestore,
  endRestore,
  getState,
  maintenanceMiddleware,
  releaseBackup,
  resetForTests,
};
