const pool = require('../../config/database');
const auditRepository = require('./audit.repository');
const { validateId, validateListQuery } = require('./audit.validation');

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'jwt',
  'secret',
  'authorization',
  'dbpassword',
  'adminpassword',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'clientsecret',
  'contrasena',
  'contrasenia',
  'credentials',
  'credenciales',
  'numerotarjeta',
  'cardnumber',
  'pan',
  'cvv',
  'cvc',
  'cardsecuritycode',
]);

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function canonicalKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isSensitiveKey(key) {
  const canonical = canonicalKey(key);
  return (
    SENSITIVE_KEYS.has(canonical) ||
    canonical.includes('password') ||
    canonical.includes('contrasena') ||
    canonical.includes('contrasenia') ||
    canonical.includes('secret') ||
    canonical.endsWith('token')
  );
}

function isSensitiveString(value) {
  return (
    /\bBearer\s+\S+/i.test(value) ||
    /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/.test(value) ||
    /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/.test(value) ||
    /(?:\d[ -]*?){13,19}/.test(value)
  );
}

function sanitizeValue(value, depth = 0) {
  if (depth > 30) {
    return '[contenido demasiado profundo omitido]';
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (value && typeof value === 'object') {
    const sanitized = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      if (!isSensitiveKey(key)) {
        sanitized[key] = sanitizeValue(nestedValue, depth + 1);
      }
    }

    return sanitized;
  }

  if (typeof value === 'string' && isSensitiveString(value)) {
    return '[contenido sensible omitido]';
  }

  return value;
}

function sanitizeStructuredText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    return sanitizeValue(value);
  }

  try {
    return sanitizeValue(JSON.parse(value));
  } catch {
    return '[contenido no estructurado omitido]';
  }
}

function mapEvent(row) {
  return {
    id_bitacora: row.id_bitacora,
    id_usuario: row.id_usuario,
    user:
      row.id_usuario === null
        ? null
        : {
            id_usuario: row.id_usuario,
            nombre: row.usuario_nombre,
            apellido: row.usuario_apellido,
            nombre_usuario: row.usuario_nombre_usuario,
          },
    modulo: row.modulo,
    accion: row.accion,
    entidad: row.entidad,
    id_entidad: row.id_entidad,
    datos_anteriores: sanitizeStructuredText(row.datos_anteriores),
    datos_nuevos: sanitizeStructuredText(row.datos_nuevos),
    direccion_ip: row.direccion_ip,
    resultado: row.resultado,
    fecha_evento: row.fecha_evento,
  };
}

async function listEvents(rawQuery) {
  const filters = validateListQuery(rawQuery);
  const [rows, total] = await Promise.all([
    auditRepository.list(pool, filters),
    auditRepository.count(pool, filters),
  ]);

  return {
    events: rows.map(mapEvent),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      total_pages: Math.ceil(total / filters.limit),
    },
  };
}

async function getEvent(rawId) {
  const auditId = validateId(rawId);
  const event = await auditRepository.findById(pool, auditId);

  if (!event) {
    throw httpError(404, 'Evento de bitacora no encontrado');
  }

  return mapEvent(event);
}

module.exports = { getEvent, listEvents };
