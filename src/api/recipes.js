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

function getYearOrDefault() {
  const envYear = getIntEnv('REACT_APP_ANIO');
  if (envYear && envYear > 0) return envYear;
  // Por requerimiento del backend, anio debe ser entero. Valor por defecto: 2025.
  return 2025;
}

// Map UI recipe object -> backend schema for POST /api/v1/recetas/
function toBackendRecipePayload(recipe) {
  const userId = getUserId();
  if (!userId) throw new Error('No se pudo determinar id_usuario (no hay sesión)');
  const base = {
    nombre_receta: (recipe?.nombre || '').toString().trim() || 'Sin nombre',
    codigo_receta: (recipe?.codigo || '').toString().trim() || null,
    anio: getYearOrDefault(),
    detalle_montaje: recipe?.montaje || null,
    estado: true,
    id_usuario: userId,
  };
  // Temporalmente NO incluir id_taller e id_semestre para evitar 500 del backend
  // Cuando el backend esté corregido, se pueden reactivar vía variables de entorno:
  // REACT_APP_INCLUDE_TALLER=true y REACT_APP_INCLUDE_SEMESTRE=true
  const includeTaller = String(process.env.REACT_APP_INCLUDE_TALLER || 'false').toLowerCase() === 'true';
  // id_semestre es obligatorio según el esquema; incluirlo siempre
  const includeSemestre = true;
  if (includeTaller) {
    const tallerId = getIntEnvOr('REACT_APP_TALLER_ID', 1);
    base.id_taller = tallerId;
  }
  // Incluir id_semestre obligatoriamente (usar env o 1 por defecto)
  const semestreId = getIntEnvOr('REACT_APP_SEMESTRE_ID', 1);
  base.id_semestre = semestreId;
  return base;
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
// --- Prefetch helpers for unidades y categorias ---
let unidadMapCache = null; // nombre_unidad (lower) -> id_unidad
let categoriaMapCache = null; // nombre_categoria (lower) -> id_categoria

async function prefetchUnidades() {
  if (unidadMapCache) return unidadMapCache;
  const candidates = [
    // Confirmado por el backend: /api/v1/unidades/
    '/api/v1/unidades/'
  ];
  for (const url of candidates) {
    try {
      const r = await api.get(url);
      const list = Array.isArray(r.data) ? r.data : (r.data?.results || []);
      unidadMapCache = {};
      list.forEach(u => {
        const name = (u.nombre_unidad || u.nombre || '').toString().trim().toLowerCase();
        const id = u.id_unidad ?? u.id ?? null;
        if (name && id != null) unidadMapCache[name] = id;
      });
      return unidadMapCache;
    } catch {}
  }
  unidadMapCache = {};
  return unidadMapCache;
}

async function ensureUnidad(nombre) {
  const map = await prefetchUnidades();
  const key = String(nombre || '').toLowerCase();
  if (map[key] != null) return map[key];
  // Intentar crear unidad si no existe
  const createCandidates = [
    // Confirmado por el backend: /api/v1/unidades/
    '/api/v1/unidades/'
  ];
  for (const url of createCandidates) {
    try {
      const payload = { nombre_unidad: nombre };
      const r = await api.post(url, payload);
      const id = r.data?.id_unidad ?? r.data?.id ?? null;
      if (id != null) { map[key] = id; return id; }
    } catch {}
  }
  return null;
}

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
      list.forEach(c => {
        const name = (c.nombre_categoria || c.nombre || '').toString().trim().toLowerCase();
        const id = c.id_categoria ?? c.id ?? null;
        if (name && id != null) categoriaMapCache[name] = id;
      });
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
  // Intentar crear categoría si no existe
  const createCandidates = [
    // Confirmado por el backend: /api/v1/categorias/
    '/api/v1/categorias/'
  ];
  for (const url of createCandidates) {
    try {
      const payload = { nombre_categoria: nombre };
      const r = await api.post(url, payload);
      const id = r.data?.id_categoria ?? r.data?.id ?? null;
      if (id != null) { map[key] = id; return id; }
    } catch {}
  }
  return null;
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
        console.log(`[API] OK ${method.toUpperCase()} ${path}`, resp.status);
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

// --- Extended creation to persist related entities aligned with API ---

const RELATED_ENDPOINTS = {
  etapas: ['/api/v1/etapas/', '/etapas/'],
  ingredientes: ['/api/v1/ingredientes/', '/ingredientes/'],
  tecnicas: ['/api/v1/tecnicas/', '/tecnicas/'],
  recetaEtapas: [
    '/api/v1/receta-etapas/',
    '/api/v1/receta_etapas/',
    '/receta-etapas/',
    '/receta_etapas/',
    '/recetas/etapas/'
  ],
  recetaIngredientes: [
    '/api/v1/receta-ingredientes/',
    '/api/v1/receta_ingredientes/',
    '/receta-ingredientes/',
    '/receta_ingredientes/',
    '/recetas/ingredientes/'
  ],
  etapaIngredientes: [
    '/api/v1/etapa-ingredientes/',
    '/api/v1/etapa_ingredientes/',
    '/etapa-ingredientes/',
    '/etapa_ingredientes/'
  ],
  ingredienteTecnica: [
    '/api/v1/ingrediente-tecnica/',
    '/api/v1/ingrediente_tecnica/',
    '/ingrediente-tecnica/',
    '/ingrediente_tecnica/'
  ],
};

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
  const base = await createRecipe(uiRecipe);
  const recetaId = base?.id_receta ?? base?.id ?? null;
  // Persist ingredientes
  const createdIngredientes = {};
  const unidadAlias = { gr: 'gramos', kg: 'kilogramos', ml: 'mililitros', lt: 'litros', u: 'unidades' };
  await prefetchUnidades();
  await prefetchCategorias();
  // Helper: try multiple payload variants to adapt to backend field names
      const buildIngredientPayloadVariants = (ing, id_unidad, id_categoria) => {
    const common = {
      nombre: ing.nombre,
      // Retirar campos no existentes en BD: tiempo_coccion_minutos y calorias
    };
    return [
      { ...common, id_categoria, id_unidad },
      { ...common, id_categoria_id: id_categoria, id_unidad_id: id_unidad },
      { ...common, id_categoria_ingrediente: id_categoria, id_unidad_ingrediente: id_unidad },
      { ...common, id_categorias_ingrediente: id_categoria, id_unidades_ingrediente: id_unidad },
    ];
  };
  for (const cat of (uiRecipe.ingredientes || [])) {
    for (const ing of (cat.ingredientes || [])) {
      const unidadName = unidadAlias[String(ing.unidad || 'gr').toLowerCase()] || String(ing.unidad || 'gr');
      const id_unidad = await ensureUnidad(unidadName);
      const id_categoria = await ensureCategoria(cat.categoria || 'Otros');
      try {
        let savedIng = null;
        for (const variant of buildIngredientPayloadVariants(ing, id_unidad, id_categoria)) {
          try {
            if (String(process.env.REACT_APP_DEBUG_API || 'false').toLowerCase() === 'true') {
              console.log('[API] TRY ingrediente payload', variant);
            }
            savedIng = await postOverCandidates(RELATED_ENDPOINTS.ingredientes, variant);
            if (savedIng) break;
          } catch (e) {
            const status = e?.response?.status;
            // If not a 404/405, keep trying next variant; final failure handled by outer catch
            if (status && (status === 404 || status === 405)) break;
          }
        }
        if (!savedIng) throw new Error('No se pudo crear ingrediente (variantes fallidas)');
        const idIng = savedIng?.id_ingrediente ?? savedIng?.id ?? null;
        if (idIng != null) createdIngredientes[ing.nombre] = idIng;
        if (recetaId != null && idIng != null) {
          // Variantes para fk en RecetaIngrediente: algunos backends esperan *_id
          const recetaIngredienteVariants = [
            { id_receta: recetaId, id_ingrediente: idIng },
            { id_receta_id: recetaId, id_ingrediente_id: idIng },
          ];
          let linked = false;
          for (const v of recetaIngredienteVariants) {
            try {
              if (String(process.env.REACT_APP_DEBUG_API || 'false').toLowerCase() === 'true') {
                console.log('[API] TRY receta-ingrediente payload', v);
              }
              await postOverCandidates(RELATED_ENDPOINTS.recetaIngredientes, v); linked = true; break; }
            catch (e) {
              const st = e?.response?.status;
              if (st && (st === 404 || st === 405)) break;
            }
          }
          if (!linked) throw new Error('No se pudo vincular ingrediente a receta');
        }
      } catch {}
    }
  }
  // Persist etapas y enlaces
  const deriveFaseEtapa = (p) => {
    // Usar únicamente la letra base provista por la UI (A-E)
    const raw = (p?.etapa ?? '').toString().trim().toUpperCase();
    return /^[A-E]$/.test(raw) ? raw : 'A';
  };
  // Asegurar unicidad de fase_etapa por receta: si se repite, asignar la siguiente disponible
  const allowedPhases = ['A','B','C','D','E'];
  const usedPhases = new Set();
  for (let i = 0; i < (uiRecipe.procesos || []).length; i++) {
    const p = uiRecipe.procesos[i];
    const etapaPayload = {
      nombre_etapa: p.titulo || `Etapa ${p.etapa}`,
      tiempo_minutos: Number(p.tiempoEstimado) || null,
    };
    let etapaId = null;
    try {
      const savedEtapa = await postOverCandidates(RELATED_ENDPOINTS.etapas, etapaPayload);
      etapaId = savedEtapa?.id_etapa ?? savedEtapa?.id ?? null;
    } catch {}
    if (recetaId != null && etapaId != null) {
      try {
        // fase propuesta
        let fase = deriveFaseEtapa(p);
        if (usedPhases.has(fase)) {
          // Buscar la siguiente disponible
          fase = allowedPhases.find(ph => !usedPhases.has(ph)) || fase;
        }
        usedPhases.add(fase);
        const baseRel = {
          fase_etapa: fase,
          instruccion_etapa: p.descripcion || null,
          orden: i + 1,
        };
        const variants = [
          { ...baseRel, id_receta: recetaId, id_etapa: etapaId },
          { ...baseRel, id_receta_id: recetaId, id_etapa_id: etapaId },
        ];
        let linkedEtapa = false;
        for (const v of variants) {
          try {
            await postOverCandidates(RELATED_ENDPOINTS.recetaEtapas, v);
            linkedEtapa = true; break;
          } catch (e) {
            const st = e?.response?.status;
            if (st && (st === 404 || st === 405)) break;
            // continuar intentando siguiente variante en caso de 400
          }
        }
        if (!linkedEtapa) throw new Error('No se pudo vincular receta_etapa');
      } catch {}
    }
    // EtapaIngredientes
    for (const iu of (p.ingredientesUsados || [])) {
      const idIng = createdIngredientes[iu.nombre] || null;
      if (etapaId != null && idIng != null) {
        try {
          await postOverCandidates(RELATED_ENDPOINTS.etapaIngredientes, {
            cantidad_ingrediente: Number(iu.cantidad) || 0,
            orden_ingrediente: null,
            id_etapa: etapaId,
            id_ingrediente: idIng,
          });
        } catch {}
      }
    }
  }
  // Técnicas (opcionales)
  for (const t of (uiRecipe.tecnicas || [])) {
    let tecnicaId = null;
    try {
      const savedTec = await postOverCandidates(RELATED_ENDPOINTS.tecnicas, {
        nombre_tecnica: t.nombre,
        descripcion: t.descripcion || null,
      });
      tecnicaId = savedTec?.id_tecnica ?? savedTec?.id ?? null;
    } catch {}
  }
  return base;
}

// --- Utilidades de enlace adicionales ---
// Ingrediente-Técnica
export async function linkIngredienteTecnica({ id_ingrediente, id_tecnica }) {
  const variants = [
    { id_ingrediente, id_tecnica },
    { id_ingrediente_id: id_ingrediente, id_tecnica_id: id_tecnica },
  ];
  for (const v of variants) {
    try { return await postOverCandidates(RELATED_ENDPOINTS.ingredienteTecnica, v); } catch (e) {
      const st = e?.response?.status; if (st && (st === 404 || st === 405)) break;
    }
  }
  throw new Error('No se pudo vincular ingrediente_tecnica');
}

// Categoria-Ingrediente (algunas APIs usan una tabla relacional explícita)
const CATEGORIA_INGREDIENTE_ENDPOINTS = [
  '/api/v1/categoria-ingrediente/',
  '/api/v1/categoria_ingrediente/',
  '/api/v1/categorias-ingredientes/',
  '/categorias-ingredientes/',
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
