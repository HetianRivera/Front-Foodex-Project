import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  ArrowLeft, 
  ChefHat, 
  Clock, 
  AlertTriangle,
  Utensils,
  Package,
  List
} from 'lucide-react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardFooter } from './DashboardFooter';
import { useEffect, useState } from 'react';
import { getFullRecipe } from '../api/recipes';
import { FullScreenLoader } from './FullScreenLoaderCargando';
import { toast } from 'sonner';
import { api } from '../api/client';

export function RecipeView({ recipeId, user, onBack, onLogout, recipes }) {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  const normalize = (data) => {
    if (!data) return null;
    // Map backend fields to UI-friendly fields used in this component
    const r = {
      id: data.id_receta ?? data.id ?? data.id_receta,
      nombre: data.nombre_receta ?? data.nombre ?? data.nombre_receta,
      codigo: data.codigo_receta ?? data.codigo ?? data.codigo_receta,
      categoria: data.categoria ?? data.categoria_receta ?? data.categoria,
      tiempo: data.tiempo ?? data.tiempo_minutos ?? data.tiempo_estimado ?? data.tiempo ?? 0,
      porcion: data.porcion ?? data.porciones ?? data.porcion ?? 0,
      rendimiento: data.rendimiento ?? null,
      aporte: data.aporte ?? null,
      montaje: data.detalle_montaje ?? data.montaje ?? data.detalle_montaje ?? '',
      procesos: [],
      ingredientes: (() => {
        const raw = Array.isArray(data.ingredientes) ? data.ingredientes : (Array.isArray(data.receta_ingredientes) ? data.receta_ingredientes : []);
        const normalizeItem = (i) => ({
          nombre: i?.nombre || i?.nombre_ingrediente || i?.name || null,
          cantidad: i?.cantidad_ingrediente ?? i?.cantidad ?? i?.amount ?? null,
          unidad: i?.unidad?.nombre_unidad ?? i?.unidad?.nombre ?? i?.unidad_name ?? i?.unidad ?? i?.unit ?? null,
          ...i,
        });
        if (raw.length > 0 && raw[0] && Array.isArray(raw[0].ingredientes)) {
          // categorized ingredients: keep categories, but normalize inner items
          return raw.map(cat => ({ ...cat, ingredientes: Array.isArray(cat.ingredientes) ? cat.ingredientes.map(normalizeItem) : [] }));
        }
        return raw.map(normalizeItem);
      })(),
      tecnicas: Array.isArray(data.tecnicas) ? data.tecnicas : (Array.isArray(data.tecnica) ? data.tecnica : []),
    };

    // Extract stages from multiple possible backend field names
    try {
      const stageCandidates = ['procesos','etapas','pasos','recetaEtapas','receta_etapas','receta_etapa','proceso','procesos_list','etapa_list'];
      let rawStages = null;
      for (const key of stageCandidates) {
        if (Array.isArray(data[key])) { rawStages = data[key]; break; }
        if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
          // object-like map -> convert to array
          rawStages = Object.keys(data[key]).map(k => data[key][k]);
          break;
        }
      }
      if (!rawStages && Array.isArray(data.procesos)) rawStages = data.procesos;
      if (!rawStages && Array.isArray(data.etapas)) rawStages = data.etapas;
      if (!rawStages && Array.isArray(data.pasos)) rawStages = data.pasos;
      if (rawStages && Array.isArray(rawStages)) {
        r.procesos = rawStages.map(e => ({
          etapa: e?.fase_etapa ?? e?.fase ?? e?.etapa ?? e?.orden ?? null,
          titulo: e?.nombre_etapa ?? e?.titulo ?? e?.nombre ?? e?.name ?? '',
          descripcion: e?.instruccion_etapa ?? e?.instruccion ?? e?.descripcion ?? e?.detalle ?? '',
          instruccion_etapa: e?.instruccion_etapa ?? e?.instruccion ?? e?.descripcion ?? e?.detalle ?? '',
          tiempoEstimado: e?.tiempo_minutos ?? e?.tiempoCoccionMin ?? e?.tiempoEstimado ?? e?.tiempo ?? null,
          id_etapa: e?.id_etapa ?? e?.id ?? null,
          ingredientesUsados: (Array.isArray(e?.ingredientesUsados) ? e.ingredientesUsados : (Array.isArray(e?.ingredientes) ? e.ingredientes : [])).map(iu => ({
            nombre: iu?.nombre || iu?.nombre_ingrediente || iu?.name || null,
            cantidad: iu?.cantidad_ingrediente ?? iu?.cantidad ?? iu?.amount ?? null,
            unidad: iu?.unidad ?? iu?.unidad_name ?? iu?.unit ?? null,
            tiempoCoccion: iu?.tiempo_coccion_minutos ?? iu?.tiempoCoccion ?? iu?.tiempo_coccion ?? iu?.tiempoCoccionMin ?? null,
            ...iu,
          })),
        }));

        // If etapas don't include ingredientesUsados, try to attach from top-level etapa_ingredientes
        const etapaIngsGlobal = Array.isArray(data?.etapa_ingredientes) ? data.etapa_ingredientes : (Array.isArray(data?.etapaIngredientes) ? data.etapaIngredientes : (Array.isArray(data?.etapa_ingredientes_list) ? data.etapa_ingredientes_list : []));
        if (Array.isArray(etapaIngsGlobal) && etapaIngsGlobal.length > 0) {
          r.procesos = r.procesos.map(pr => {
            if (Array.isArray(pr.ingredientesUsados) && pr.ingredientesUsados.length > 0) return pr;
            // match by id_etapa or etapa/fase
            const matches = etapaIngsGlobal.filter(ei => {
              const idCandidate = (ei.id_etapa ?? ei.etapa ?? ei.id);
              const idMatch = pr.id_etapa && (idCandidate === pr.id_etapa);
              const faseMatch = pr.etapa && ((String(ei.fase_etapa || ei.fase || ei.etapa || ei.etapa_id || ei.etapa) === String(pr.etapa)) || (String(ei.fase || ei.etapa) === String(pr.etapa)));
              return idMatch || faseMatch;
            });
            if (!matches || matches.length === 0) return pr;
            const normalized = matches.map(iu => ({
              nombre: iu?.nombre || iu?.nombre_ingrediente || iu?.ingredient_name || iu?.name || null,
              cantidad: iu?.cantidad_ingrediente ?? iu?.cantidad ?? iu?.amount ?? null,
              unidad: iu?.unidad?.nombre_unidad ?? iu?.unidad?.nombre ?? iu?.unidad_name ?? iu?.unidad ?? iu?.unit ?? null,
              tiempoCoccion: iu?.tiempo_coccion_minutos ?? iu?.tiempoCoccion ?? iu?.tiempo_coccion ?? iu?.tiempoCoccionMin ?? null,
              ...iu,
            }));
            return { ...pr, ingredientesUsados: normalized };
          });
        }
      }
    } catch (e) {
      console.warn('[RecipeView] normalize stages parse error', e);
    }
    // Calcular tiempo total como suma de tiempos de procesos si están disponibles
    try {
      const total = (r.procesos || []).reduce((s, p) => {
        const t = Number(p.tiempoEstimado ?? p.tiempo_minutos ?? p.tiempo) || 0;
        return s + t;
      }, 0);
      r.tiempo = total || (r.tiempo ?? 0);
    } catch (e) {}

    // Montaje: preferir campo detalle_montaje o montaje final en data
    r.montaje = data.detalle_montaje ?? data.montaje ?? data.montaje_final ?? r.montaje ?? '';

    // Asegurar tecnicas como array de objetos con nombre/descripcion normalizados
    r.tecnicas = Array.isArray(r.tecnicas) ? r.tecnicas.map(t => ({
      nombre: t?.nombre_tecnica ?? t?.nombre ?? t?.titulo ?? t?.name ?? '',
      descripcion: t?.descripcion ?? t?.descripcion_tecnica ?? t?.detalle ?? '',
      ...t
    })) : [];

    return r;
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      // Primero intentar obtener del backend completo (detalle + relaciones)
      try {
        const data = await getFullRecipe(recipeId);
        console.debug('[RecipeView] getFullRecipe raw:', data);
        if (!mounted) return;
        const norm = normalize(data);
        console.debug('[RecipeView] normalized:', norm);
        setRecipe(norm);
        // Si no hay técnicas en la respuesta, intentar obtenerlas desde el endpoint global de técnicas
        try {
          if (!Array.isArray(norm.tecnicas) || norm.tecnicas.length === 0) {
            const resp = await api.get('/api/v1/tecnicas/');
            const list = Array.isArray(resp.data) ? resp.data : (resp.data?.results || []);
            const normalized = list.map(t => ({
              nombre: t?.nombre_tecnica ?? t?.nombre ?? t?.titulo ?? t?.name ?? '',
              descripcion: t?.descripcion ?? t?.descripcion_tecnica ?? t?.detalle ?? '',
              ...t,
            }));
            setRecipe(prev => prev ? { ...prev, tecnicas: normalized } : { ...norm, tecnicas: normalized });
          }
        } catch (e) {
          console.debug('[RecipeView] no se pudieron cargar técnicas globales:', e);
        }
       
      } catch (err) {
        console.error('[RecipeView] getFullRecipe error:', err);
        // Si falla (404 o similar), intentar buscar en `recipes` prop como fallback
        try {
          console.debug('[RecipeView] trying local fallback, recipes length:', (recipes || []).length);
          const local = (recipes || []).find(r => (r.id === recipeId || r.id_receta === recipeId || String(r.id) === String(recipeId) || String(r.id_receta) === String(recipeId)));
          if (local) {
            console.debug('[RecipeView] found local recipe:', local);
            setRecipe(normalize(local));
          } else {
            toast.error('No se encontró la receta en el servidor ni localmente');
            setRecipe(null);
          }
        } catch (e) {
          setRecipe(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [recipeId]);

  if (loading) return <FullScreenLoader show={true} />;

  if (!recipe) return <div className="p-8">Receta no encontrada</div>;

  const formatUnit = (cantidad, unidad) => {
    const qty = Number(cantidad);
    const q = Number.isFinite(qty) ? qty : null;
    if (q === null) return '-';
    if (unidad === 'kg') {
      return `${q.toFixed(3)} kg`;
    } else if (unidad === 'gr') {
      if (q >= 1000) {
        return `${(q / 1000).toFixed(2)} kg (${q} gr)`;
      }
      return `${q} gr`;
    } else if (unidad === 'lt' || unidad === 'l') {
      return `${q.toFixed(3)} lt`;
    } else if (unidad === 'ml') {
      if (q >= 1000) {
        return `${(q / 1000).toFixed(2)} lt (${q} ml)`;
      }
      return `${q} ml`;
    } else if (unidad === 'u') {
      return `${q} unidad${q > 1 ? 'es' : ''}`;
    }
    return `${q} ${unidad || ''}`;
  };

  const formatDuration = (minutes) => {
    const m = Number(minutes) || 0;
    if (m <= 0) return '0 min';
    if (m < 60) return `${m} min`;
    const days = Math.floor(m / 1440);
    const hours = Math.floor((m % 1440) / 60);
    const mins = m % 60;
    const parts = [];
    if (days) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`);
    if (hours) parts.push(`${hours} ${hours === 1 ? 'h' : 'h'}`);
    if (mins) parts.push(`${mins} min`);
    return parts.join(' ');
  };

  const faseToLetter = (val, idxFallback) => {
    const letters = ['A','B','C','D','E'];
    if (val === null || val === undefined || val === '') {
      return letters[idxFallback] ?? String(idxFallback+1);
    }
    // numeric -> map 1->A, 2->B
    const asNum = Number(val);
    if (Number.isFinite(asNum)) {
      if (asNum >= 1 && asNum <= letters.length) return letters[asNum - 1];
      return String(val);
    }
    const s = String(val).trim().toUpperCase();
    if (s.length === 1 && s >= 'A' && s <= 'Z') return s;
    // fallback to provided index
    return letters[idxFallback] ?? s;
  };

  const getStageDescription = (p) => {
    if (!p) return '';
    return (
      p.instruccion_etapa ??
      p.instruccion ??
      p.descripcion ??
      p.detalle ??
      p.descripcion_etapa ??
      p.instrucciones ??
      p.instruccion_texto ??
      p.descripcion_etapa_text ??
      ''
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-500 ease-in-out">
      <DashboardHeader user={user} onLogout={onLogout} showWelcome={false}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Button 
              variant="ghost" 
              onClick={onBack}
              size="lg"
              className="text-white hover:bg-white/10 p-5 flex-shrink-0"
            >
              <ArrowLeft className="w-7 h-7" />
            </Button>
              <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h2 className="text-2xl truncate">{recipe.nombre}</h2>
                <Badge variant="secondary" className="text-base px-3 py-1 flex-shrink-0">{recipe.codigo}</Badge>
              </div>
              <p className="text-slate-300 text-lg">{typeof recipe.categoria === 'object' ? (recipe.categoria?.nombre || recipe.categoria?.nombre_categoria || JSON.stringify(recipe.categoria)) : (recipe.categoria ?? '')}</p>
            </div>
          </div>
        </div>
      </DashboardHeader>

      {/* Content - Optimizado para tablet */}
      <div className="container mx-auto max-w-6xl p-6">
        <Tabs defaultValue="proceso" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto gap-2 bg-slate-200 dark:bg-slate-800 p-2 transition-colors duration-500">
            <TabsTrigger 
              value="proceso" 
              className="text-lg py-5 text-slate-900 dark:text-slate-100 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
            >
              <ChefHat className="w-6 h-6 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger
              value="etapa"
              className="text-lg py-5 text-slate-900 dark:text-slate-100 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
            >
              <List className="w-6 h-6 mr-2" />
              Etapas
            </TabsTrigger>
            <TabsTrigger 
              value="ingredientes" 
              className="text-lg py-5 text-slate-900 dark:text-slate-100 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
            >
              <Package className="w-6 h-6 mr-2" />
              Ingredientes
            </TabsTrigger>
            <TabsTrigger 
              value="montaje" 
              className="text-lg py-5 text-slate-900 dark:text-slate-100 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
            >
              <Utensils className="w-6 h-6 mr-2" />
              Montaje
            </TabsTrigger>
          </TabsList>

          {/* Proceso Tab - OPTIMIZADO PARA TABLET */}
          <TabsContent value="proceso" className="space-y-6">
            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200 border-2 dark:bg-slate-900 dark:border-slate-700 transition-colors duration-500">
              <CardContent className="pt-8 pb-8">
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <p className="text-base text-slate-600 dark:text-slate-300 mb-2">Tiempo Total</p>
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                      <p className="text-3xl">{formatDuration(recipe.tiempo)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-base text-slate-600 dark:text-slate-300 mb-2">Porciones</p>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-3xl">{recipe.porcion ?? recipe.porciones ?? recipe.rendimiento ?? 0}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-base text-slate-600 dark:text-slate-300 mb-2">Etapas</p>
                    <p className="text-3xl">{Array.isArray(recipe.procesos) ? recipe.procesos.length : 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

              {/* Categoria - muestra la categoría de la receta */}
              <Card className="border-l-8 border-l-indigo-500 dark:bg-slate-900 dark:border-slate-700 transition-colors duration-500">
                <CardHeader className="bg-indigo-50 dark:bg-indigo-950/20 pb-4 transition-colors duration-500">
                  <CardTitle className="text-2xl">Categoría</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 pb-4">
                  <p className="text-lg text-slate-700 dark:text-slate-300">{typeof recipe.categoria === 'object' ? (recipe.categoria?.nombre || recipe.categoria?.nombre_categoria || JSON.stringify(recipe.categoria)) : (recipe.categoria ?? '')}</p>
                </CardContent>
              </Card>

              {/* Tarea de Inicio */}

            {/* Tarea de Inicio */}
            <Card className="border-l-8 border-l-green-500 dark:bg-slate-900 dark:border-slate-700 transition-colors duration-500">
              <CardHeader className="bg-green-50 dark:bg-green-950/30 pb-6 transition-colors duration-500">
                <CardTitle className="text-2xl">Descripción</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 pb-6">
                <p className="text-xl leading-relaxed">{recipe.descripcion_receta ?? recipe.descripcion ?? recipe.montaje ?? recipe.tareaInicio ?? ''}</p>
              </CardContent>
            </Card>

            {/* procesos detallados removidos del tab 'proceso' - se mantienen en la pestaña 'Etapas' */}
          </TabsContent>

          {/* Etapas Tab - muestra todas las etapas en tarjetas */}
          <TabsContent value="etapa" className="space-y-6">
            <Card className="border-l-8 border-l-yellow-400 dark:bg-slate-900 dark:border-slate-700 transition-colors duration-500">
              <CardHeader className="bg-yellow-50 dark:bg-yellow-950/20 pb-6 transition-colors duration-500">
                <CardTitle className="text-2xl">Etapas</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 pb-6">
                {Array.isArray(recipe.procesos) && recipe.procesos.length > 0 ? (
                  <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-4">
                    {[...recipe.procesos]
                      .slice()
                      .sort((a, b) => {
                        const na = Number(a?.etapa ?? a?.fase ?? a?.orden) || 0;
                        const nb = Number(b?.etapa ?? b?.fase ?? b?.orden) || 0;
                        return na - nb;
                      })
                        .map((p, i) => (
                        <div key={i} className="p-4 bg-white dark:bg-slate-950 rounded-lg border-2 border-yellow-200 dark:border-yellow-800/40">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <Badge variant="secondary" className="text-sm px-3 py-1 flex-shrink-0">{`Fase ${faseToLetter(p.etapa ?? p.fase ?? p.orden, i)}`}</Badge>
                              <div className="text-lg font-semibold truncate">{p.titulo || `Etapa ${p.etapa || i+1}`}</div>
                            </div>
                            <div className="text-sm text-slate-500">{(p.tiempoEstimado || p.tiempo || p.tiempo_minutos) ? `${Number(p.tiempoEstimado || p.tiempo || p.tiempo_minutos)} min` : ''}</div>
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-300 mb-3 break-words">
                            <strong className="block text-slate-700 dark:text-slate-300 mb-1">Descripción:</strong>
                            <div className="whitespace-pre-wrap">{getStageDescription(p)}</div>
                          </div>
                          {Array.isArray(p.ingredientesUsados) && p.ingredientesUsados.length > 0 && (
                            <div className="mt-2">
                              <div className="text-sm text-slate-500 mb-1">Ingredientes:</div>
                              <ul className="list-disc list-inside text-sm">
                                {p.ingredientesUsados.map((ing, idx) => (
                                  <li key={idx} className="truncate">
                                    <div className="flex items-center justify-between">
                                      <div className="min-w-0 truncate">{ing.nombre || ing.nombre_ingrediente || ing.name}</div>
                                      <div className="text-sm text-slate-500 ml-4 flex-shrink-0">
                                        {(() => {
                                          const qty = ing.cantidad ?? ing.cantidad_ingrediente ?? ing.amount ?? null;
                                          let unit = ing.unidad ?? null;
                                          if (unit && typeof unit === 'object') unit = unit.nombre_unidad ?? unit.nombre ?? unit.name ?? unit.sigla ?? null;
                                          return qty != null ? `${formatUnit(qty, unit || 'gr')}` : '';
                                        })()}
                                        {ing.tiempoCoccion != null ? ` · Tiempo cocción: ${Number(ing.tiempoCoccion)} min` : ''}
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-slate-600 dark:text-slate-300">No hay etapas registradas</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ingredientes Tab (solo nombre del ingrediente) */}
          <TabsContent value="ingredientes" className="space-y-6">
            {Array.isArray(recipe.ingredientes) && recipe.ingredientes.length > 0 ? (
              Array.isArray(recipe.ingredientes[0].ingredientes) ? (
                recipe.ingredientes
                  .filter(categoria => categoria.ingredientes && categoria.ingredientes.length > 0)
                  .map((categoria, idx) => (
                    <Card key={idx} className="dark:bg-slate-900 dark:border-slate-700 transition-colors duration-500">
                      <CardHeader className="bg-slate-100 dark:bg-slate-800 pb-6 transition-colors duration-500"> 
                        <CardTitle className="text-2xl flex items-center gap-3">
                          <Badge variant="secondary" className="text-xl px-5 py-2">
                            {categoria.categoria}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <Table>
                          <TableHeader>
                            <TableRow className="dark:border-slate-700">
                              <TableHead className="text-xl py-4">Ingrediente</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {categoria.ingredientes.map((ing, ingIdx) => (
                              <TableRow key={ingIdx} className="text-lg dark:border-slate-700">
                                <TableCell className="text-xl py-5">
                                  <div className="flex items-center justify-between">
                                    <div className="min-w-0 truncate">{ing.nombre}</div>
                                    <div className="text-sm text-slate-500 ml-4 flex-shrink-0">{ing.cantidad != null ? `${formatUnit(ing.cantidad, ing.unidad || 'gr')}` : ''}</div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  ))
              ) : (
                <Card className="dark:bg-slate-900 dark:border-slate-700 transition-colors duration-500">
                  <CardHeader className="bg-slate-100 dark:bg-slate-800 pb-6 transition-colors duration-500">
                    <CardTitle className="text-2xl">Ingredientes</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <Table>
                      <TableHeader>
                        <TableRow className="dark:border-slate-700">
                          <TableHead className="text-xl py-4">Ingrediente</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recipe.ingredientes.map((ing, idx) => (
                          <TableRow key={idx} className="text-lg dark:border-slate-700">
                            <TableCell className="text-xl py-5">
                              <div className="flex items-center justify-between">
                                <div className="min-w-0 truncate">{ing.nombre || ing.nombre_ingrediente || ing.name}</div>
                                <div className="text-sm text-slate-500 ml-4 flex-shrink-0">{(() => {
                                    const qty = ing.cantidad ?? ing.cantidad_ingrediente ?? ing.amount ?? null;
                                    let unit = ing.unidad ?? null;
                                    if (unit && typeof unit === 'object') unit = unit.nombre_unidad ?? unit.nombre ?? unit.name ?? unit.sigla ?? null;
                                    return qty != null ? `${formatUnit(qty, unit || 'gr')}` : '';
                                  })()}</div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )
            ) : (
              <div className="text-slate-600 dark:text-slate-300">No hay ingredientes registrados</div>
            )}

          </TabsContent>

          {/* Montaje Tab */}
          <TabsContent value="montaje" className="space-y-6">
            <Card 
              className="border-l-8 border-l-green-500 dark:bg-slate-900 dark:border-slate-700 transition-colors duration-500"
            >
              <CardHeader className="bg-green-50 dark:bg-green-950/30 pb-6 transition-colors duration-500">
                <CardTitle className="text-3xl">Instrucciones de Montaje</CardTitle>
              </CardHeader>
              <CardContent className="pt-8 pb-8">
                <div className="bg-white dark:bg-slate-950 p-8 rounded-xl border-2 border-green-200 dark:border-green-800/50 transition-colors duration-500">
                  <p className="text-2xl leading-relaxed text-slate-900 dark:text-slate-100">
                    {recipe.montaje}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <DashboardFooter />
    </div>
  );
}
