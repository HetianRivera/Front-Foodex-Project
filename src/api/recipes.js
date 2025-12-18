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

function getAnioYear() {
  const raw = process.env.REACT_APP_ANIO;
  if (raw !== undefined && raw !== null) {
    const s = String(raw).trim();
    const match = s.match(/^(\d{4})/);
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const n = Number(s);
    if (Number.isFinite(n) && n > 0) return n;
  }
  try { const y = new Date().getFullYear(); if (y && y > 0) return y; } catch {}
  return 2025;
}

const RECETA_COMPLETA_BASE = (process.env.REACT_APP_RECETA_COMPLETA_ENDPOINT || '/api/v1/recetas/completas/').replace(/\/+$/, '/') ;

async function tryRequestSingle(method, path = '', dataOrConfig) {
  const url = RECETA_COMPLETA_BASE + path;
  if (String(process.env.REACT_APP_DEBUG_API || 'false').toLowerCase() === 'true') {
    console.log(`[API-RECETA] ${method.toUpperCase()} ${url}`, method === 'get' ? { params: dataOrConfig } : dataOrConfig);
  }
  const resp = await api.request({ method, url, ...(method === 'get' ? { params: dataOrConfig } : { data: dataOrConfig }) });
  return resp.data;
}

// Construye el objeto RecetaCompleta esperado por el endpoint robusto.
export function toBackendRecetaCompletaPayload(recipe) {
  const userId = getUserId();
  if (!userId) throw new Error('No se pudo determinar id_usuario (no hay sesión)');

  let lsSemestre = null, lsTaller = null;
  try { const v = localStorage.getItem('foodex_id_semestre'); if (v) lsSemestre = Number(v); } catch {}
  try { const v = localStorage.getItem('foodex_id_taller'); if (v) lsTaller = Number(v); } catch {}

  const receta = {
    nombre_receta: (recipe?.nombre || recipe?.title || '').toString().trim() || 'Sin nombre',
    codigo_receta: (recipe?.codigo || recipe?.code) ? String(recipe.codigo || recipe.code).trim() : null,
    anio: recipe?.anio ? Number(recipe.anio) : getAnioYear(),
    detalle_montaje: recipe?.montaje || recipe?.detalle_montaje || null,
    estado: recipe?.estado !== undefined ? !!recipe.estado : true,
    id_usuario: userId,
    id_semestre: lsSemestre ?? getIntEnvOr('REACT_APP_SEMESTRE_ID', 1),
  };
  const includeTaller = String(process.env.REACT_APP_INCLUDE_TALLER_IN_RECETA || 'false').toLowerCase() === 'true';
  if (includeTaller && lsTaller != null && Number.isFinite(lsTaller)) receta.id_taller = lsTaller;

  // Construir lista de ingredientes planos a partir de la estructura por categorías
  const ingredientes = [];
  const defaultUnidad = Number(localStorage.getItem('foodex_id_unidad_default')) || getIntEnvOr('REACT_APP_DEFAULT_UNIDAD_ID', 1);
  const defaultCategoriaId = getIntEnvOr('REACT_APP_DEFAULT_CATEGORY_ID', 1);
  if (Array.isArray(recipe?.ingredientes)) {
    for (const cat of recipe.ingredientes) {
      const catIdFromCat = cat?.id_categoria ?? cat?.id ?? null;
      for (const ing of (cat?.ingredientes || [])) {
        const nombre = String(ing?.nombre || ing?.name || '').trim();
        if (!nombre) continue; // evitar enviar ingredientes sin nombre
        const id_unidad = ing?.id_unidad ?? ing?.unidad_id ?? defaultUnidad;
        const id_categoria = ing?.id_categoria ?? ing?.categoria_id ?? catIdFromCat ?? defaultCategoriaId;
        ingredientes.push({ nombre, id_unidad: Number(id_unidad) || defaultUnidad, id_categoria: Number(id_categoria) || defaultCategoriaId });
      }
    }
  }

  const categorias_ingrediente = Array.isArray(recipe?.categoria_ingrediente)
    ? recipe.categoria_ingrediente.map(ci => ({ id_ingrediente: ci.id_ingrediente ?? null, id_categoria: ci.id_categoria ?? null }))
    : [];

  const receta_ingredientes = Array.isArray(recipe?.receta_ingredientes)
    ? recipe.receta_ingredientes.map(ri => ({ id_receta: ri.id_receta ?? null, id_ingrediente: ri.id_ingrediente ?? null, id_receta_ingrediente: ri.id_receta_ingrediente ?? null }))
    : [];

  const mapEtapa = (e, idx) => ({
    id_etapa: e?.id_etapa ?? genRecetaEtapaId(0, idx + 1),
    nombre_etapa: (e?.nombre_etapa || e?.nombre || e?.title || e?.titulo || '').toString().trim(),
    tiempo_minutos: e?.tiempo_minutos ?? e?.tiempo ?? e?.tiempoEstimado ?? null,
    descripcion: e?.descripcion ?? e?.instruccion_etapa ?? e?.instruccion ?? null,
    instruccion_etapa: e?.instruccion_etapa ?? e?.instruccion ?? e?.descripcion ?? null,
  });
  // Aceptar `etapas` o su sinónimo `procesos` desde la UI (NewRecipePage usa `procesos`)
  const etapasSource = Array.isArray(recipe?.etapas)
    ? recipe.etapas
    : Array.isArray(recipe?.procesos)
    ? recipe.procesos
    : [];
  const etapas = etapasSource.map(mapEtapa);

  const receta_etapas = Array.isArray(recipe?.receta_etapas)
    ? recipe.receta_etapas.map((re, idx) => ({
        fase_etapa: re.fase_etapa ?? null,
        instruccion_etapa: re.instruccion_etapa ?? null,
        id_receta: re.id_receta ?? null,
        id_etapa: re.id_etapa ?? (etapas[idx]?.id_etapa ?? null),
        id_receta_etapa: re.id_receta_etapa ?? genRecetaEtapaId(0, idx + 1)
      }))
    : [];

  const etapa_ingredientes = Array.isArray(recipe?.etapa_ingredientes)
    ? recipe.etapa_ingredientes.map(ei => ({ cantidad_ingrediente: ei.cantidad_ingrediente ?? null, tiempo_coccion_minutos: ei.tiempo_coccion_minutos ?? null, id_etapa: ei.id_etapa ?? null, id_ingrediente: ei.id_ingrediente ?? null, id_etapa_ingrediente: ei.id_etapa_ingrediente ?? null, id: ei.id ?? null }))
    : [];

  // Si no vienen `receta_etapas` pero sí `etapas`, generar enlaces para las fases A..E solamente
  if (receta_etapas.length === 0 && etapas.length > 0) {
    const allowed = ['A','B','C','D','E'];
    const take = etapas.slice(0, allowed.length);
    receta_etapas.push(...take.map((et, idx) => ({
      fase_etapa: allowed[idx],
      instruccion_etapa: et.instruccion_etapa ?? et.descripcion ?? null,
      id_receta: null,
      id_etapa: et.id_etapa ?? null,
      id_receta_etapa: genRecetaEtapaId(0, idx + 1),
    })));
  }

  // Mapear técnicas asegurando nombres en varios formatos para compatibilidad con APIs distintas
  const tecnicas = Array.isArray(recipe?.tecnicas)
    ? recipe.tecnicas.map(t => ({
        nombre_tecnica: t.nombre_tecnica || t.nombre || t.name || '',
        nombre: t.nombre || t.nombre_tecnica || t.name || '',
        descripcion: t.descripcion ?? t.descripcion_tecnica ?? null,
      }))
    : [];

  const ingrediente_tecnica = Array.isArray(recipe?.ingrediente_tecnica)
    ? recipe.ingrediente_tecnica.map(it => ({ id_ingrediente: it.id_ingrediente ?? null, id_tecnica: it.id_tecnica ?? null, id_ingrediente_tecnica: it.id_ingrediente_tecnica ?? null }))
    : [];

  return {
    receta,
    ingredientes,
    categoria_ingrediente: categorias_ingrediente,
    receta_ingredientes,
    etapas,
    receta_etapas,
    etapa_ingredientes,
    tecnicas,
    ingrediente_tecnica,
  };
}

export async function createRecipe(recipe) {
  const payload = toBackendRecetaCompletaPayload(recipe);
  return tryRequestSingle('post', '', payload);
}

export async function getRecipe(id) {
  const idSeg = `${encodeURIComponent(id)}/`;
  return tryRequestSingle('get', idSeg, {});
}

export async function listRecipes(params = {}) {
  const data = await tryRequestSingle('get', '', params);
  const raw = Array.isArray(data) ? data : (data?.results || []);

  // Si el endpoint devuelve la estructura "RecetaCompleta" dentro de cada elemento
  // (campo `receta` con objetos relacionados), aplanar para que la UI reciba
  // objetos con los campos esperados (`id_receta`, `nombre`, `codigo`, `ingredientes`, `procesos`, ...)
  const mapped = raw.map(item => {
    if (!item) return item;
    // Si ya viene plano, no modificar
    if (!item.receta) return item;

    const recetaObj = { ...(item.receta || {}) };
    // Intentar obtener id_receta preferentemente
    recetaObj.id_receta = recetaObj.id_receta ?? recetaObj.id ?? (
      (item.receta_etapas && item.receta_etapas[0] && item.receta_etapas[0].id_receta) ||
      (item.receta_ingredientes && item.receta_ingredientes[0] && item.receta_ingredientes[0].id_receta) ||
      null
    );
    // Normalizar nombres usados en la UI
    recetaObj.nombre = recetaObj.nombre_receta ?? recetaObj.nombre ?? recetaObj.title ?? recetaObj.nombre_receta;
    recetaObj.codigo = recetaObj.codigo_receta ?? recetaObj.codigo ?? recetaObj.code ?? null;
    recetaObj.anio = recetaObj.anio ?? recetaObj.year ?? null;

    // Agregar relaciones directamente en la receta para la UI
    recetaObj.ingredientes = item.ingredientes ?? item.receta_ingredientes ?? [];
    recetaObj.procesos = item.etapas ?? item.receta_etapas ?? item.procesos ?? [];
    recetaObj.tecnicas = item.tecnicas ?? item.tecnica ?? [];
    recetaObj.etapa_ingredientes = item.etapa_ingredientes ?? [];

    return recetaObj;
  });

  return mapped;
}

export async function updateRecipe(id, patch) {
  const idSeg = `${encodeURIComponent(id)}/`;
  return tryRequestSingle('put', idSeg, patch);
}

export async function deleteRecipe(id) {
  const idSeg = `${encodeURIComponent(id)}/`;
  return tryRequestSingle('delete', idSeg, {});
}

// --- Helpers re-introducidos que usan createFullRecipe ---

// Normalizar cantidades de ingredientes a una sola unidad (gramos para sólidos, mililitros para líquidos)
function normalizeIngredientsInRecipe(recipe) {
  if (!recipe || !Array.isArray(recipe.ingredientes)) return recipe;
  const copy = { ...recipe, ingredientes: recipe.ingredientes.map(cat => ({
    categoria: cat.categoria,
    ingredientes: Array.isArray(cat.ingredientes) ? cat.ingredientes.map(ing => {
      const nombre = ing.nombre || ing.name || '';
      let cantidad = Number(ing.cantidad) || 0;
      const unidad = (ing.unidad || '').toString().toLowerCase();
      if (unidad === 'kg') cantidad = cantidad * 1000;
      if (unidad === 'lt' || unidad === 'l') cantidad = cantidad * 1000;
      return { nombre, cantidad: Number(cantidad) };
    }) : []
  })) };
  return copy;
}

let categoriaMapCache = null;
async function prefetchCategorias() {
  if (categoriaMapCache) return categoriaMapCache;
  const candidates = ['/api/v1/categorias/'];
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
    } catch (e) {
      /* ignore and try next */
    }
  }
  categoriaMapCache = {};
  return categoriaMapCache;
}

async function ensureCategoria(nombre) {
  const map = await prefetchCategorias();
  const key = String(nombre || '').toLowerCase();
  if (map[key] != null) return map[key];
  throw new Error(`Categoría no encontrada: ${nombre}`);
}

function genRecetaIngredienteId(recetaId, ingredienteId, seq = 0) {
  const r = Number(recetaId) || 0;
  const i = Number(ingredienteId) || 0;
  const t = Date.now() % 1000000000;
  const n = (r * 100000) + (i * 100) + (seq % 100) + t;
  return Math.abs(n);
}

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
        if (String(v) === String(value) || v === value) return true;
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
  // 1) Intentar obtener TODO desde el endpoint robusto y mapear a formato UI.
  const base = await getRecipe(recetaId).catch(() => null);
  if (base) {
    // Detectar si el endpoint robusto ya incluye relaciones
    const hasRelations =
      (Array.isArray(base.ingredientes) && base.ingredientes.length > 0) ||
      (Array.isArray(base.receta_ingredientes) && base.receta_ingredientes.length > 0) ||
      (Array.isArray(base.etapas) && base.etapas.length > 0) ||
      (Array.isArray(base.receta_etapas) && base.receta_etapas.length > 0) ||
      (Array.isArray(base.tecnicas) && base.tecnicas.length > 0) ||
      (Array.isArray(base.tecnica) && base.tecnica.length > 0);

    if (hasRelations) {
      const item = base.receta ? { ...(base.receta || {}), ...base } : { ...base };
      const mapped = { ...item };
      mapped.id_receta = mapped.id_receta ?? mapped.id ?? null;
      mapped.nombre = mapped.nombre_receta ?? mapped.nombre ?? mapped.title ?? '';
      mapped.codigo = mapped.codigo_receta ?? mapped.codigo ?? mapped.code ?? null;
      mapped.anio = mapped.anio ?? mapped.year ?? null;

      mapped.ingredientes = base.ingredientes ?? base.receta_ingredientes ?? mapped.ingredientes ?? [];
      mapped.procesos = base.etapas ?? base.receta_etapas ?? base.procesos ?? mapped.procesos ?? [];
      mapped.tecnicas = base.tecnicas ?? base.tecnica ?? mapped.tecnicas ?? [];
      mapped.etapa_ingredientes = base.etapa_ingredientes ?? mapped.etapa_ingredientes ?? [];

      return mapped;
    }
  }

  // 2) Fallback: si el endpoint robusto no devuelve relaciones, consultar endpoints relacionados
  const result = base ? { ...base } : { id_receta: recetaId };

  // receta-ingredientes -> ingredientes (detallados)
  let recetaIngs = [];
  try {
    const data = await tryGetOverCandidates(RELATED_ENDPOINTS.recetaIngredientes, recetaId);
    recetaIngs = Array.isArray(data) ? data : (data?.results || []);
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
    const nombre = ingDetail?.nombre || ri.nombre || ri.nombre_ingrediente || null;
    const cantidad = ri.cantidad_ingrediente ?? ri.cantidad ?? null;
    const unidad = ingDetail?.unidad || ri.unidad || null;
    const categoria = ingDetail?.categoria || ri.categoria || 'Sin categoría';
    const ingObj = { id_ingrediente: ingId, nombre, cantidad, unidad, ...(ingDetail || {}) };
    if (ingId) ingredientesById[ingId] = ingObj;
    if (!categoriaMap[categoria]) categoriaMap[categoria] = [];
    categoriaMap[categoria].push(ingObj);
  }

  result.ingredientes = Object.keys(categoriaMap).map(cat => ({ categoria: cat, ingredientes: categoriaMap[cat] }));

  // receta-etapas -> procesos (etapas) y sus ingredientes (etapa-ingredientes)
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

  // Técnicas: intentar ligar técnicas a partir de ingrediente-tecnica
  const tecnicaIds = new Set();
  try {
    const allIngIds = Object.keys(ingredientesById).filter(Boolean);
    for (const ingId of allIngIds) {
      try {
        const links = await tryGetOverCandidates(RELATED_ENDPOINTS.ingredienteTecnica, ingId).catch(() => []);
        const arr = Array.isArray(links) ? links : (links?.results || []);
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
  // Normalizar ingredientes y construir payload completo
  try { uiRecipe = normalizeIngredientsInRecipe(uiRecipe); } catch {}
  const payload = toBackendRecetaCompletaPayload(uiRecipe);
  // Log del payload para depuración cuando estén activadas las trazas
  try {
    if (String(process.env.REACT_APP_DEBUG_API || 'false').toLowerCase() === 'true') {
      console.debug('[createFullRecipe] payload:', payload);
    }
  } catch (e) {}
  // Enviar todo en un solo POST al endpoint robusto
  const resp = await tryRequestSingle('post', '', payload);
  return resp;
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

export async function listUserRecipes(userId) {
  try {
    let uid = userId;
    if (!uid) {
      uid = getUserId();
    }
    if (!uid) throw new Error('userId requerido para listar recetas por usuario');
    if (String(process.env.REACT_APP_DEBUG_API || 'false').toLowerCase() === 'true') {
      console.debug('[API] listUserRecipes: usando id_usuario=', uid);
    }
    const data = await listRecipes({ id_usuario: uid });
    return Array.isArray(data) ? data : (data?.results || []);
  } catch (e) {
    // Si ocurre un error (p.e. no hay userId), intentar devolver todas las recetas como fallback
    try {
      const data = await listRecipes();
      return Array.isArray(data) ? data : (data?.results || []);
    } catch (err) {
      throw e;
    }
  }
}

// Borra una receta y, de forma opcional, intenta eliminar relaciones ligadas.
export async function deleteFullRecipe(recetaId) {
  if (!recetaId) throw new Error('recetaId requerido');
  const deleteDetailOverCandidates = async (urls, id) => {
    if (!urls || !id) return;
    for (const u of urls) {
      try {
        const url = u.replace(/\/+$/, '/') + encodeURIComponent(id) + '/';
        await api.delete(url);
        return;
      } catch (e) {
        const st = e?.response?.status;
        if (st && st !== 404 && st !== 405) throw e;
      }
    }
  };

  try {
    const data = await tryGetOverCandidates(RELATED_ENDPOINTS.recetaIngredientes, recetaId).catch(() => []);
    const arr = Array.isArray(data) ? data : (data?.results || []);
    for (const item of arr) {
      const id = item.id_receta_ingrediente ?? item.id ?? null;
      if (!id) continue;
      if (String(id) === String(recetaId)) continue;
      await deleteDetailOverCandidates(RELATED_ENDPOINTS.recetaIngredientes, id).catch(() => {});
    }
  } catch (e) {}

  try {
    const reData = await tryGetOverCandidates(RELATED_ENDPOINTS.recetaEtapas, recetaId).catch(() => []);
    const reArr = Array.isArray(reData) ? reData : (reData?.results || []);
    for (const rel of reArr) {
      const idRel = rel.id_receta_etapa ?? rel.id ?? null;
      const etapaId = rel.id_etapa ?? rel.id_etapa_id ?? rel.id_etapa ?? null;
      if (etapaId) {
        try {
          const ei = await tryGetOverCandidates(RELATED_ENDPOINTS.etapaIngredientes, etapaId).catch(() => []);
          const eiArr = Array.isArray(ei) ? ei : (ei?.results || []);
          for (const item of eiArr) {
            const idEi = item.id_etapa_ingrediente ?? item.id ?? null;
            if (!idEi) continue;
            if (String(idEi) === String(recetaId)) continue;
            await deleteDetailOverCandidates(RELATED_ENDPOINTS.etapaIngredientes, idEi).catch(() => {});
          }
        } catch (e) {}
      }
      if (idRel && String(idRel) !== String(recetaId)) await deleteDetailOverCandidates(RELATED_ENDPOINTS.recetaEtapas, idRel).catch(() => {});
    }
  } catch (e) {}

  try {
    const recetaIngs = await tryGetOverCandidates(RELATED_ENDPOINTS.recetaIngredientes, recetaId).catch(() => []);
    const arr = Array.isArray(recetaIngs) ? recetaIngs : (recetaIngs?.results || []);
    const ingredientIds = arr.map(i => i.id_ingrediente ?? i.ingrediente ?? i.id).filter(Boolean);
    for (const ingId of ingredientIds) {
      try {
        const links = await tryGetOverCandidates(RELATED_ENDPOINTS.ingredienteTecnica, ingId).catch(() => []);
        const linkArr = Array.isArray(links) ? links : (links?.results || []);
        for (const l of linkArr) {
          const idLink = l.id_ingrediente_tecnica ?? l.id ?? null;
          if (!idLink) continue;
          if (String(idLink) === String(recetaId)) continue;
          await deleteDetailOverCandidates(RELATED_ENDPOINTS.ingredienteTecnica, idLink).catch(() => {});
        }
      } catch (e) {}
    }
  } catch (e) {}

  return deleteRecipe(recetaId);
}
