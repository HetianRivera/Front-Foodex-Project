import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

export function EditRecipeModal({ recipe, isOpen, onClose, onSave }) {
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

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'tiempo' || name === 'porcion' || name === 'aporte' 
        ? Number(value) || 0
        : value
    }));
    // Limpiar error
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (!formData.codigo.trim()) newErrors.codigo = 'El código es obligatorio';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor completa todos los campos requeridos');
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
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Editar Receta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre y Código */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre de la Receta</label>
              <Input
                name="nombre"
                type="text"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej: Filete a la Pimienta"
                className={`text-base ${errors.nombre ? 'border-red-500' : ''}`}
              />
              {errors.nombre && <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Código</label>
              <Input
                name="codigo"
                type="text"
                value={formData.codigo}
                onChange={handleChange}
                placeholder="Ej: REC-001"
                className={`text-base ${errors.codigo ? 'border-red-500' : ''}`}
              />
              {errors.codigo && <p className="text-red-500 text-sm mt-1">{errors.codigo}</p>}
            </div>
          </div>

          {/* Categoría y Rendimiento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Categoría</label>
              <Input
                name="categoria"
                type="text"
                value={formData.categoria}
                onChange={handleChange}
                placeholder="Ej: Plato Principal"
                className="text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Rendimiento</label>
              <Input
                name="rendimiento"
                type="text"
                value={formData.rendimiento}
                onChange={handleChange}
                placeholder="Ej: 4 porciones"
                className="text-base"
              />
            </div>
          </div>

          {/* Tiempo, Porciones y Calorías */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tiempo (minutos)</label>
              <Input
                name="tiempo"
                type="number"
                value={formData.tiempo}
                onChange={handleChange}
                className="text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Porciones</label>
              <Input
                name="porcion"
                type="number"
                value={formData.porcion}
                onChange={handleChange}
                className="text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Calorías</label>
              <Input
                name="aporte"
                type="number"
                value={formData.aporte}
                onChange={handleChange}
                className="text-base"
              />
            </div>
          </div>

          {/* Tarea de Inicio */}
          <div>
            <label className="block text-sm font-medium mb-2">Tarea de Inicio (M.e.P.)</label>
            <Textarea
              name="tareaInicio"
              value={formData.tareaInicio}
              onChange={handleChange}
              placeholder="Describe la tarea inicial..."
              rows={3}
              className="text-base"
            />
          </div>

          {/* Montaje */}
          <div>
            <label className="block text-sm font-medium mb-2">Instrucciones de Montaje</label>
            <Textarea
              name="montaje"
              value={formData.montaje}
              onChange={handleChange}
              placeholder="Describe cómo presentar el plato..."
              rows={4}
              className="text-base"
            />
          </div>

          {/* Argumentación Comercial */}
          <div>
            <label className="block text-sm font-medium mb-2">Argumentación Comercial</label>
            <Textarea
              name="argumentacionComercial"
              value={formData.argumentacionComercial}
              onChange={handleChange}
              placeholder="Describe los beneficios del plato..."
              rows={3}
              className="text-base"
            />
          </div>

          {/* Botones */}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="text-lg px-6 py-3"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="text-lg px-6 py-3"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}