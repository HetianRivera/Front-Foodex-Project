import { useState } from 'react';
import { validateRecipePayload } from '../utils/validators';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['Cárnicos', 'Verduras', 'Ovolácteos', 'Abarrotes', 'Licores'];
const UNIDADES = ['gr', 'kg', 'ml', 'lt', 'u'];
const STAGES = ['A', 'B', 'C', 'D', 'E'];
const MAX_STAGE_TIME = 9999;

export function EditRecipeModal({ recipe, isOpen, onClose, onSave }) {
  // Estado general
  const [formData, setFormData] = useState({
    nombre: recipe?.nombre || recipe?.nombre_receta || '',
    codigo: recipe?.codigo || recipe?.codigo_receta || '',
    categoria: recipe?.categoria || '',
    tiempo: recipe?.tiempo || 0,
    porcion: recipe?.porcion || 1,
    rendimiento: recipe?.rendimiento || '',
    aporte: recipe?.aporte || 0,
    tareaInicio: recipe?.tareaInicio || '',
    montaje: recipe?.montaje || recipe?.detalle_montaje || '',
    argumentacionComercial: recipe?.argumentacionComercial || '',
  });

  // Ingredientes por categoría
  const [ingredientesCategorias, setIngredientesCategorias] = useState(() => {
    const existing = recipe?.ingredientes || [];
    return CATEGORIES.map(cat => ({
      categoria: cat,
      ingredientes: existing.find(x => x.categoria === cat)?.ingredientes || []
    }));
  });

  // Procesos/Etapas
  const [procesos, setProcesos] = useState(() => {
    const existing = recipe?.procesos || [];
    return STAGES.map(etapa => {
      const proceso = existing.find(p => p.etapa === etapa) || {};
      return {
        etapa,
        titulo: proceso.titulo || '',
        descripcion: proceso.descripcion || '',
        tiempoEstimado: proceso.tiempoEstimado || 0,
        ingredientesUsados: proceso.ingredientesUsados || []
      };
    });
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [openStageIndex, setOpenStageIndex] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'tiempo' || name === 'porcion' || name === 'aporte'
        ? parseInt(value || '0', 10) || 0
        : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const preventDecimalKey = (e) => {
    if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      toast.error('Solo se permiten números enteros');
    }
  };

  const preventDecimalPaste = (e) => {
    const text = e.clipboardData?.getData('Text') || '';
    if (/[.,eE]/.test(text) || !/^\s*\d+\s*$/.test(text)) {
      e.preventDefault();
      toast.error('Pega solo números enteros');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (!formData.codigo.trim()) newErrors.codigo = 'El código es obligatorio';
    // Ensure no etapa exceeds max allowed time
    const over = procesos.find(p => Number(p.tiempoEstimado) > MAX_STAGE_TIME);
    if (over) {
      newErrors.procesos = `La etapa ${over.etapa || '?'} tiene un tiempo mayor a ${MAX_STAGE_TIME} minutos`;
    }
    // global payload validation
    const valErrors = validateRecipePayload(formData || {});
    if (valErrors && valErrors.length) {
      setErrors(prev => ({ ...prev, validation: valErrors }));
      return false;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Funciones para ingredientes
  const addIngredient = (categoriaIndex) => {
    setIngredientesCategorias(prev =>
      prev.map((cat, i) =>
        i === categoriaIndex
          ? {
              ...cat,
              ingredientes: [...cat.ingredientes, { nombre: '', cantidad: 0, unidad: 'gr' }]
            }
          : cat
      )
    );
  };

  const updateIngredient = (categoriaIndex, ingredientIndex, key, value) => {
    setIngredientesCategorias(prev =>
      prev.map((cat, i) => {
        if (i !== categoriaIndex) return cat;
        return {
          ...cat,
          ingredientes: cat.ingredientes.map((ing, j) =>
            j === ingredientIndex ? { ...ing, [key]: value } : ing
          )
        };
      })
    );
  };

  const removeIngredient = (categoriaIndex, ingredientIndex) => {
    setIngredientesCategorias(prev =>
      prev.map((cat, i) =>
        i === categoriaIndex
          ? {
              ...cat,
              ingredientes: cat.ingredientes.filter((_, j) => j !== ingredientIndex)
            }
          : cat
      )
    );
  };

  // Funciones para procesos/etapas
  const updateProcesoField = (stageIndex, key, value) => {
    // If updating tiempoEstimado, enforce max limit
    if (key === 'tiempoEstimado') {
      let v = Number(value) || 0;
      if (v > MAX_STAGE_TIME) {
        toast.error(`El tiempo de etapa no puede ser mayor a ${MAX_STAGE_TIME} minutos`);
        v = MAX_STAGE_TIME;
        setErrors(prev => ({ ...prev, procesos: `Tiempo de etapa no puede superar ${MAX_STAGE_TIME} minutos` }));
      } else {
        setErrors(prev => ({ ...prev, procesos: '' }));
      }

      setProcesos(prev =>
        prev.map((p, i) => (i === stageIndex ? { ...p, tiempoEstimado: v } : p))
      );
      return;
    }

    setProcesos(prev =>
      prev.map((p, i) => (i === stageIndex ? { ...p, [key]: value } : p))
    );
  };

  const addIngredienteEtapa = (stageIndex) => {
    setProcesos(prev =>
      prev.map((p, i) =>
        i === stageIndex
          ? { ...p, ingredientesUsados: [...p.ingredientesUsados, { nombre: '', cantidad: 0, unidad: 'gr', tiempoCoccion: 0 }] }
          : p
      )
    );
  };

  const updateIngredienteEtapa = (stageIndex, ingredientIndex, key, value) => {
    setProcesos(prev =>
      prev.map((p, i) =>
        i === stageIndex
          ? {
              ...p,
              ingredientesUsados: p.ingredientesUsados.map((ing, j) =>
                j === ingredientIndex ? { ...ing, [key]: value } : ing
              )
            }
          : p
      )
    );
  };

  const removeIngredienteEtapa = (stageIndex, ingredientIndex) => {
    setProcesos(prev =>
      prev.map((p, i) =>
        i === stageIndex
          ? {
              ...p,
              ingredientesUsados: p.ingredientesUsados.filter((_, j) => j !== ingredientIndex)
            }
          : p
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor completa todos los campos requeridos o corrige los límites');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        ...recipe,
        nombre: formData.nombre,
        nombre_receta: formData.nombre,
        codigo: formData.codigo,
        codigo_receta: formData.codigo,
        categoria: formData.categoria,
        tiempo: formData.tiempo,
        porcion: formData.porcion,
        rendimiento: formData.rendimiento,
        aporte: formData.aporte,
        tareaInicio: formData.tareaInicio,
        montaje: formData.montaje,
        detalle_montaje: formData.montaje,
        argumentacionComercial: formData.argumentacionComercial,
        ingredientes: ingredientesCategorias.map(cat => ({
          categoria: cat.categoria,
          ingredientes: cat.ingredientes.map(ing => ({
            nombre: ing.nombre,
            cantidad: Number(ing.cantidad) || 0,
            unidad: ing.unidad
          }))
        })),
        procesos: procesos.map(p => ({
          etapa: p.etapa,
          titulo: p.titulo,
          descripcion: p.descripcion,
          tiempoEstimado: Number(p.tiempoEstimado) || 0,
          ingredientesUsados: p.ingredientesUsados.map(i => ({
            nombre: i.nombre,
            cantidad: Number(i.cantidad) || 0,
            unidad: i.unidad,
            tiempoCoccion: Number(i.tiempoCoccion) || 0
          }))
        }))
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-3xl">Editar Receta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="ingredientes">Ingredientes</TabsTrigger>
              <TabsTrigger value="procesos">Etapas</TabsTrigger>
              <TabsTrigger value="adicional">Adicional</TabsTrigger>
            </TabsList>

            {/* TAB: General */}
            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre *</label>
                  <Input
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Ej: Filete a la Pimienta"
                    className={`text-base dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400 dark:focus:ring-slate-600 dark:focus:border-slate-600 ${errors.nombre ? 'border-red-500' : ''}`}
                  />
                  {errors.nombre && <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Código *</label>
                  <Input
                    name="codigo"
                    value={formData.codigo}
                    onChange={handleChange}
                    placeholder="Ej: REC-001"
                    className={`text-base dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400 dark:focus:ring-slate-600 dark:focus:border-slate-600 ${errors.codigo ? 'border-red-500' : ''}`}
                  />
                  {errors.codigo && <p className="text-red-500 text-sm mt-1">{errors.codigo}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Categoría</label>
                  <Input
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                    placeholder="Ej: Plato Principal"
                    className="text-base dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400 dark:focus:ring-slate-600 dark:focus:border-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Rendimiento</label>
                  <Input
                    name="rendimiento"
                    value={formData.rendimiento}
                    onChange={handleChange}
                    placeholder="Ej: 4 porciones"
                    className="text-base dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400 dark:focus:ring-slate-600 dark:focus:border-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tiempo (min)</label>
                  <Input
                    name="tiempo"
                    type="number"
                    step={1}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formData.tiempo}
                    onChange={handleChange}
                    onKeyDown={preventDecimalKey}
                    onPaste={preventDecimalPaste}
                    placeholder="0"
                    className="text-base dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400 dark:focus:ring-slate-600 dark:focus:border-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Porciones</label>
                  <Input
                    name="porcion"
                    type="number"
                    step={1}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formData.porcion}
                    onChange={handleChange}
                    onKeyDown={preventDecimalKey}
                    onPaste={preventDecimalPaste}
                    placeholder="1"
                    className="text-base dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400 dark:focus:ring-slate-600 dark:focus:border-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tarea de Inicio</label>
                <Textarea
                  name="tareaInicio"
                  value={formData.tareaInicio}
                  onChange={handleChange}
                  placeholder="Describe la tarea inicial..."
                  rows={3}
                  className="text-base dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400 dark:focus:ring-slate-600 dark:focus:border-slate-600"
                />
              </div>
            </TabsContent>

            {/* TAB: Ingredientes */}
            <TabsContent value="ingredientes" className="space-y-4">
              {ingredientesCategorias.map((cat, ci) => (
                <div key={ci} className="space-y-3 border rounded p-4">
                    <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold">{cat.categoria}</h4>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => addIngredient(ci)}
                      className="flex items-center gap-1 dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 transition-colors duration-300 ease-in-out"
                    >
                      <Plus className="w-4 h-4" /> Agregar
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {cat.ingredientes.map((ing, ii) => (
                      <div key={ii} className="grid grid-cols-5 gap-2 items-end bg-slate-50 p-3 rounded dark:bg-slate-900 dark:border-slate-800">
                        <div className="col-span-2">
                          <label className="block text-xs font-medium mb-1">Nombre</label>
                          <Input
                            value={ing.nombre}
                            onChange={e => updateIngredient(ci, ii, 'nombre', e.target.value)}
                            placeholder="Ingrediente"
                            className="text-sm dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400 dark:focus:ring-slate-600 dark:focus:border-slate-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Cantidad</label>
                          <Input
                            type="number"
                            step={1}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min={0}
                            value={ing.cantidad}
                            onChange={e => updateIngredient(ci, ii, 'cantidad', parseInt(e.target.value || '0', 10))}
                            onKeyDown={preventDecimalKey}
                            onPaste={preventDecimalPaste}
                            className="text-sm dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400 dark:focus:ring-slate-600 dark:focus:border-slate-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Unidad</label>
                          <select
                            value={ing.unidad}
                            onChange={e => updateIngredient(ci, ii, 'unidad', e.target.value)}
                            className="w-full border rounded px-2 py-1 text-sm dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400 dark:focus:ring-slate-600 dark:focus:border-slate-600"
                          >
                            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        {/* Tiempo de cocción ahora se edita en Etapas (ingredientes usados) */}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeIngredient(ci, ii)}
                          className="w-full dark:hover:bg-red-700 transition-colors duration-300 ease-in-out"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {cat.ingredientes.length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Sin ingredientes</p>
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* TAB: Etapas/Procesos */}
            <TabsContent value="procesos" className="space-y-4">
              {procesos.map((p, pi) => (
                <div key={p.etapa} className="space-y-3 border rounded p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold">Etapa {p.etapa}</h4>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setOpenStageIndex(openStageIndex === pi ? -1 : pi)}
                    >
                      {openStageIndex === pi ? 'Contraer' : 'Expandir'}
                    </Button>
                  </div>

                  {openStageIndex === pi && (
                    <div className="space-y-4 pt-3 border-t">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Título</label>
                          <Input
                            value={p.titulo}
                            onChange={e => updateProcesoField(pi, 'titulo', e.target.value)}
                            placeholder="Ej: Preparación"
                            className="text-base dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400 dark:focus:ring-slate-600 dark:focus:border-slate-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Tiempo (min)</label>
                          <Input
                            type="number"
                            step={1}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min={0}
                            max={MAX_STAGE_TIME}
                            value={p.tiempoEstimado}
                            onChange={e => updateProcesoField(pi, 'tiempoEstimado', parseInt(e.target.value || '0', 10))}
                            onKeyDown={preventDecimalKey}
                            onPaste={preventDecimalPaste}
                            className="text-base dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400 dark:focus:ring-slate-600 dark:focus:border-slate-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Descripción</label>
                        <Textarea
                          value={p.descripcion}
                          onChange={e => updateProcesoField(pi, 'descripcion', e.target.value)}
                          placeholder="Describe los pasos de esta etapa..."
                          rows={3}
                          className="text-base dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400 dark:focus:ring-slate-600 dark:focus:border-slate-600"
                        />
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-medium">Ingredientes usados</p>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => addIngredienteEtapa(pi)}
                            className="flex items-center gap-1 dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 transition-colors duration-300 ease-in-out"
                          >
                            <Plus className="w-4 h-4" /> Agregar
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {p.ingredientesUsados.map((ing, ii) => (
                            <div key={ii} className="grid grid-cols-6 gap-2 items-end bg-slate-50 p-3 rounded dark:bg-slate-900 dark:border-slate-800">
                              <div className="col-span-2">
                                <label className="block text-xs font-medium mb-1">Ingrediente</label>
                                <Input
                                  value={ing.nombre}
                                  onChange={e => updateIngredienteEtapa(pi, ii, 'nombre', e.target.value)}
                                  placeholder="Nombre"
                                  className="text-sm dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400 dark:focus:ring-slate-600 dark:focus:border-slate-600"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">Cantidad</label>
                                <Input
                                  type="number"
                                  step={1}
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  min={0}
                                  value={ing.cantidad}
                                  onChange={e => updateIngredienteEtapa(pi, ii, 'cantidad', parseInt(e.target.value || '0', 10))}
                                  onKeyDown={preventDecimalKey}
                                  onPaste={preventDecimalPaste}
                                  className="text-sm dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400 dark:focus:ring-slate-600 dark:focus:border-slate-600"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">Unidad</label>
                                <select
                                  value={ing.unidad}
                                  onChange={e => updateIngredienteEtapa(pi, ii, 'unidad', e.target.value)}
                                  className="w-full border rounded px-2 py-1 text-sm dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400 dark:focus:ring-slate-600 dark:focus:border-slate-600"
                                >
                                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">T. Cocción</label>
                                <Input
                                  type="number"
                                  step={1}
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  min={0}
                                  value={ing.tiempoCoccion || 0}
                                  onChange={e => updateIngredienteEtapa(pi, ii, 'tiempoCoccion', parseInt(e.target.value || '0', 10))}
                                  max={p.tiempoEstimado}
                                  step={1}
                                  inputMode="numeric"
                                  pattern="\\d*"
                                  onBlur={e => {
                                    const v = parseInt(e.target.value || '0', 10);
                                    const clamped = Math.min(v, p.tiempoEstimado || 0);
                                    if (v !== clamped) updateIngredienteEtapa(pi, ii, 'tiempoCoccion', clamped);
                                  }}
                                  onKeyDown={preventDecimalKey}
                                  onPaste={preventDecimalPaste}
                                  className="text-sm dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400 dark:focus:ring-slate-600 dark:focus:border-slate-600"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeIngredienteEtapa(pi, ii)}
                                className="w-full dark:hover:bg-red-700 transition-colors duration-300 ease-in-out"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          {p.ingredientesUsados.length === 0 && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Sin ingredientes</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>

            {/* TAB: Adicional */}
            <TabsContent value="adicional" className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Montaje</label>
                <Textarea
                  name="montaje"
                  value={formData.montaje}
                  onChange={handleChange}
                  placeholder="Describe cómo presentar el plato..."
                  rows={4}
                  className="text-base dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400 dark:focus:ring-slate-600 dark:focus:border-slate-600"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="text-base px-6 py-2"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="text-base px-6 py-2"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}