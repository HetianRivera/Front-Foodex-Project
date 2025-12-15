import { api, setAuthToken } from './client';

// Decodifica el payload de un JWT sin validarlo (uso en frontend para extraer user_id)
function decodeJwtPayload(token) {
  try {
    const part = String(token || '').split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4 || 4)) % 4, '=');
    const ascii = typeof atob === 'function' ? atob(padded) : Buffer.from(padded, 'base64').toString('binary');
    // Intentar decodificar a UTF-8 seguro
    let jsonStr;
    try {
      const hex = Array.from(ascii, c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
      jsonStr = decodeURIComponent(hex);
    } catch {
      jsonStr = ascii;
    }
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

// Demo mode: bypass backend authentication and return a mock user/token
export async function loginRut(rut, role) {
  const data = {
    access: 'demo-access-token',
    rut,
    role,
    user: { id: 1, name: 'Demo User', role },
  };
  setAuthToken(data.access);
  try { localStorage.setItem('foodex_token', data.access); } catch {}
  return data;
}

export async function loginWithTokenEndpoint(correoElectronico, contrasena) {
  const resp = await api.post(
    '/api/token/',
    { username: correoElectronico, password: contrasena },
    { withCredentials: false }
  );
  const tokenData = resp.data || {};
  if (tokenData?.access) {
    setAuthToken(tokenData.access);
    try { localStorage.setItem('foodex_token', tokenData.access); } catch {}
  }
  const user = await getCurrentUserFlexible().catch(() => null);
  await ensureAcademicEntitiesOnLogin().catch(() => {});
  normalizeAndStoreUser(user, { rut: correoElectronico });
  return { ...tokenData, user };
}

export function clearAuth() {
  try { localStorage.removeItem('foodex_token'); } catch {}
  try { localStorage.removeItem('foodex_user'); } catch {}
  setAuthToken(null);
}

// Real backend login with rut + password (sin auto-registro)
// POST /auth/login { rut, password } -> { access, refresh?, user }
export async function loginWithPassword(rut, contrasena, extra = {}) {
  // Incluimos campos requeridos por el esquema Swagger para posible registro.
  // Intento de token directo sin credenciales (evitar preflight con credentials si no son necesarias)
  const tokenData = await obtainTokenFlexible(rut, contrasena);
  if (tokenData?.access) {
    setAuthToken(tokenData.access);
    try { localStorage.setItem('foodex_token', tokenData.access); } catch {}
  }
  await ensureAcademicEntitiesOnLogin().catch(() => {});
  normalizeAndStoreUser(tokenData?.user, { rut });
  return tokenData;
}

// Real backend login with username + password
// Probará múltiples endpoints y payloads comunes (username/password, rut/contrasena)
export async function loginWithUsername(username, password, extra = {}) {
  const tokenData = await obtainTokenFlexibleUsername(username, password, extra);
  if (tokenData?.access) {
    setAuthToken(tokenData.access);
    try { localStorage.setItem('foodex_token', tokenData.access); } catch {}
  }

  const userRecord = await ensureUserRecord(username, tokenData?.user, extra).catch(() => tokenData?.user);
  await ensureAcademicEntitiesOnLogin().catch(() => {});
  normalizeAndStoreUser(userRecord, { rut: undefined });
  return { ...tokenData, user: userRecord };
}

// Helper opcional para obtener listado de usuarios (debug)
export async function listUsuarios(params = {}) {
  const resp = await api.get('/api/v1/usuarios/', { params });
  return resp.data;
}

// Helper para obtener un usuario por id (si el backend lo soporta: /api/v1/usuarios/{id}/)
export async function getUsuario(id) {
  const resp = await api.get(`/api/v1/usuarios/${encodeURIComponent(id)}/`);
  return resp.data;
}

// --- Helpers internos ---

// Intenta múltiples endpoints configurables para obtener token JWT / sesión
// Se puede personalizar añadiendo REACT_APP_TOKEN_ENDPOINT en .env
// Permite definir múltiples endpoints separados por coma en REACT_APP_TOKEN_ENDPOINTS
// Además de uno único en REACT_APP_TOKEN_ENDPOINT
const envList = (process.env.REACT_APP_TOKEN_ENDPOINTS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const TOKEN_ENDPOINT_CANDIDATES = [
  process.env.REACT_APP_TOKEN_ENDPOINT,
  ...envList,
  '/api/v1/auth/login/',
  '/api/token/',
  '/auth/jwt/create/',
  '/api/v1/token/',
].filter(Boolean);

async function obtainTokenFlexible(rut, contrasena) {
  let lastError;
  for (const ep of TOKEN_ENDPOINT_CANDIDATES) {
    try {
      console.debug('[auth] intentando endpoint token:', ep);
      const resp = await api.post(ep, { rut, contrasena }, { withCredentials: false });
      console.debug('[auth] éxito token endpoint:', ep, 'status:', resp.status);
      return resp.data || {};
    } catch (err) {
      const status = err?.response?.status;
      console.warn('[auth] fallo endpoint token:', ep, 'status:', status, 'msg:', err?.response?.data || err.message);
      lastError = err;
    }
  }
  throw lastError || new Error('No se pudo obtener token');
}

// Variante flexible que prueba username/password primero (y variantes comunes)
async function obtainTokenFlexibleUsername(username, password, extra = {}) {
  let lastError;
  const payloads = [
    { username, password, ...extra },
    { rut: username, contrasena: password, ...extra },
    { email: username, password, ...extra },
  ];
  for (const ep of TOKEN_ENDPOINT_CANDIDATES) {
    for (const payload of payloads) {
      try {
        console.debug('[auth] intentando endpoint token:', ep, 'payloadKeys:', Object.keys(payload));
        const resp = await api.post(ep, payload, { withCredentials: false });
        console.debug('[auth] éxito token endpoint:', ep, 'status:', resp.status);
        return resp.data || {};
      } catch (err) {
        const status = err?.response?.status;
        console.warn('[auth] fallo endpoint token:', ep, 'status:', status, 'msg:', err?.response?.data || err.message);
        lastError = err;
      }
    }
  }
  throw lastError || new Error('No se pudo obtener token');
}

function buildRegistrationPayload(data) {
  // Aseguramos campos obligatorios (Swagger): nombre, apellido, rut, correo_electronico, contrasena, estado
  // Usamos valores por defecto mínimos válidos si no se han proporcionado.
  const cleanedRut = (data.rut || '').replace(/[^0-9kK-]/g, '');
  const finalRut = cleanedRut || (data.username ? String(data.username) : '11111111-1');
  const emailFromUsername = (() => {
    if (data.correo_electronico && data.correo_electronico.length >= 3) return data.correo_electronico;
    const u = data.username ? String(data.username) : '';
    if (u.includes('@')) return u;
    const safe = (u || 'user').replace(/[^a-zA-Z0-9._-]/g, '');
    return `${safe || 'user'}@example.local`;
  })();
  return {
    nombre: data.nombre && data.nombre.length >= 1 ? data.nombre : 'Nombre',
    apellido: data.apellido && data.apellido.length >= 1 ? data.apellido : 'Apellido',
    rut: finalRut,
    username: data.username ?? undefined,
    correo_electronico: emailFromUsername,
    contrasena: data.contrasena && data.contrasena.length >= 1 ? data.contrasena : 'Temporal123',
    estado: data.estado !== undefined ? data.estado : true,
  };
}

async function registerUsuario(data) {
  // Mantener campos por defecto, pero permitir campos extra (roles, id_rol, etc.)
  const defaults = buildRegistrationPayload(data);
  const payload = { ...defaults, ...data };
  return api.post('/api/v1/usuarios/', payload, { withCredentials: false }).then(r => r.data);
}

function guessEmailFromUsername(username) {
  if (!username) return 'user@example.local';
  if (String(username).includes('@')) return username;
  return `${String(username).replace(/[^a-zA-Z0-9._-]/g,'') || 'user'}@example.local`;
}

async function getCurrentUserFlexible() {
  // Evitar todas las consultas GET a endpoints /me o /usuarios/{id}
  // Solo decodificar el JWT si existe y devolver un perfil mínimo
  try {
    const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('foodex_token') : null;
    const payload = decodeJwtPayload(token);
    if (payload) {
      const uid = payload.user_id ?? payload.id ?? payload.uid ?? null;
      return {
        id_usuario: uid,
        nombre: payload.nombre ?? payload.name ?? '',
        apellido: payload.apellido ?? '',
        rut: payload.rut ?? undefined,
        correo_electronico: payload.correo_electronico ?? payload.email ?? '',
        estado: true,
        roles: [],
      };
    }
  } catch {}
  // Si no hay payload, devolver null para que el caller maneje el caso sin GETs
  return null;
}


async function ensureUserRecord(username, tokenUser, extra = {}) {
  try {
    const me = await getCurrentUserFlexible();
    if (me) return me;
  } catch {}
  // Evitar 500 del backend: no listar/filtrar usuarios. Si no hay /me ni /{id}/ usable,
  // devolver un usuario sintético para no bloquear el login.
  const correo = guessEmailFromUsername(username);
  let roleName;
  try { roleName = localStorage.getItem('foodex_ui_role') || undefined; } catch {}
  let roleId = null;
  if (roleName) {
    try {
      const rolesResp = await api.get('/api/v1/roles/');
      const list = Array.isArray(rolesResp.data) ? rolesResp.data : (rolesResp.data?.results || []);
      const match = list.find(r => (r.nombre || r.name || '').toLowerCase() === String(roleName).toLowerCase());
      roleId = match ? (match.id_rol ?? match.id ?? null) : null;
    } catch {}
  }
  const syntheticUser = {
    id_usuario: tokenUser?.id_usuario ?? tokenUser?.id ?? null,
    nombre: tokenUser?.nombre || tokenUser?.name || username || 'Usuario',
    apellido: tokenUser?.apellido || '',
    rut: tokenUser?.rut || undefined,
    correo_electronico: correo,
    estado: true,
    roles: roleName ? [roleName] : [],
  };
  // Si quieres reintentar creación cuando el backend esté corregido, activa la bandera de entorno
  // REACT_APP_CREATE_USER_ON_LOGIN=true
  if (String(process.env.REACT_APP_CREATE_USER_ON_LOGIN).toLowerCase() === 'true') {
    const baseData = {
      nombre: syntheticUser.nombre,
      apellido: syntheticUser.apellido,
      username: username,
      rut: tokenUser?.rut || extra?.rut,
      correo_electronico: correo,
      contrasena: extra?.contrasena || 'Temporal123',
      estado: true,
    };
    const variants = [];
    if (roleId) {
      variants.push({ ...baseData, roles: [roleId] });
      variants.push({ ...baseData, id_rol: roleId });
      variants.push({ ...baseData, roles: [{ id_rol: roleId }] });
      variants.push({ ...baseData, roles: [{ id: roleId }] });
    }
    variants.push({ ...baseData });
    for (const v of variants) {
      try {
        const created = await registerUsuario(v);
        return created;
      } catch (e) {
        const status = e?.response?.status;
        const body = e?.response?.data;
        console.warn('[auth] error creando usuario con variante:', Object.keys(v), 'status:', status, 'body:', body);
      }
    }
  }
  return syntheticUser;
}

function normalizeAndStoreUser(raw, { rut }) {
  if (!raw) return;
  try {
    let rolesNorm = [];
    if (Array.isArray(raw.roles)) {
      rolesNorm = raw.roles
        .map(r => {
          if (typeof r === 'string') return r.toLowerCase();
          if (r && typeof r === 'object') {
            const n = r.nombre || r.name || r.slug || r.codigo || r.tipo || r.role;
            return n ? String(n).toLowerCase() : null;
          }
          return null;
        })
        .filter(Boolean);
    }
    const user = {
      id_usuario: raw.id_usuario ?? raw.id ?? null,
      nombre: raw.nombre ?? raw.name ?? '',
      apellido: raw.apellido ?? '',
      rut: raw.rut ?? rut,
      correo_electronico: raw.correo_electronico ?? raw.email ?? '',
      estado: raw.estado ?? true,
      roles: rolesNorm,
    };
    localStorage.setItem('foodex_user', JSON.stringify(user));
  } catch {}
}

// Obtiene sesión almacenada (token + user) y configura Authorization si corresponde
export function getStoredSession() {
  try {
    const token = localStorage.getItem('foodex_token') || null;
    const raw = localStorage.getItem('foodex_user');
    const user = raw ? JSON.parse(raw) : null;
    if (token) setAuthToken(token);
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

// --- Post-login setup: crear Taller y Semestre por defecto y guardar IDs ---

async function postOverCandidates(urls, data) {
  let lastErr;
  for (const u of urls) {
    try {
      const resp = await api.post(u, data, { withCredentials: false });
      return resp.data;
    } catch (err) {
      lastErr = err;
      const st = err?.response?.status;
      if (String(process.env.REACT_APP_DEBUG_API || 'false').toLowerCase() === 'true') {
        console.warn('[auth] POST ERR', u, st, err?.response?.data);
      }
      if (st && st !== 404 && st !== 405) throw err;
    }
  }
  throw lastErr || new Error('No endpoint matched');
}

// computeDefaultSemestreLabel/getCurrentYear ya no se usan tras enviar semestre como entero

function getSemestreNumberFromMonth() {
  try { const m = (new Date()).getMonth() + 1; return m <= 6 ? 1 : 2; } catch { return 1; }
}

async function ensureTallerDefault() {
  try { if (localStorage.getItem('foodex_id_taller')) return Number(localStorage.getItem('foodex_id_taller')); } catch {}
  const defaults = { seccion_taller: 'A', detalle_taller: 'Taller por defecto', estado: true };
  const variants = [
    defaults,
    { seccion: 'A', detalle: 'Taller por defecto', estado: true },
    { nombre_taller: 'Taller por defecto', seccion_taller: 'A', estado: true },
  ];
  const endpoints = ['/api/v1/talleres/'];
  for (const v of variants) {
    try {
      const saved = await postOverCandidates(endpoints, v);
      const id = saved?.id_taller ?? saved?.id ?? null;
      if (id != null) { try { localStorage.setItem('foodex_id_taller', String(id)); } catch {} return id; }
    } catch (e) {
      // siguiente variante
    }
  }
  return null;
}

async function ensureSemestreDefault() {
  try { if (localStorage.getItem('foodex_id_semestre')) return Number(localStorage.getItem('foodex_id_semestre')); } catch {}
  const semNum = getSemestreNumberFromMonth();
  // Según especificación: semestre es entero (requerido). Evitar enviar 'anio'.
  const variants = [
    { semestre: semNum, estado: true },
    { semestre: semNum },
  ];
  const endpoints = ['/api/v1/semestres/'];
  for (const v of variants) {
    try {
      const saved = await postOverCandidates(endpoints, v);
      const id = saved?.id_semestre ?? saved?.id ?? null;
      if (id != null) { try { localStorage.setItem('foodex_id_semestre', String(id)); } catch {} return id; }
    } catch (e) {
      // siguiente variante
    }
  }
  return null;
}

export async function ensureAcademicEntitiesOnLogin() {
  await ensureSemestreDefault().catch(() => null);
  await ensureTallerDefault().catch(() => null);
}
