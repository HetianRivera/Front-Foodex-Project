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
  DollarSign,
  Package
} from 'lucide-react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardFooter } from './DashboardFooter';

export function RecipeView({ recipeId, user, onBack, onLogout, recipes }) {
  const recipe = recipes.find(r => r.id === recipeId);

  if (!recipe) {
    return <div>Receta no encontrada</div>;
  }

  const formatUnit = (cantidad, unidad) => {
    if (unidad === 'kg') {
      return `${cantidad.toFixed(3)} kg`;
    } else if (unidad === 'gr') {
      if (cantidad >= 1000) {
        return `${(cantidad / 1000).toFixed(2)} kg (${cantidad} gr)`;
      }
      return `${cantidad} gr`;
    } else if (unidad === 'lt') {
      return `${cantidad.toFixed(3)} lt`;
    } else if (unidad === 'ml') {
      if (cantidad >= 1000) {
        return `${(cantidad / 1000).toFixed(2)} lt (${cantidad} ml)`;
      }
      return `${cantidad} ml`;
    } else if (unidad === 'u') {
      return `${cantidad} unidad${cantidad > 1 ? 'es' : ''}`;
    }
    return `${cantidad} ${unidad}`;
  };

  const calcularCostoTotal = () => {
    return recipe.ingredientes.reduce((total, categoria) => {
      return total + categoria.ingredientes.reduce((subtotal, ing) => subtotal + ing.precioTotal, 0);
    }, 0);
  };

  const costoMateriaPrima = calcularCostoTotal();
  const costoMakeup = costoMateriaPrima * (recipe.makeup / 100);
  const costoNeto = costoMateriaPrima + costoMakeup;
  const precioVentaNeta = costoNeto * recipe.factorMultiplicacion;
  const ivaValor = precioVentaNeta * (recipe.iva / 100);
  const precioVentaFinal = precioVentaNeta + ivaValor;

  return (
    <div className="min-h-screen bg-slate-50">
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
          <TabsList className="grid w-full grid-cols-5 h-auto gap-2 bg-slate-200 p-2">
            <TabsTrigger value="proceso" className="text-lg py-5 data-[state=active]:bg-white">
              <ChefHat className="w-6 h-6 mr-2" />
              Proceso
            </TabsTrigger>
            <TabsTrigger value="ingredientes" className="text-lg py-5 data-[state=active]:bg-white">
              <Package className="w-6 h-6 mr-2" />
              Ingredientes
            </TabsTrigger>
            <TabsTrigger value="tecnicas" className="text-lg py-5 data-[state=active]:bg-white">
              <AlertTriangle className="w-6 h-6 mr-2" />
              Técnicas
            </TabsTrigger>
            <TabsTrigger value="montaje" className="text-lg py-5 data-[state=active]:bg-white">
              <Utensils className="w-6 h-6 mr-2" />
              Montaje
            </TabsTrigger>
            <TabsTrigger value="costos" className="text-lg py-5 data-[state=active]:bg-white">
              <DollarSign className="w-6 h-6 mr-2" />
              Costos
            </TabsTrigger>
          </TabsList>

          {/* Proceso Tab - OPTIMIZADO PARA TABLET */}
          <TabsContent value="proceso" className="space-y-6">
            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200 border-2">
              <CardContent className="pt-8 pb-8">
                <div className="grid grid-cols-4 gap-6 text-center">
                  <div>
                    <p className="text-base text-slate-600 mb-2">Tiempo Total</p>
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="w-7 h-7 text-blue-600" />
                      <p className="text-3xl">{recipe.tiempo} min</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-base text-slate-600 mb-2">Porciones</p>
                    <p className="text-3xl">{recipe.porcion}</p>
                  </div>
                  <div>
                    <p className="text-base text-slate-600 mb-2">Rendimiento</p>
                    <p className="text-3xl">{recipe.rendimiento}</p>
                  </div>
                  <div>
                    <p className="text-base text-slate-600 mb-2">Calorías</p>
                    <p className="text-3xl">{recipe.aporte}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tarea de Inicio */}
            <Card className="border-l-8 border-l-green-500">
              <CardHeader className="bg-green-50 pb-6">
                <CardTitle className="text-2xl">📋 Tarea de Inicio (M.e.P.)</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 pb-6">
                <p className="text-xl leading-relaxed">{recipe.tareaInicio}</p>
              </CardContent>
            </Card>

            {/* Procesos - TEXTO OPTIMIZADO PARA TABLET */}
            {recipe.procesos.map((proceso, idx) => (
              <Card key={idx} className="border-l-8 border-l-primary shadow-lg">
                <CardHeader className="bg-slate-100 pb-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-3xl flex items-center gap-4">
                      <Badge className="text-2xl px-5 py-2">
                        ETAPA {proceso.etapa}
                      </Badge>
                      <span>{proceso.titulo}</span>
                    </CardTitle>
                    <div className="flex items-center gap-3 text-slate-600 flex-shrink-0">
                      <Clock className="w-7 h-7" />
                      <span className="text-2xl">{proceso.tiempoEstimado} min</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-8 pb-8 space-y-6">
                  {/* Descripción - TEXTO VISIBLE EN TABLET */}
                  <div className="bg-white p-6 rounded-xl border-2 border-slate-200">
                    <p className="text-xl leading-relaxed text-slate-900">
                      {proceso.descripcion}
                    </p>
                  </div>

                  {/* Ingredientes Usados - FORMATO CLARO TABLET */}
                  <div className="bg-amber-50 p-6 rounded-xl border-2 border-amber-200">
                    <h4 className="text-xl mb-4 flex items-center gap-3">
                      <Package className="w-7 h-7 text-amber-700" />
                      <span>Ingredientes para esta etapa:</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {proceso.ingredientesUsados.map((ing, ingIdx) => (
                        <div key={ingIdx} className="bg-white p-5 rounded-lg border-2 border-amber-300">
                          <p className="text-lg leading-relaxed">
                            <span className="block mb-1">{ing.nombre}</span>
                            <span className="text-2xl text-primary block">
                              {formatUnit(ing.cantidad, ing.unidad)}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Ingredientes Tab */}
          <TabsContent value="ingredientes" className="space-y-6">
            {recipe.ingredientes.map((categoria, idx) => (
              <Card key={idx}>
                <CardHeader className="bg-slate-100 pb-6">
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <Badge variant="secondary" className="text-xl px-5 py-2">
                      {categoria.categoria}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xl py-4">Ingrediente</TableHead>
                        <TableHead className="text-xl py-4">Cantidad</TableHead>
                        <TableHead className="text-right text-xl py-4">Precio Unit.</TableHead>
                        <TableHead className="text-right text-xl py-4">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoria.ingredientes.map((ing, ingIdx) => (
                        <TableRow key={ingIdx} className="text-lg">
                          <TableCell className="text-xl py-5">{ing.nombre}</TableCell>
                          <TableCell className="text-xl py-5">
                            <Badge variant="outline" className="text-lg px-4 py-2">
                              {formatUnit(ing.cantidad, ing.unidad)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xl py-5">
                            ${ing.precioUnitario.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-xl py-5">
                            ${ing.precioTotal.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50">
                        <TableCell colSpan={3} className="text-xl py-5">
                          Subtotal {categoria.categoria}
                        </TableCell>
                        <TableCell className="text-right text-2xl py-5">
                          ${categoria.ingredientes.reduce((sum, ing) => sum + ing.precioTotal, 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Técnicas y Puntos Críticos */}
          <TabsContent value="tecnicas" className="space-y-6">
            <Card className="border-l-8 border-l-blue-500">
              <CardHeader className="bg-blue-50 pb-6">
                <CardTitle className="text-3xl">🎯 Técnicas de Base</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 pb-6">
                <div className="grid grid-cols-2 gap-5">
                  {recipe.tecnicasBase.map((tecnica, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-xl border-2 border-blue-200">
                      <div className="flex items-start gap-4">
                        <div className="bg-blue-100 p-3 rounded-full mt-1 flex-shrink-0">
                          <ChefHat className="w-7 h-7 text-blue-600" />
                        </div>
                        <p className="text-xl leading-relaxed">{tecnica}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-8 border-l-red-500">
              <CardHeader className="bg-red-50 pb-6">
                <CardTitle className="text-3xl flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                  Puntos Críticos de Control
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 pb-6">
                <div className="space-y-4">
                  {recipe.puntosCriticos.map((punto, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-xl border-2 border-red-200">
                      <div className="flex items-start gap-4">
                        <div className="bg-red-100 p-3 rounded-full mt-1 flex-shrink-0">
                          <AlertTriangle className="w-7 h-7 text-red-600" />
                        </div>
                        <p className="text-xl leading-relaxed">{punto}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-8 border-l-purple-500">
              <CardHeader className="bg-purple-50 pb-6">
                <CardTitle className="text-3xl flex items-center gap-3">
                  <Utensils className="w-8 h-8 text-purple-600" />
                  Utensilios Necesarios
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 pb-6">
                <div className="grid grid-cols-3 gap-4">
                  {recipe.utensilios.map((utensilio, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-xl border-2 border-purple-200 text-center">
                      <p className="text-lg leading-relaxed">{utensilio}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Montaje Tab */}
          <TabsContent value="montaje" className="space-y-6">
            <Card className="border-l-8 border-l-green-500">
              <CardHeader className="bg-green-50 pb-6">
                <CardTitle className="text-3xl">🍽️ Instrucciones de Montaje</CardTitle>
              </CardHeader>
              <CardContent className="pt-8 pb-8">
                <div className="bg-white p-8 rounded-xl border-2 border-green-200">
                  <p className="text-2xl leading-relaxed text-slate-900">
                    {recipe.montaje}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Argumentaciones */}
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader className="bg-slate-100 pb-6">
                  <CardTitle className="text-2xl">Argumentación Comercial</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 pb-6">
                  <p className="text-xl leading-relaxed">{recipe.argumentacionComercial}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="bg-slate-100 pb-6">
                  <CardTitle className="text-2xl">Argumentación Técnica</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 pb-6">
                  <p className="text-xl leading-relaxed">{recipe.argumentacionTecnica}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Costos Tab */}
          <TabsContent value="costos" className="space-y-6">
            <Card>
              <CardHeader className="pb-6">
                <CardTitle className="text-3xl">Cálculo de Costos</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="space-y-5">
                  <div className="flex justify-between items-center py-4 border-b-2 text-xl">
                    <span>Costo de Materia Prima</span>
                    <span className="text-2xl">${costoMateriaPrima.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-4 border-b-2 text-xl">
                    <span>Make Up ({recipe.makeup}%)</span>
                    <span className="text-2xl">${costoMakeup.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-4 border-b-2 text-xl">
                    <span>Costo Neto / Subtotal</span>
                    <span className="text-2xl">${costoNeto.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-4 border-b-2 text-xl">
                    <span>Factor de Multiplicación (x{recipe.factorMultiplicacion})</span>
                    <span className="text-2xl">${precioVentaNeta.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-4 border-b-2 text-xl">
                    <span>I.V.A. ({recipe.iva}%)</span>
                    <span className="text-2xl">${ivaValor.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-6 bg-primary/10 px-8 rounded-xl mt-6">
                    <span className="text-2xl">Precio de Venta Final</span>
                    <span className="text-4xl text-primary">${precioVentaFinal.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center py-5 bg-slate-100 px-8 rounded-xl">
                    <span className="text-xl">Precio Venta por Porción</span>
                    <span className="text-3xl">${(precioVentaFinal / recipe.porcion).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-6">
                <CardTitle className="text-3xl">Resumen por Categoría</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xl py-4">Categoría</TableHead>
                      <TableHead className="text-right text-xl py-4">Total</TableHead>
                      <TableHead className="text-right text-xl py-4">% del Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipe.ingredientes.map((categoria, idx) => {
                      const totalCategoria = categoria.ingredientes.reduce((sum, ing) => sum + ing.precioTotal, 0);
                      const porcentaje = (totalCategoria / costoMateriaPrima) * 100;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="text-xl py-5">{categoria.categoria}</TableCell>
                          <TableCell className="text-right text-xl py-5">${totalCategoria.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xl py-5">{porcentaje.toFixed(1)}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <DashboardFooter />
    </div>
  );
}
