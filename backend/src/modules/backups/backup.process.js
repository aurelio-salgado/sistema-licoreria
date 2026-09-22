const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { finished } = require('node:stream/promises');

const env = require('../../config/env');

const DATABASE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

function validateDatabaseName(value) {
  if (typeof value !== 'string' || !DATABASE_NAME_PATTERN.test(value)) {
    throw new Error('Configuracion de base de datos invalida');
  }
  return value;
}

function buildDumpArguments(credentials, databaseName = env.database.name) {
  return [
    `--defaults-extra-file=${credentials}`,
    '--single-transaction', '--routines', '--triggers', '--events',
    '--hex-blob', '--skip-comments', '--databases', validateDatabaseName(databaseName),
  ];
}

function quoteOption(value) {
  const text = String(value ?? '');
  if (/[\r\n\0]/.test(text)) throw new Error('Configuracion de base de datos invalida');
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

async function createCredentialsFile() {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'liquorix-db-'));
  const file = path.join(directory, 'client.cnf');
  const contents = [
    '[client]',
    `host=${quoteOption(env.database.host)}`,
    `port=${env.database.port}`,
    `user=${quoteOption(env.database.user)}`,
    `password=${quoteOption(env.database.password)}`,
    'default-character-set=utf8mb4',
    '',
  ].join('\n');
  await fsp.writeFile(file, contents, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  await fsp.chmod(file, 0o600).catch(() => {});
  return { directory, file };
}

function runProcess(executable, args, { input = null, output = null } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      shell: false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let settled = false;
    let stderrLength = 0;
    const timeout = setTimeout(() => {
      child.kill();
      finish(new Error('El proceso externo excedio el tiempo permitido'));
    }, env.backups.processTimeoutMs);

    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve();
    }

    child.once('error', () => finish(new Error('No fue posible iniciar la herramienta de base de datos')));
    child.stderr.on('data', (chunk) => { stderrLength = Math.min(8192, stderrLength + chunk.length); });
    child.stdin.on('error', () => {});
    if (output) child.stdout.pipe(output);
    else child.stdout.resume();
    if (input) input.pipe(child.stdin);
    else child.stdin.end();
    child.once('close', (code) => finish(code === 0 ? null : new Error('La herramienta de base de datos finalizo con error')));
  });
}

async function withCredentials(callback) {
  const temporary = await createCredentialsFile();
  try {
    return await callback(temporary.file);
  } finally {
    await fsp.rm(temporary.directory, { recursive: true, force: true });
  }
}

async function dump(destination) {
  return withCredentials(async (credentials) => {
    const output = fs.createWriteStream(destination, { flags: 'wx', mode: 0o600 });
    const completion = finished(output);
    try {
      await runProcess(
        env.backups.dumpExecutable,
        buildDumpArguments(credentials),
        { output },
      );
      await completion;
    } catch (error) {
      output.destroy();
      await completion.catch(() => {});
      throw error;
    }
  });
}

async function restore(source) {
  return withCredentials((credentials) => runProcess(
    env.backups.restoreExecutable,
    [`--defaults-extra-file=${credentials}`, validateDatabaseName(env.database.name)],
    { input: fs.createReadStream(source) },
  ));
}

function extractDatabaseTarget(line, keyword) {
  const versionedIfNotExists = String.raw`(?:\/\*!\d+\s+IF\s+NOT\s+EXISTS\s*\*\/\s*)?`;
  const regularIfNotExists = String.raw`(?:IF\s+NOT\s+EXISTS\s+)?`;
  const prefix = keyword === 'CREATE'
    ? String.raw`^\s*CREATE\s+DATABASE\s+${regularIfNotExists}${versionedIfNotExists}`
    : String.raw`^\s*USE\s+`;
  const match = new RegExp(`${prefix}(?:\x60([^\x60]+)\x60|([A-Za-z][A-Za-z0-9_]{0,63}))`, 'i').exec(line);
  return match ? match[1] || match[2] : null;
}

async function inspect(file, expectedDatabase = env.database.name) {
  const stat = await fsp.stat(file);
  if (!stat.isFile() || stat.size === 0) throw new Error('El archivo de respaldo no es valido');

  const databaseName = validateDatabaseName(expectedDatabase);
  const hash = crypto.createHash('sha256');
  const input = fs.createReadStream(file);
  let pending = '';
  let schemaMarker = false;
  let checksumMarker = false;
  let createDatabaseFound = false;
  let useDatabaseFound = false;
  for await (const chunk of input) {
    hash.update(chunk);
    pending += chunk.toString('utf8');
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || '';
    for (const line of lines) {
      schemaMarker ||= /CREATE TABLE(?: IF NOT EXISTS)? [`']?respaldos[`']?/i.test(line);
      checksumMarker ||= /checksum_sha256/i.test(line);
      const createdDatabase = extractDatabaseTarget(line, 'CREATE');
      const usedDatabase = extractDatabaseTarget(line, 'USE');
      if (createdDatabase) {
        createDatabaseFound = true;
        if (createdDatabase !== databaseName) throw new Error('El respaldo pertenece a otra base de datos');
      }
      if (usedDatabase) {
        useDatabaseFound = true;
        if (usedDatabase !== databaseName) throw new Error('El respaldo pertenece a otra base de datos');
      }
    }
  }
  schemaMarker ||= /CREATE TABLE(?: IF NOT EXISTS)? [`']?respaldos[`']?/i.test(pending);
  checksumMarker ||= /checksum_sha256/i.test(pending);
  const finalCreatedDatabase = extractDatabaseTarget(pending, 'CREATE');
  const finalUsedDatabase = extractDatabaseTarget(pending, 'USE');
  if (finalCreatedDatabase) {
    createDatabaseFound = true;
    if (finalCreatedDatabase !== databaseName) throw new Error('El respaldo pertenece a otra base de datos');
  }
  if (finalUsedDatabase) {
    useDatabaseFound = true;
    if (finalUsedDatabase !== databaseName) throw new Error('El respaldo pertenece a otra base de datos');
  }
  if (!schemaMarker || !checksumMarker || !createDatabaseFound || !useDatabaseFound) {
    throw new Error('El formato del respaldo no es compatible con LIQUORIX');
  }
  return { size: stat.size, checksum: hash.digest('hex') };
}

module.exports = {
  buildDumpArguments,
  dump,
  inspect,
  restore,
  runProcess,
  validateDatabaseName,
};
