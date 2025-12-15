import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { BookOpen, Clock, Users } from 'lucide-react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardFooter } from './DashboardFooter';
import { EditRecipeModal } from './EditRecipeModal';
import { DeleteRecipeDialog } from './DeleteRecipeDialog';
import { toast } from 'sonner';
import { updateRecipe, deleteRecipe } from '../api/recipes';

export function Dashboard({ user, recipes, onLogout, onSelectRecipe, onStartNewRecipe, onRecipeUpdated, onRecipeDeleted }) {
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [deletingRecipe, setDeletingRecipe] = useState(null);
  const [updatedRecipes, setUpdatedRecipes] = useState(recipes);

  // Sincronizar quando las recetas del padre cambian
  React.useEffect(() => {
    // Deduplicar recetas por id_receta para evitar keys duplicadas
    const seen = new Set();
    const deduplicated = recipes.filter(r => {
      const id = r.id_receta || r.id;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    setUpdatedRecipes(deduplicated);
  }, [recipes]);

  // Validar si un ID es local (temporal, sin guardar a backend)
  const isLocalRecipeId = (recipeId) => {
    // IDs locales son timestamps (números > 1000000000000, ~13 dígitos)
    const numId = Number(recipeId);
    return Number.isFinite(numId) && numId > 1000000000000;
  };

  const handleEditClick = async (e, recipe) => {
    e.stopPropagation(); // No ejecutar onClick del Card
    
    const recipeId = recipe.id || recipe.id_receta;
    
    // Detectar si es un ID local (temporal, sin guardar a backend)
    if (isLocalRecipeId(recipeId)) {
      toast.error('Esta receta aún no ha sido guardada al servidor. Guárdala primero desde Nueva Receta.');
      return;
    }
    
    setEditingRecipe(recipe);
  };

  const handleDeleteClick = (e, recipe) => {
    e.stopPropagation(); // No ejecutar onClick del Card
    setDeletingRecipe(recipe);
  };

    const handleEditSave = async (updatedRecipe) => {
    try {
      // editingRecipe ya es la receta COMPLETA (recuperada con getRecipe)
      // así que tiene id_semestre, anio, id_usuario
      const payload = {
        // Campos obligatorios: vienen del original (recuperado con getRecipe)
        id_semestre: editingRecipe?.id_semestre,
        anio: editingRecipe?.anio,
        id_usuario: editingRecipe?.id_usuario,
        id_taller: editingRecipe?.id_taller,
        // Campos editables: vienen del formulario (updatedRecipe)
        nombre_receta: updatedRecipe.nombre || updatedRecipe.nombre_receta,
        codigo_receta: updatedRecipe.codigo || updatedRecipe.codigo_receta,
        detalle_montaje: updatedRecipe.montaje || updatedRecipe.detalle_montaje,
        estado: true,
        // Agregar campos adicionales si el backend los acepta
        ...(updatedRecipe.categoria && { categoria: updatedRecipe.categoria }),
        ...(updatedRecipe.tiempo && { tiempo: updatedRecipe.tiempo }),
        ...(updatedRecipe.porcion && { porcion: updatedRecipe.porcion }),
        ...(updatedRecipe.rendimiento && { rendimiento: updatedRecipe.rendimiento }),
        ...(updatedRecipe.aporte && { aporte: updatedRecipe.aporte }),
        ...(updatedRecipe.tareaInicio && { tareaInicio: updatedRecipe.tareaInicio }),
        ...(updatedRecipe.argumentacionComercial && { argumentacionComercial: updatedRecipe.argumentacionComercial }),
      };

      console.log('=== PAYLOAD ENVIADO ===');
      console.log('id_semestre:', payload.id_semestre);
      console.log('anio:', payload.anio);
      console.log('id_usuario:', payload.id_usuario);
      console.log('nombre_receta:', payload.nombre_receta);

      await updateRecipe(updatedRecipe.id || updatedRecipe.id_receta, payload);

      // Actualizar la lista local CON TODOS LOS CAMPOS
      const recipeId = updatedRecipe.id_receta || updatedRecipe.id;
      const newRecipes = updatedRecipes
        .map(r => {
          const rId = r.id_receta || r.id;
          // Si es la receta que editamos, actualizar
          if (rId === recipeId) {
            return {
              ...r,
              nombre: updatedRecipe.nombre,
              nombre_receta: updatedRecipe.nombre,
              codigo: updatedRecipe.codigo,
              codigo_receta: updatedRecipe.codigo,
              montaje: updatedRecipe.montaje,
              detalle_montaje: updatedRecipe.montaje,
              categoria: updatedRecipe.categoria,
              tiempo: updatedRecipe.tiempo,
              porcion: updatedRecipe.porcion,
              rendimiento: updatedRecipe.rendimiento,
              aporte: updatedRecipe.aporte,
              tareaInicio: updatedRecipe.tareaInicio,
              argumentacionComercial: updatedRecipe.argumentacionComercial,
            };
          }
          return r;
        })
        // Deduplicar por si acaso (evitar keys duplicadas)
        .filter((r, idx, arr) => {
          const rId = r.id_receta || r.id;
          return arr.findIndex(x => (x.id_receta || x.id) === rId) === idx;
        });
      
      setUpdatedRecipes(newRecipes);

      // Notificar al padre
      if (onRecipeUpdated) {
        onRecipeUpdated(updatedRecipe);
      }

      toast.success('Receta actualizada correctamente');
      setEditingRecipe(null);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al actualizar la receta');
    }
  };

    const handleDeleteConfirm = async () => {
    try {
      const recipeId = deletingRecipe.id || deletingRecipe.id_receta;
      console.log('Intentando eliminar receta con ID:', recipeId);
      
      // Detectar si es un ID local (temporal, sin guardar a backend)
      if (isLocalRecipeId(recipeId)) {
        toast.error('Esta receta aún no ha sido guardada al servidor. No se puede eliminar.');
        setDeletingRecipe(null);
        return;
      }
      
      await deleteRecipe(recipeId);

      // Actualizar la lista local
      const newRecipes = updatedRecipes.filter(r => 
        r.id !== deletingRecipe.id && r.id_receta !== deletingRecipe.id_receta
      );
      setUpdatedRecipes(newRecipes);

      // Notificar al padre
      if (onRecipeDeleted) {
        onRecipeDeleted(recipeId);
      }

      toast.success('Receta eliminada correctamente');
      setDeletingRecipe(null);
    } catch (err) {
      console.error('Error completo al eliminar:', err);
      console.error('Status:', err?.response?.status);
      console.error('Datos:', err?.response?.data);
      toast.error(err?.response?.data?.detail || 'Error al eliminar la receta');
    }
  };

  const displayRecipes = updatedRecipes || recipes || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-500 ease-in-out">
      <DashboardHeader user={user} onLogout={onLogout} />

      {/* Stats */}
      <div className="container mx-auto max-w-6xl p-8">
        <div className="grid grid-cols-3 gap-6 mb-10">
          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="flex items-center gap-5">
                <div className="bg-red-100 p-4 rounded-xl">
                  <BookOpen className="w-10 h-10 text-red-600" />
              </div>
                <div>
                  <p className="text-lg text-slate-600 mb-1 dark:text-slate-200 transition-colors duration-300 ease-in-out">Recetas del Semestre</p>
                  <p className="text-2xl">{recipes.length}/10</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="flex items-center gap-5">
                <div className="bg-blue-100 p-4 rounded-xl">
                  <Clock className="w-10 h-10 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg text-slate-600 mb-1 dark:text-slate-200 transition-colors duration-300 ease-in-out">Tiempo Promedio</p>
                  <p className="text-2xl">
                    {(displayRecipes.length === 0) ? 0 : Math.round(displayRecipes.reduce((sum, r) => sum + (r.tiempo || 0), 0) / displayRecipes.length)} min
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="flex items-center gap-5">
                <div className="bg-green-100 p-4 rounded-xl">
                  <Users className="w-10 h-10 text-green-600" />
                </div>
                <div>
                  <p className="text-lg text-slate-600 mb-1 dark:text-slate-200 transition-colors duration-300 ease-in-out">Rol Actual</p>
                  <p className="text-2xl"> {user.role === 'profesor' ? 'Profesor' : 'Alumno'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recipe List */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl text-slate-900 dark:text-slate-200 transition-colors duration-300 ease-in-out">Recetas del Taller</h2>
            {user.role === 'profesor' && (
              <Button size="lg" className="text-xl px-8 py-6 bg-red-600 hover:bg-red-700 text-white" onClick={onStartNewRecipe}>+ Nueva Receta</Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-8">
            {displayRecipes.map((recipe) => {
              // Usar id_receta como key principal (es el ID en backend)
              const recipeKey = recipe.id_receta || recipe.id;
              return (
              <Card 
                key={recipeKey}
                className="hover:shadow-xl transition-shadow border-2 relative"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <CardTitle 
                      className="text-2xl line-clamp-2 leading-tight cursor-pointer hover:text-primary"
                      onClick={() => onSelectRecipe(recipe.id || recipe.id_receta)}
                    >
                      {recipe.nombre || recipe.nombre_receta}
                    </CardTitle>
                    <Badge variant="outline" className="text-base px-3 py-1">
                      {recipe.codigo || recipe.codigo_receta}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className="text-lg text-slate-600 line-clamp-2 leading-relaxed">
                    {recipe.argumentacionComercial || 'Sin descripción'}
                  </p>
                  
                  <div className="flex items-center gap-6 text-base text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      <span className="text-lg dark:text-slate-200 transition-colors duration-300 ease-in-out">{recipe.tiempo} min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      <span className="text-lg dark:text-slate-200 transition-colors duration-300 ease-in-out">{recipe.porcion} porción</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-base px-3 py-1">
                      {recipe.categoria || 'Sin categoría'}
                    </Badge>
                  </div>

                  {/* Botones */}
                  <div className="flex gap-3 mt-4 pt-4 border-t">
                    <Button 
                      className="flex-1 text-lg py-5"
                      onClick={() => onSelectRecipe(recipe.id || recipe.id_receta)}
                    >
                      Ver Detalles
                    </Button>
                    
                    {user.role === 'profesor' && (
                      <>
                        <Button
                          variant="outline"
                          size="lg"
                          className="px-4 py-5 text-blue-600 border-blue-300 hover:bg-blue-50"
                          onClick={(e) => handleEditClick(e, recipe)}
                          title="Editar receta"
                        >
                          <Edit2 className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          className="px-4 py-5 text-red-600 border-red-300 hover:bg-red-50"
                          onClick={(e) => handleDeleteClick(e, recipe)}
                          title="Eliminar receta"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </div>
        </div>
      </div>

      {/* Modales */}
      {editingRecipe && (
        <EditRecipeModal
          recipe={editingRecipe}
          isOpen={!!editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onSave={handleEditSave}
        />
      )}

      {deletingRecipe && (
        <DeleteRecipeDialog
          recipe={deletingRecipe}
          isOpen={!!deletingRecipe}
          onClose={() => setDeletingRecipe(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}

      <DashboardFooter />
    </div>
  );
}