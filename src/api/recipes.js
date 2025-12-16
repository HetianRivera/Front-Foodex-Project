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

// Utilidad de fecha eliminada por no uso para evitar lint no-unused-vars

function getAnioYear() {
  const raw = process.env.REACT_APP_ANIO;
  if (raw !== undefined && raw !== null) {
    const s = String(raw).trim();
    // Si es YYYY-MM-DD, extraer solo el año
    const match = s.match(/^(\d{4})/);
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > 0) return n;
    }
    // Si es solo un número, usarlo directamente
    const n = Number(s);
    if (Number.isFinite(n) && n > 0) return n;
  }
  try {
    const y = new Date().getFullYear();
    if (y && y > 0) return y;
  } catch {}
  return 2025;
}

function getAnioDateString() {
  return String(getAnioYear());
}

// Normalizar cantidades de ingredientes a una sola unidad (gramos para sólidos, mililitros/gramos para líquidos)
function normalizeIngredientsInRecipe(recipe) {
  if (!recipe || !Array.isArray(recipe.ingredientes)) return recipe;
  // Deep copy shallow structure we need
  const copy = { ...recipe, ingredientes: recipe.ingredientes.map(cat => ({
    categoria: cat.categoria,
    ingredientes: Array.isArray(cat.ingredientes) ? cat.ingredientes.map(ing => {
      const nombre = ing.nombre;
      let cantidad = Number(ing.cantidad) || 0;
      const unidad = (ing.unidad || '').toString().toLowerCase();
      // Normalización básica: kg -> g, lt/l -> ml (store as "cantidad" in base units)
      if (unidad === 'kg') cantidad = cantidad * 1000;
      if (unidad === 'lt' || unidad === 'l') cantidad = cantidad * 1000;
      if (unidad === 'g' || unidad === 'gr' || unidad === 'ml') cantidad = cantidad;
      // 'u' (unidad) remains a count — keep as-is
      // Return object without 'unidad' to align with backend that ignores units
      return { nombre, cantidad: Number(cantidad) };
    }) : []
  })) };
  return copy;
}

// Map UI recipe object -> backend schema for POST /api/v1/recetas/
function toBackendRecipePayload(recipe) {
  const userId = getUserId();
  if (!userId) throw new Error('No se pudo determinar id_usuario (no hay sesión)');
  // Preferir IDs creados en login si existen
  let lsSemestre = null, lsTaller = null;
  try { const v = localStorage.getItem('foodex_id_semestre'); if (v) lsSemestre = Number(v); } catch {}
  try { const v = localStorage.getItem('foodex_id_taller'); if (v) lsTaller = Number(v); } catch {}
  const base = {
    nombre_receta: (recipe?.nombre || '').toString().trim() || 'Sin nombre',
    codigo_receta: (recipe?.codigo || '').toString().trim() || null,
    anio: parseInt(getAnioDateString(), 10),
    detalle_montaje: recipe?.montaje || null,
    estado: true,
    id_usuario: userId,
  };
  // Incluir id_semestre obligatoriamente (preferir localStorage, luego env, luego 1)
  const semestreId = lsSemestre ?? getIntEnvOr('REACT_APP_SEMESTRE_ID', 1);
  base.id_semestre = semestreId;
  // Taller opcional: solo incluir si está habilitado por entorno y disponible
  // Nota: Django nombra columnas FK como <campo>_id (ej: id_taller -> id_taller_id)
  // Si la columna no existe en la BD, el backend responderá 500 y reintentaremos sin taller en createRecipe
  const includeTaller = String(process.env.REACT_APP_INCLUDE_TALLER_IN_RECETA || 'false').toLowerCase() === 'true';
  if (includeTaller && lsTaller != null && Number.isFinite(lsTaller)) {
    base.id_taller = lsTaller;
  }
  return base;
}

// Flexible endpoints for recipe management (SPA -> Django/DRF or Node)
// Configure with env vars or fallback to common paths.
// Env:
// - REACT_APP_RECIPES_ENDPOINT  e.g. /api/v1/recetas/
// Simplificado: una sola base. Si no se define por entorno, usar '/api/v1/recetas/'.
const CANDIDATE_BASES = [
  (process.env.REACT_APP_RECIPES_ENDPOINT || '/api/v1/recetas/'),
].map(b => b.replace(/\/+$/, '/') );

let resolvedBase = null;
// --- Prefetch helpers for unidades y categorias ---
let unidadMapCache = null; // nombre_unidad (lower) -> id_unidad
let categoriaMapCache = null; // nombre_categoria (lower) -> id_categoria

// Unidades temporalmente descartadas del backend: omitir prefetch/creación
async function prefetchUnidades() { return {}; }
async function ensureUnidad(nombre) { return null; }

async function prefetchCategorias() {
  if (categoriaMapCache) return categoriaMapCache;
  const candidates = [
    // Confirmado por el backend: /api/v1/categorias/
    '/api/v1/categorias/'
  ];
  for (const url of candidates) {
    try {
      const r = await api.get(url);
      const list = Array.isArray(r.data) ? r.data : (r.data?.results || []);
      categoriaMapCache = {};
      for (const c of list) {
        const name = (c.nombre_categoria || c.nombre || '').toString().trim().toLowerCase();
        const id = c.id_categoria ?? c.id ?? null;
        if (name && id != null) categoriaMapCache[name] = id;
      }
      return categoriaMapCache;
    } catch {}
  }
  categoriaMapCache = {};
  return categoriaMapCache;
}

async function ensureCategoria(nombre) {
  const map = await prefetchCategorias();
  const key = String(nombre || '').toLowerCase();
  if (map[key] != null) return map[key];
  // No crear: la categoría debe existir en la API.
  throw new Error(`Categoría no encontrada: ${nombre}`);
}

// Genera un entero positivo para `id_receta_ingrediente` si el backend lo exige y
// el UI no lo entrega. Minimiza colisiones usando receta+ingrediente+timestamp.
function genRecetaIngredienteId(recetaId, ingredienteId, seq = 0) {
  const r = Number(recetaId) || 0;
  const i = Number(ingredienteId) || 0;
  const t = Date.now() % 1000000000;
  const n = (r * 100000) + (i * 100) + (seq % 100) + t;
  return Math.abs(n);
}

// Generadores para otras tablas intermedias con PK entera no nula
function genRecetaEtapaId(recetaId, etapaId, seq = 0) {
  const r = Number(recetaId) || 0;
  const e = Number(etapaId) || 0;
  const t = Date.now() % 1000000000;
  const n = (r * 100000) + (e * 100) + (seq % 100) + t;
  return Math.abs(n);
}

function genEtapaIngredienteId(etapaId, ingredienteId, seq = 0) {
  const e = Number(etapaId) || 0;
  const i = Number(ingredienteId) || 0;
  const t = Date.now() % 1000000000;
  const n = (e * 100000) + (i * 100) + (seq % 100) + t;
  return Math.abs(n);
}

function genIngredienteTecnicaId(ingredienteId, tecnicaId, seq = 0) {
  const i = Number(ingredienteId) || 0;
  const te = Number(tecnicaId) || 0;
  const t = Date.now() % 1000000000;
  const n = (i * 100000) + (te * 100) + (seq % 100) + t;
  return Math.abs(n);
}

async function tryRequestOverCandidates(method, makePath, dataOrConfig) {
  let lastErr;
  const bases = resolvedBase ? [resolvedBase] : CANDIDATE_BASES;
  for (const base of bases) {
    try {
      const path = base.replace(/\/+$/, '/') + makePath(base);
      if (String(process.env.REACT_APP_DEBUG_API || 'false').toLowerCase() === 'true') {
        console.log(`[API] ${method.toUpperCase()} ${path}`, method === 'get' ? { params: dataOrConfig } : dataOrConfig);
      }
      const resp = await api.request({ method, url: path, ...(method === 'get' ? { params: dataOrConfig } : { data: dataOrConfig }) });
      resolvedBase = base; // cache success
      if (String(process.env.REACT_APP_DEBUG_API || 'false').toLowerCase() === 'true') {
        console.log(`[API] OK ${method.toUpperCase()} ${path}`, resp && resp.status);
      }
      return resp.data;
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      if (String(process.env.REACT_APP_DEBUG_API || 'false').toLowerCase() === 'true') {
        console.warn(`[API] ERR ${method.toUpperCase()} ${base} ->`, status, err?.response?.data);
      }
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
  try {
    return await tryRequestOverCandidates('post', () => '', payload);
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const hasTaller = Object.prototype.hasOwnProperty.call(payload, 'id_taller');
    // Fallback: si el backend explota (500) y estamos enviando id_taller, reintentar sin id_taller
    if (hasTaller && status && status >= 500) {
      const payloadNoTaller = { ...payload };
      delete payloadNoTaller.id_taller;
      if (String(process.env.REACT_APP_DEBUG_API || 'false').toLowerCase() === 'true') {
        console.warn('[API] Reintentando crear receta sin id_taller por error servidor', status, data);
      }
      return await tryRequestOverCandidates('post', () => '', payloadNoTaller);
    }
    throw err;
  }
}

export async function getRecipe(id) {
  const idSeg = `${encodeURIComponent(id)}/`;
  return tryRequestOverCandidates('get', () => idSeg, {});
}

export async function listRecipes(params = {}) {
  return tryRequestOverCandidates('get', () => '', params);
}

// Obtener recetas asociadas a un usuario. Algunos backends exponen
// las recetas del usuario en la ruta /api/v1/recetas/<id>/ (id = id_usuario).
// Esta función intenta esa variante y devuelve siempre un array.
export async function listUserRecipes(userId) {
  if (!userId) throw new Error('userId requerido para listar recetas por usuario');

  // 1) Intentar la ruta directa /recetas/<userId>/ (algunos backends usan este patrón)
  const idSeg = `${encodeURIComponent(userId)}/`;
  try {
    const data = await tryRequestOverCandidates('get', () => idSeg, {});
    return Array.isArray(data) ? data : (data?.results || []);
  } catch (err) {
    const st = err?.response?.status;
    // Si el error no es 404/405, es probablemente un problema real (auth, 500), propagar
    if (st && st !== 404 && st !== 405) throw err;
  }

  // 2) Fallback: pedir al endpoint de listado con distintos parámetros de filtro comunes
  const tryParams = [
    { id_usuario: userId },
    { usuario: userId },
    { user: userId },
    { owner: userId },
  ];

  for (const params of tryParams) {
    try {
      const data = await tryRequestOverCandidates('get', () => '', params);
      const list = Array.isArray(data) ? data : (data?.results || []);
      if (list && list.length >= 0) return list;
    } catch (err) {
      const st = err?.response?.status;
      if (st && st !== 404 && st !== 405) throw err;
      // otherwise probar siguiente variante
    }
  }

  // 3) Último recurso: llamar al listado sin filtros (devuelve todas) y filtrar localmente
  try {
    const data = await tryRequestOverCandidates('get', () => '', {});
    const list = Array.isArray(data) ? data : (data?.results || []);
    // Filtrar por campos comunes que pueden contener el id de usuario
    return (list || []).filter(r => (r.id_usuario == userId) || (r.id_usuario == undefined && (r.usuario == userId || r.user == userId || r.id == userId)));
  } catch (err) {
    throw err;
  }
}

export async function updateRecipe(id, patch) {
  const idSeg = `${encodeURIComponent(id)}/`;
  // Si el patch incluye ingredientes en la forma de UI, normalizarlos antes de enviar
  try {
    if (patch && Array.isArray(patch.ingredientes)) {
      patch = normalizeIngredientsInRecipe(patch);
    }
  } catch {}
  return tryRequestOverCandidates('put', () => idSeg, patch);
}

export async function deleteRecipe(id) {
  const idSeg = `${encodeURIComponent(id)}/`;
  return tryRequestOverCandidates('delete', () => idSeg, {});
}

// --- Extended creation to persist related entities aligned with API ---

const RELATED_ENDPOINTS = {
  etapas: ['/api/v1/etapas/'],
  ingredientes: ['/api/v1/ingredientes/'],
  tecnicas: ['/api/v1/tecnicas/'],
  recetaEtapas: ['/api/v1/receta-etapas/'],
  recetaIngredientes: ['/api/v1/receta-ingredientes/'],
  etapaIngredientes: ['/api/v1/etapa-ingredientes/'],
  ingredienteTecnica: ['/api/v1/ingrediente-tecnica/'],
};

// Helper para GET contra una lista de endpoints probando detalle (/id/) y filtros comunes
async function tryGetOverCandidates(urls, id) {
  let lastErr = null;
  // Primero intentar detalle: /endpoint/<id>/
  for (const u of urls) {
    try {
      const url = u.replace(/\/+$/, '/') + encodeURIComponent(id) + '/';
      const resp = await api.get(url);
      return resp.data;
    } catch (err) {
      lastErr = err;
      const st = err?.response?.status;
      if (st && st !== 404 && st !== 405) throw err;
    }
  }

  const paramNames = ['id_receta','receta','receta_id','id','id_etapa','id_ingrediente','ingrediente','recipe','id_recipe'];
  for (const pname of paramNames) {
    for (const u of urls) {
      try {
        const resp = await api.get(u, { params: { [pname]: id } });
        const data = Array.isArray(resp.data) ? resp.data : (resp.data?.results || resp.data);
        return data;
      } catch (err) {
        lastErr = err;
        const st = err?.response?.status;
        if (st && st !== 404 && st !== 405) throw err;
      }
    }
  }

  throw lastErr || new Error('No related endpoint matched');
}

// Helper: intentar obtener detalle por id (GET /endpoint/<id>/) sobre varios candidatos
async function tryFetchDetail(urls, id) {
  let lastErr = null;
  for (const u of urls) {
    try {
      const url = u.replace(/\/+$/, '/') + encodeURIComponent(id) + '/';
      const resp = await api.get(url);
      return resp.data;
    } catch (err) {
      lastErr = err;
      const st = err?.response?.status;
      if (st && st !== 404 && st !== 405) throw err;
    }
  }
  throw lastErr || new Error('Detail not found');
}

// Utility: dado un array, devolver solo los items que tengan alguna de las
// keys igual al valor buscado (coerción flexible con == para strings/numeros).
function filterListByKeys(list, keys, value) {
  if (!Array.isArray(list)) return [];
  return list.filter(item => {
    for (const k of keys) {
      try {
        if (item == null) continue;
        const v = item[k];
        if (v == null) continue;
        if (String(v) === String(value) || v == value) return true;
      } catch (e) {
        continue;
      }
    }
    return false;
  });
}

// Armar la receta completa consultando las tablas relacionadas si el endpoint
// de detalle no incluye las relaciones. Devuelve un objeto con campos
// compatibles con la UI (`ingredientes` como array de categorías con `ingredientes`,
// `procesos` como array de etapas con `ingredientesUsados`, `tecnicas`, etc.).
export async function getFullRecipe(recetaId) {
  if (!recetaId) throw new Error('recetaId requerido');
  const base = await getRecipe(recetaId).catch(() => null);
  const result = base ? { ...base } : { id_receta: recetaId };

  // 1) receta-ingredientes -> ingredientes (detallados)
  let recetaIngs = [];
  try {
    const data = await tryGetOverCandidates(RELATED_ENDPOINTS.recetaIngredientes, recetaId);
    recetaIngs = Array.isArray(data) ? data : (data?.results || []);
    // Filtrar solo los enlaces que pertenezcan a esta receta
    recetaIngs = filterListByKeys(recetaIngs, ['id_receta','receta','receta_id','id_receta_id','id_receta_ingrediente','recetaIngrediente','id_receta_ingrediente'], recetaId);
  } catch (e) {
    recetaIngs = [];
  }

  const ingredientesById = {};
  const categoriaMap = {};
  for (const ri of recetaIngs) {
    const ingId = ri.id_ingrediente ?? ri.ingrediente ?? ri.id;
    let ingDetail = null;
    if (ingId) {
      try { ingDetail = await tryFetchDetail(RELATED_ENDPOINTS.ingredientes, ingId); } catch (e) { ingDetail = null; }
    }
    const nombre = ingDetail?.nombre || ri.nombre || ri.nombre_ingrediente || ri.nombre_ingrediente || null;
    const cantidad = ri.cantidad_ingrediente ?? ri.cantidad ?? ri.cantidad_ingrediente ?? null;
    const unidad = ingDetail?.unidad || ri.unidad || null;
    const categoria = ingDetail?.categoria || ri.categoria || 'Sin categoría';
    const ingObj = { id_ingrediente: ingId, nombre, cantidad, unidad, ...(ingDetail || {}) };
    ingredientesById[ingId] = ingObj;
    if (!categoriaMap[categoria]) categoriaMap[categoria] = [];
    categoriaMap[categoria].push(ingObj);
  }

  result.ingredientes = Object.keys(categoriaMap).map(cat => ({ categoria: cat, ingredientes: categoriaMap[cat] }));

  // 2) receta-etapas -> procesos (etapas) y sus ingredientes (etapa-ingredientes)
  let recetaEtapas = [];
  try {
    const data = await tryGetOverCandidates(RELATED_ENDPOINTS.recetaEtapas, recetaId);
    recetaEtapas = Array.isArray(data) ? data : (data?.results || []);
    recetaEtapas = filterListByKeys(recetaEtapas, ['id_receta','receta','receta_id','id_receta_etapa','id_receta'], recetaId);
  } catch (e) {
    recetaEtapas = [];
  }

  const procesos = [];
  for (const re of recetaEtapas) {
    const etapaId = re.id_etapa ?? re.id_etapa_id ?? re.id_etapa ?? re.id ?? re.id_receta_etapa;
    let etapaDetail = null;
    if (etapaId) {
      try { etapaDetail = await tryFetchDetail(RELATED_ENDPOINTS.etapas, etapaId); } catch (e) { etapaDetail = null; }
    }
    // Obtener ingredientes usados en la etapa
    let etapaIngs = [];
    try {
      const data = await tryGetOverCandidates(RELATED_ENDPOINTS.etapaIngredientes, etapaId);
      etapaIngs = Array.isArray(data) ? data : (data?.results || []);
      etapaIngs = filterListByKeys(etapaIngs, ['id_etapa','etapa','id_etapa_id','id_etapa_ingrediente','id_etapa_ingrediente'], etapaId);
    } catch (e) {
      etapaIngs = [];
    }
    const ingredientesUsados = (etapaIngs || []).map(ei => {
      const ingId = ei.id_ingrediente ?? ei.ingrediente ?? ei.id;
      const baseIng = ingredientesById[ingId] || {};
      return {
        nombre: baseIng.nombre || ei.nombre || null,
        cantidad: ei.cantidad_ingrediente ?? ei.cantidad ?? baseIng.cantidad ?? null,
        unidad: baseIng.unidad || ei.unidad || null,
      };
    });

    procesos.push({
      etapa: re.fase_etapa ?? re.fase ?? etapaDetail?.fase ?? (re.fase ?? null),
      titulo: etapaDetail?.nombre_etapa ?? etapaDetail?.nombre ?? re.nombre_etapa ?? re.titulo ?? '',
      descripcion: etapaDetail?.instruccion_etapa ?? etapaDetail?.instruccion ?? re.instruccion_etapa ?? re.instruccion ?? '',
      tiempoEstimado: etapaDetail?.tiempo_minutos ?? etapaDetail?.tiempoCoccionMin ?? re.tiempo_minutos ?? (re.tiempo ?? null),
      ingredientesUsados,
    });
  }
  result.procesos = procesos;

  // 3) Técnicas: intentar ligar técnicas a partir de ingrediente-tecnica
  const tecnicaIds = new Set();
  try {
    // Obtener links ingrediente-tecnica para los ingredientes de la receta
    const allIngIds = Object.keys(ingredientesById).filter(Boolean);
    for (const ingId of allIngIds) {
      try {
        const links = await tryGetOverCandidates(RELATED_ENDPOINTS.ingredienteTecnica, ingId).catch(() => []);
        const arr = Array.isArray(links) ? links : (links?.results || []);
        // Filtrar por id_ingrediente para evitar enlaces globales
        const filtered = filterListByKeys(arr, ['id_ingrediente','ingrediente','id'], ingId);
        for (const l of filtered) {
          const tid = l.id_tecnica ?? l.tecnica ?? l.id ?? l.id_tecnica_id;
          if (tid) tecnicaIds.add(tid);
        }
      } catch (e) {}
    }
  } catch (e) {}

  const tecnicas = [];
  for (const tid of Array.from(tecnicaIds)) {
    try {
      const t = await tryFetchDetail(RELATED_ENDPOINTS.tecnicas, tid).catch(() => null);
      if (t) tecnicas.push(t);
    } catch (e) {}
  }
  result.tecnicas = tecnicas;

  return result;
}

async function postOverCandidates(urls, data) {
  let lastErr;
  for (const u of urls) {
    try {
      if (String(process.env.REACT_APP_DEBUG_API || 'false').toLowerCase() === 'true') {
        console.log('[API] POST', u, data);
      }
      const resp = await api.post(u, data);
      if (String(process.env.REACT_APP_DEBUG_API || 'false').toLowerCase() === 'true') {
        console.log('[API] OK POST', u, resp.status);
      }
      return resp.data;
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      if (String(process.env.REACT_APP_DEBUG_API || 'false').toLowerCase() === 'true') {
        console.warn('[API] ERR POST', u, status, err?.response?.data);
      }
      if (status && status !== 404 && status !== 405) throw err;
    }
  }
  throw lastErr || new Error('No related endpoint matched');
}

export async function createFullRecipe(uiRecipe) {
  // Normalizar ingredientes (convertir unidades a base y eliminar 'unidad')
  try { uiRecipe = normalizeIngredientsInRecipe(uiRecipe); } catch {}
  // 0) Crear receta primero para obtener id_receta
  let base = null;
  let recetaId = null;
  let deferredMode = false;
  try {
    base = await createRecipe(uiRecipe);
    recetaId = base?.id_receta ?? base?.id ?? null;
  } catch (err) {
    const allowDefer = String(process.env.REACT_APP_DEFER_RECIPE_ON_ERROR || 'false').toLowerCase() === 'true';
    const status = err?.response?.status;
    if (allowDefer && status && status >= 500) {
      // No usar ID temporal: continuar sin recetaId para configurar entidades independientes
      deferredMode = true;
      recetaId = null;
      base = { _deferred: true, nombre_receta: uiRecipe?.nombre || null };
      if (String(process.env.REACT_APP_DEBUG_API || 'false').toLowerCase() === 'true') {
        console.warn('[API] Modo diferido: no se creó receta, se continúan entidades independientes', status);
      }
    } else {
      throw err;
    }
  }

  // 1) Crear tablas independientes después: unidades/categorías (prefetch/ensure), ingredientes, etapas, técnicas
  const createdIngredientes = {}; // nombre -> { id, clientRecetaIngId }
  const createdEtapas = []; // { id_etapa, fase, orden, instruccion, ingredientesUsados }
  const unidadAlias = { gr: 'gramos', kg: 'kilogramos', ml: 'mililitros', lt: 'litros', u: 'unidades' };
  // Unidades descartadas por backend actual
  await prefetchCategorias();

const buildIngredientPayloadVariants = (ing, id_categoria) => {
  const id_unidad =
    Number(
      ing?.id_unidad ??
      ing?.unidad?.id_unidad ??
      localStorage.getItem('foodex_id_unidad_default') ??
      1
    );

  const common = { nombre: ing.nombre, id_unidad };

  return [
    { ...common, id_categoria }
  ];
};



  // Ingredientes
  for (const cat of (uiRecipe.ingredientes || [])) {
    for (const ing of (cat.ingredientes || [])) {
      // Forzar uso de las 5 categorías válidas; si no viene, usar 'Abarrotes' como fallback estable
      const allowedCats = ['cárnicos','verduras','ovolácteos','abarrotes','licores'];
      const requestedCat = String(cat.categoria || '').toLowerCase();
      const normalizedCat = allowedCats.includes(requestedCat) ? cat.categoria : 'Abarrotes';
      const id_categoria = await ensureCategoria(normalizedCat);
      try {
        let savedIng = null;
        for (const variant of buildIngredientPayloadVariants(ing, id_categoria)) {
          try {
            if (String(process.env.REACT_APP_DEBUG_API || 'false').toLowerCase() === 'true') {
              console.log('[API] TRY ingrediente payload', variant);
            }
            savedIng = await postOverCandidates(RELATED_ENDPOINTS.ingredientes, variant);
            if (savedIng) break;
          } catch (e) {
            const status = e?.response?.status;
            if (status && (status === 404 || status === 405)) break;
            // Superficies otras fallas para poder visualizarlas
            throw e;
          }
        }
        if (!savedIng) throw new Error('No se pudo crear ingrediente (variantes fallidas)');
        const idIng = savedIng?.id_ingrediente ?? savedIng?.id ?? null;
        if (idIng != null) {
          const rawRelId = ing?.id_receta_ingrediente;
          const relIdNum = Number(rawRelId);
          const clientRelId = Number.isFinite(relIdNum) && relIdNum > 0 ? relIdNum : null;
          createdIngredientes[ing.nombre] = { id: idIng, clientRecetaIngId: clientRelId };
        }
      } catch (err) {
        // No ocultar errores de API
        throw err;
      }
    }
  }

  // Etapas (guardar para enlazar luego con la receta)
  const deriveFaseEtapa = (p) => {
    const raw = (p?.etapa ?? '').toString().trim().toUpperCase();
    return /^[A-E]$/.test(raw) ? raw : 'A';
  };
  const allowedPhases = ['A','B','C','D','E'];
  const usedPhases = new Set();
  for (let i = 0; i < (uiRecipe.procesos || []).length; i++) {
    const p = uiRecipe.procesos[i];
    const tituloTrim = (p.titulo || '').toString().trim();
    const descripcionTrim = (p.descripcion || '').toString().trim();
    const tiempoVal = Number(p.tiempoEstimado);
    const hasAnyField = tituloTrim || descripcionTrim || Number.isFinite(tiempoVal);
    // Si la etapa no tiene datos, NO crearla ni vincularla
    if (!hasAnyField) continue;

    const etapaPayload = {
      nombre_etapa: tituloTrim || `Etapa ${p.etapa}`,
      tiempo_minutos: Number.isFinite(tiempoVal) ? tiempoVal : null,
    };
    let etapaId = null;
    try {
      const savedEtapa = await postOverCandidates(RELATED_ENDPOINTS.etapas, etapaPayload);
      etapaId = savedEtapa?.id_etapa ?? savedEtapa?.id ?? null;
    } catch (err) {
      throw err;
    }
    // Resolver fase única
    let fase = deriveFaseEtapa(p);
    if (usedPhases.has(fase)) fase = allowedPhases.find(ph => !usedPhases.has(ph)) || fase;
    usedPhases.add(fase);
    createdEtapas.push({
      id_etapa: etapaId,
      fase,
      orden: i + 1,
      instruccion: descripcionTrim || null,
      ingredientesUsados: Array.isArray(p.ingredientesUsados) ? p.ingredientesUsados : [],
      tiempoCoccionMin: Number.isFinite(tiempoVal) ? tiempoVal : null,
    });
  }

  // Técnicas (opcionales, independientes) y captura de id_tecnica
  const createdTecnicas = []; // { id_tecnica, nombre, descripcion }
  for (const t of (uiRecipe.tecnicas || [])) {
    try {
      const savedTec = await postOverCandidates(RELATED_ENDPOINTS.tecnicas, {
        nombre_tecnica: t.nombre,
        descripcion: t.descripcion || null,
      });
      const idTec = savedTec?.id_tecnica ?? savedTec?.id ?? null;
      if (idTec != null) createdTecnicas.push({ id_tecnica: idTec, nombre: t.nombre, descripcion: t.descripcion || null });
    } catch (err) {
      throw err;
    }
  }

  // 2) Ya tenemos la receta creada al inicio

  // Utilidades de cola de enlaces diferidos
  // En este modo, no se encolan enlaces dependientes de receta (sin id_receta)
  const pushPendingLink = () => {};

  // 3) Enlazar receta con ingredientes
  if (recetaId != null) {
    let seq = 0;
    for (const [nombreIng, info] of Object.entries(createdIngredientes)) {
      try {
        const payloadRI = { id_receta: recetaId, id_ingrediente: info?.id };
        // Si el backend requiere valor no nulo, asegurar uno.
        const requireRelId = String(process.env.REACT_APP_REQUIRE_RECETA_ING_ID || 'true').toLowerCase() === 'true';
        if (info?.clientRecetaIngId != null) {
          payloadRI.id_receta_ingrediente = info.clientRecetaIngId;
        } else if (requireRelId) {
          payloadRI.id_receta_ingrediente = genRecetaIngredienteId(recetaId, info?.id, seq);
        }
        await postOverCandidates(RELATED_ENDPOINTS.recetaIngredientes, payloadRI);
        seq += 1;
      } catch (err) {
        throw err;
      }
    }
  }

  // 4) Enlazar receta con etapas y etapa con ingredientes
  for (const et of createdEtapas) {
    const etapaId = et.id_etapa;
    if (recetaId != null && etapaId != null) {
      try {
        const payloadRE = {
          fase_etapa: et.fase,
          instruccion_etapa: et.instruccion,
          id_receta: recetaId,
          id_etapa: etapaId,
        };
        // PK requerida: id_receta_etapa
        const requireRelId = String(process.env.REACT_APP_REQUIRE_RECETA_ETAPA_ID || 'true').toLowerCase() === 'true';
        if (requireRelId) {
          payloadRE.id_receta_etapa = genRecetaEtapaId(recetaId, etapaId, et.orden ?? 0);
        }
        const savedRE = await postOverCandidates(RELATED_ENDPOINTS.recetaEtapas, payloadRE);
        const idRecetaEtapa = savedRE?.id_receta_etapa ?? savedRE?.id ?? null;
        et.id_receta_etapa = idRecetaEtapa;
      } catch (err) {
        throw err;
      }
    }
    for (const iu of et.ingredientesUsados) {
      const idIng = createdIngredientes[iu?.nombre]?.id;
      const cantidad = Number(iu.cantidad);
      if (etapaId != null && idIng != null && Number.isFinite(cantidad)) {
        try {
          const payloadEI = {
            cantidad_ingrediente: cantidad,
            tiempo_coccion_minutos: Number.isFinite(et.tiempoCoccionMin) ? et.tiempoCoccionMin : null,
            id_etapa: etapaId,
            id_ingrediente: idIng,
          };
          // PK requerida siempre: id_etapa_ingrediente (evitar nulos)
          const genIdEI = genEtapaIngredienteId(etapaId, idIng);
          // Enviar ambos alias por compatibilidad con serializers: PK como 'id' y como 'id_etapa_ingrediente'
          payloadEI.id_etapa_ingrediente = genIdEI;
          payloadEI.id = genIdEI;
          // Forzar ejecución inmediata aunque esté activo el modo diferido,
          // ya que etapa-ingrediente no depende de receta.
          const savedEI = await postOverCandidates(RELATED_ENDPOINTS.etapaIngredientes, payloadEI);
          const idEtapaIngrediente = savedEI?.id_etapa_ingrediente ?? savedEI?.id ?? null;
          // Podríamos almacenar estos IDs por etapa si hace falta usarlos luego
          iu.id_etapa_ingrediente = idEtapaIngrediente;
        } catch (err) {
          throw err;
        }
      }
    }
  }

  // 5) (Opcional) Vincular técnicas con ingredientes
  // Alcance configurable: 'used' (ingredientes usados en etapas) o 'all' (todos los ingredientes creados de la receta)
  try {
    if (createdTecnicas.length > 0) {
      const scope = String(process.env.REACT_APP_TECHNIQUE_LINK_SCOPE || 'used').toLowerCase();
      const usedNames = new Set();
      for (const p of (uiRecipe.procesos || [])) {
        for (const iu of (p.ingredientesUsados || [])) {
          const nm = (iu?.nombre || '').toString().trim(); if (nm) usedNames.add(nm);
        }
      }
      const allNames = Object.keys(createdIngredientes);
      const targetNames = scope === 'all' ? allNames : allNames.filter(n => usedNames.has(n));
      for (const tec of createdTecnicas) {
        for (const nm of targetNames) {
          const idIng = createdIngredientes[nm]?.id;
          if (idIng != null) {
            try {
              const payloadIT = { id_ingrediente: idIng, id_tecnica: tec.id_tecnica };
              // PK requerida: id_ingrediente_tecnica
              const requireRelIdIT = String(process.env.REACT_APP_REQUIRE_ING_TEC_ID || 'true').toLowerCase() === 'true';
              if (requireRelIdIT) {
                payloadIT.id_ingrediente_tecnica = genIngredienteTecnicaId(idIng, tec.id_tecnica);
              }
              // Forzar ejecución inmediata aunque esté activo el modo diferido,
              // ya que ingrediente-tecnica no depende de receta.
              await linkIngredienteTecnica(payloadIT);
            } catch (e) {
              // Permitir continuar si el endpoint no existe en algún entorno
              const st = e?.response?.status; if (!(st && (st === 404 || st === 405))) throw e;
            }
          }
        }
      }
    }
  } catch (err) {
    // Si la receta se creó (recetaId !== null) pero falla en relaciones,
    // adjuntar el base al error para que el cliente pueda usarlo
    if (recetaId != null && base) {
      err._recipeBase = base;
    }
    throw err;
  }

  return base;
}

// --- Utilidades de enlace adicionales ---
// Ingrediente-Técnica
export async function linkIngredienteTecnica({ id_ingrediente, id_tecnica, id_ingrediente_tecnica }) {
  // Probar variantes de nombres de campo según serializer/Model
  const variants = [
    { id_ingrediente, id_tecnica, ...(id_ingrediente_tecnica != null ? { id_ingrediente_tecnica } : {}) },
    { id_ingrediente_id: id_ingrediente, id_tecnica_id: id_tecnica, ...(id_ingrediente_tecnica != null ? { id_ingrediente_tecnica } : {}) },
    { ingrediente: id_ingrediente, tecnica: id_tecnica, ...(id_ingrediente_tecnica != null ? { id_ingrediente_tecnica } : {}) },
  ];
  let lastErr;
  for (const v of variants) {
    try { return await postOverCandidates(RELATED_ENDPOINTS.ingredienteTecnica, v); } catch (e) {
      lastErr = e;
      const st = e?.response?.status; if (!(st && (st === 404 || st === 405))) continue;
    }
  }
  throw lastErr || new Error('No se pudo vincular ingrediente-tecnica');
}

// Categoria-Ingrediente (algunas APIs usan una tabla relacional explícita)
const CATEGORIA_INGREDIENTE_ENDPOINTS = [
  '/api/v1/categoria_ingrediente/',
];

export async function linkCategoriaIngrediente({ id_ingrediente, id_categoria }) {
  const variants = [
    { id_ingrediente, id_categoria },
    { id_ingrediente_id: id_ingrediente, id_categoria_id: id_categoria },
  ];
  for (const v of variants) {
    try { return await postOverCandidates(CATEGORIA_INGREDIENTE_ENDPOINTS, v); } catch (e) {
      const st = e?.response?.status; if (st && (st === 404 || st === 405)) break;
    }
  }
  throw new Error('No se pudo vincular categoria_ingrediente');
}
