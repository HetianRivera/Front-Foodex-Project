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
import { FullScreenLoader } from './FullScreenLoader';
import { toast } from 'sonner';

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
      tareaInicio: data.tareaInicio ?? data.tarea_inicio ?? data.tareaInicio ?? '',
      argumentacionComercial: data.argumentacionComercial ?? data.argumentacion_comercial ?? data.argumentacionComercial ?? '',
      procesos: [],
      ingredientes: Array.isArray(data.ingredientes) ? data.ingredientes : (Array.isArray(data.receta_ingredientes) ? data.receta_ingredientes : []),
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
          tiempoEstimado: e?.tiempo_minutos ?? e?.tiempoCoccionMin ?? e?.tiempoEstimado ?? e?.tiempo ?? null,
          ingredientesUsados: Array.isArray(e?.ingredientesUsados) ? e.ingredientesUsados : (Array.isArray(e?.ingredientes) ? e.ingredientes : []),
        }));
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-500 ease-in-out">
      <DashboardHeader user={user} onLogout={onLogout}>
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
              <p className="text-slate-300 text-lg">{recipe.categoria}</p>
            </div>
          </div>
        </div>
      </DashboardHeader>

      {/* Content - Optimizado para tablet */}
      <div className="container mx-auto max-w-6xl p-6">
        <Tabs defaultValue="proceso" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto gap-2 bg-slate-200 dark:bg-slate-800 p-2 transition-colors duration-500">
            <TabsTrigger 
              value="proceso" 
              className="text-lg py-5 text-slate-900 dark:text-slate-100 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
            >
              <ChefHat className="w-6 h-6 mr-2" />
              Proceso
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
              value="tecnicas" 
              className="text-lg py-5 text-slate-900 dark:text-slate-100 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
            >
              <AlertTriangle className="w-6 h-6 mr-2" />
              Técnicas
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
                <div className="grid grid-cols-2 gap-6 text-center">
                  <div>
                    <p className="text-base text-slate-600 dark:text-slate-300 mb-2">Tiempo Total</p>
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                      <p className="text-3xl">{formatDuration(recipe.tiempo)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-base text-slate-600 dark:text-slate-300 mb-2">Etapas</p>
                    <p className="text-3xl">{Array.isArray(recipe.procesos) ? recipe.procesos.length : 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tarea de Inicio */}

            {/* Tarea de Inicio */}
            <Card className="border-l-8 border-l-green-500 dark:bg-slate-900 dark:border-slate-700 transition-colors duration-500">
              <CardHeader className="bg-green-50 dark:bg-green-950/30 pb-6 transition-colors duration-500">
                <CardTitle className="text-2xl">📋 Tarea de Inicio (M.e.P.)</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 pb-6">
                <p className="text-xl leading-relaxed">{recipe.tareaInicio}</p>
              </CardContent>
            </Card>

            {/* procesos detallados removidos del tab 'proceso' - se mantienen en la pestaña 'Etapas' */}
          </TabsContent>

          {/* Etapas Tab - muestra todas las etapas en tarjetas */}
          <TabsContent value="etapa" className="space-y-6">
            <Card className="border-l-8 border-l-yellow-400 dark:bg-slate-900 dark:border-slate-700 transition-colors duration-500">
              <CardHeader className="bg-yellow-50 dark:bg-yellow-950/20 pb-6 transition-colors duration-500">
                <CardTitle className="text-2xl">🗂️ Todas las Etapas</CardTitle>
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
                            <div className="text-lg font-semibold truncate">{p.titulo || `Etapa ${p.etapa || i+1}`}</div>
                            <div className="text-sm text-slate-500">{p.tiempoEstimado ? `${p.tiempoEstimado} min` : ''}</div>
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-300 mb-3 truncate">{p.descripcion || ''}</div>
                          {Array.isArray(p.ingredientesUsados) && p.ingredientesUsados.length > 0 && (
                            <div className="mt-2">
                              <div className="text-sm text-slate-500 mb-1">Ingredientes:</div>
                              <ul className="list-disc list-inside text-sm">
                                {p.ingredientesUsados.map((ing, idx) => (
                                  <li key={idx} className="truncate">{ing.nombre || ing.nombre_ingrediente || ing.name} {ing.cantidad ? `— ${ing.cantidad}${ing.unidad ? ' ' + ing.unidad : ''}` : ''}</li>
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

          {/* Ingredientes Tab (sin columnas de costos) */}
          <TabsContent value="ingredientes" className="space-y-6">
            {recipe.ingredientes
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
                          <TableHead className="text-xl py-4">Cantidad</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoria.ingredientes.map((ing, ingIdx) => (
                          <TableRow key={ingIdx} className="text-lg dark:border-slate-700">
                            <TableCell className="text-xl py-5">{ing.nombre}</TableCell>
                            <TableCell className="text-xl py-5">
                              <Badge variant="outline" className="text-lg px-4 py-2">
                                {formatUnit(ing.cantidad ?? ing.cantidad_ingrediente ?? ing.amount, ing.unidad ?? ing.unidad_name ?? ing.unit)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700 transition-colors duration-500">
                          <TableCell colSpan={3} className="text-xl py-5">
                            Subtotal {categoria.categoria}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          {/* Técnicas Tab con estructura combinada (nombre + descripción) */}
          <TabsContent value="tecnicas" className="space-y-6">
            {Array.isArray(recipe.tecnicas) && recipe.tecnicas.length > 0 ? (
              recipe.tecnicas.map((t, idx) => (
                <Card 
                  key={idx} 
                  className="border-l-8 border-l-blue-500 dark:bg-slate-900 dark:border-slate-700 transition-colors duration-500"
                >
                  <CardHeader className="bg-blue-50 dark:bg-blue-950/25 pb-6 transition-colors duration-500">
                    <CardTitle className="text-3xl flex items-center gap-4">
                      <Badge className="text-2xl px-5 py-2">Técnica {idx+1}</Badge>
                      <span>{t.nombre}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 pb-6 space-y-6">
                    <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 transition-colors duration-500">
                      <p className="text-xl leading-relaxed whitespace-pre-wrap">
                        {t.descripcion}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card 
                className="border-l-8 border-l-blue-500 dark:bg-slate-900 dark:border-slate-700 transition-colors duration-500"
              >
                <CardHeader className="bg-blue-50 dark:bg-blue-950/25 pb-6 transition-colors duration-500">
                  <CardTitle className="text-3xl">No hay técnicas registradas</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 pb-6 text-xl text-slate-600 dark:text-slate-300">
                  Esta receta aún no tiene técnicas agregadas.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Montaje Tab */}
          <TabsContent value="montaje" className="space-y-6">
            <Card 
              className="border-l-8 border-l-green-500 dark:bg-slate-900 dark:border-slate-700 transition-colors duration-500"
            >
              <CardHeader className="bg-green-50 dark:bg-green-950/30 pb-6 transition-colors duration-500">
                <CardTitle className="text-3xl">🍽️ Instrucciones de Montaje</CardTitle>
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
