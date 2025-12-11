import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';

export function DeleteRecipeDialog({ recipe, isOpen, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Ejecutar el callback del padre
      if (typeof onConfirm === 'function') {
        await onConfirm();
      }
    } catch (err) {
      console.error('Error en DeleteRecipeDialog:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">¿Eliminar receta?</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-lg text-slate-600">
            ¿Estás seguro de que deseas eliminar{' '}
            <strong>"{recipe?.nombre || recipe?.nombre_receta}"</strong>?
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Esta acción no se puede deshacer.
          </p>
        </div>

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
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="text-lg px-6 py-3 bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? 'Eliminando...' : 'Sí, Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}