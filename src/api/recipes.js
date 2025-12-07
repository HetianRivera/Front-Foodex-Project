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

function getAnioDateString() {
  const raw = process.env.REACT_APP_ANIO;
  if (raw !== undefined && raw !== null) {
    const s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // ya es YYYY-MM-DD
    const n = Number(s);
    if (Number.isFinite(n) && n > 0) return `${n}-01-01`;
  }
  try {
    const y = new Date().getFullYear();
    if (y && y > 0) return `${y}-01-01`;
  } catch {}
  return '2025-01-01';
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
    anio: getAnioDateString(),
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
  etapas: ['/api/v1/etapas/'],
  ingredientes: ['/api/v1/ingredientes/'],
  tecnicas: ['/api/v1/tecnicas/'],
  recetaEtapas: ['/api/v1/receta-etapas/'],
  recetaIngredientes: ['/api/v1/receta-ingredientes/'],
  etapaIngredientes: ['/api/v1/etapa-ingredientes/'],
  ingredienteTecnica: ['/api/v1/ingrediente-tecnica/'],
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
  // 0) Crear receta primero para obtener id_receta
  let base = null;
  let recetaId = null;
  let deferredMode = false;
  const skipRecipe = String(process.env.REACT_APP_SKIP_RECIPE_CREATION || 'false').toLowerCase() === 'true';
  if (skipRecipe) {
    deferredMode = true;
    recetaId = `temp-${Date.now()}`;
    base = { id: recetaId, id_receta: recetaId, nombre_receta: uiRecipe?.nombre || 'Pendiente', _deferred: true };
    if (String(process.env.REACT_APP_DEBUG_API || 'false').toLowerCase() === 'true') {
      console.warn('[API] Modo saltar receta: no se intenta POST /recetas, se usa ID temporal');
    }
  } else {
    try {
      base = await createRecipe(uiRecipe);
      recetaId = base?.id_receta ?? base?.id ?? null;
    } catch (err) {
      const allowDefer = String(process.env.REACT_APP_DEFER_RECIPE_ON_ERROR || 'false').toLowerCase() === 'true';
      const status = err?.response?.status;
      if (allowDefer && status && status >= 500) {
        deferredMode = true;
        recetaId = `temp-${Date.now()}`;
        base = { id: recetaId, id_receta: recetaId, nombre_receta: uiRecipe?.nombre || 'Pendiente', _deferred: true };
        if (String(process.env.REACT_APP_DEBUG_API || 'false').toLowerCase() === 'true') {
          console.warn('[API] Modo diferido: receta temporal creada en memoria por error servidor', status);
        }
      } else {
        throw err;
      }
    }
  }

  // 1) Crear tablas independientes después: unidades/categorías (prefetch/ensure), ingredientes, etapas, técnicas
  const createdIngredientes = {}; // nombre -> id
  const createdEtapas = []; // { id_etapa, fase, orden, instruccion, ingredientesUsados }
  const unidadAlias = { gr: 'gramos', kg: 'kilogramos', ml: 'mililitros', lt: 'litros', u: 'unidades' };
  // Unidades descartadas por backend actual
  await prefetchCategorias();

  const buildIngredientPayloadVariants = (ing, id_categoria) => {
    const common = { nombre: ing.nombre };
    return [
      { ...common, id_categoria },
      { ...common, id_categoria_id: id_categoria },
      { ...common, id_categoria_ingrediente: id_categoria },
      { ...common, id_categorias_ingrediente: id_categoria },
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
        if (idIng != null) createdIngredientes[ing.nombre] = idIng;
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
  const pushPendingLink = (kind, payload) => {
    if (!deferredMode) return;
    try {
      const raw = localStorage.getItem('foodex_pending_links');
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ kind, payload, recetaId });
      localStorage.setItem('foodex_pending_links', JSON.stringify(arr));
    } catch {}
  };

  // 3) Enlazar receta con ingredientes
  if (recetaId != null) {
    for (const [nombreIng, idIng] of Object.entries(createdIngredientes)) {
      try {
        const recetaIngredienteVariants = [
          { id_receta: recetaId, id_ingrediente: idIng },
          { id_receta_id: recetaId, id_ingrediente_id: idIng },
        ];
        let linked = false;
        for (const v of recetaIngredienteVariants) {
          try {
            if (deferredMode) { pushPendingLink('receta-ingrediente', v); linked = true; break; }
            await postOverCandidates(RELATED_ENDPOINTS.recetaIngredientes, v); linked = true; break;
          }
          catch (e) { const st = e?.response?.status; if (st && (st === 404 || st === 405)) break; else throw e; }
        }
        if (!linked) throw new Error(`No se pudo vincular ingrediente a receta: ${nombreIng}`);
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
          orden: et.orden,
        };
        if (deferredMode) { pushPendingLink('receta-etapa', payloadRE); }
        else { await postOverCandidates(RELATED_ENDPOINTS.recetaEtapas, payloadRE); }
      } catch (err) {
        throw err;
      }
    }
    for (const iu of et.ingredientesUsados) {
      const idIng = createdIngredientes[iu?.nombre];
      const cantidad = Number(iu.cantidad);
      if (etapaId != null && idIng != null && Number.isFinite(cantidad)) {
        try {
          const payloadEI = {
            cantidad_ingrediente: cantidad,
            orden_ingrediente: null,
            id_etapa: etapaId,
            id_ingrediente: idIng,
          };
          // Forzar ejecución inmediata aunque esté activo el modo diferido,
          // ya que etapa-ingrediente no depende de receta.
          await postOverCandidates(RELATED_ENDPOINTS.etapaIngredientes, payloadEI);
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
          const idIng = createdIngredientes[nm];
          if (idIng != null) {
            try {
              const payloadIT = { id_ingrediente: idIng, id_tecnica: tec.id_tecnica };
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
    throw err;
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
