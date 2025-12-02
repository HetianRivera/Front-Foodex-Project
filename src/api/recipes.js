import { api } from './client';

function getUserId() {
  try {
    const raw = localStorage.getItem('foodex_user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u?.id_usuario ?? u?.id ?? null;
  } catch { return null; }
}

function getIntEnv(name) {
  const v = process.env[name];
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getIntEnvOr(name, fallback) {
  const val = getIntEnv(name);
  if (val === null || val === undefined) return fallback;
  return val;
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

// Map UI recipe object -> backend schema for POST /api/v1/recetas/
function toBackendRecipePayload(recipe) {
  const userId = getUserId();
  const semestreId = getIntEnvOr('REACT_APP_SEMESTRE_ID', 1);
  const tallerId = getIntEnvOr('REACT_APP_TALLER_ID', 1);
  if (!userId) throw new Error('No se pudo determinar id_usuario (no hay sesión)');
  return {
    nombre_receta: (recipe?.nombre || '').toString().trim() || 'Sin nombre',
    codigo_receta: (recipe?.codigo || '').toString().trim() || null,
    anio: todayISO(),
    detalle_montaje: recipe?.montaje || null,
    estado: true,
    id_taller: tallerId,
    id_semestre: semestreId,
    id_usuario: userId,
  };
}

// Flexible endpoints for recipe management (SPA -> Django/DRF or Node)
// Configure with env vars or fallback to common paths.
// Env:
// - REACT_APP_RECIPES_ENDPOINT  e.g. /api/v1/recetas/
// - REACT_APP_RECIPES_ENDPOINTS e.g. /api/v1/recetas/,/api/recetas/

const envList = (process.env.REACT_APP_RECIPES_ENDPOINTS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const CANDIDATE_BASES = [
  process.env.REACT_APP_RECIPES_ENDPOINT,
  ...envList,
  '/api/v1/recetas/',
  '/api/recetas/',
  '/recetas/',
  '/api/v1/recipes/',
  '/recipes/',
].filter(Boolean).map(b => b.replace(/\/+$/, '/') );

let resolvedBase = null;

async function tryRequestOverCandidates(method, makePath, dataOrConfig) {
  let lastErr;
  const bases = resolvedBase ? [resolvedBase] : CANDIDATE_BASES;
  for (const base of bases) {
    try {
      const path = base.replace(/\/+$/, '/') + makePath(base);
      const resp = await api.request({ method, url: path, ...(method === 'get' ? { params: dataOrConfig } : { data: dataOrConfig }) });
      resolvedBase = base; // cache success
      return resp.data;
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      // Si el endpoint existe pero el payload es inválido o hay auth (400/401/403),
      // no probar otros bases: la ruta correcta es esta. Cachear y salir.
      if (status && status !== 404 && status !== 405) {
        if (!resolvedBase) resolvedBase = base;
        throw err;
      }
    }
  }
  throw lastErr || new Error('No recipe endpoint matched');
}

export async function createRecipe(recipe) {
  const payload = toBackendRecipePayload(recipe);
  return tryRequestOverCandidates('post', () => '', payload);
}

export async function getRecipe(id) {
  const idSeg = `${encodeURIComponent(id)}/`;
  return tryRequestOverCandidates('get', () => idSeg, {});
}

export async function listRecipes(params = {}) {
  return tryRequestOverCandidates('get', () => '', params);
}

export async function updateRecipe(id, patch) {
  const idSeg = `${encodeURIComponent(id)}/`;
  return tryRequestOverCandidates('put', () => idSeg, patch);
}

export async function deleteRecipe(id) {
  const idSeg = `${encodeURIComponent(id)}/`;
  return tryRequestOverCandidates('delete', () => idSeg, {});
}
