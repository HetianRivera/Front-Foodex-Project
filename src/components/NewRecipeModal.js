import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';

export function NewRecipeModal({ open, onOpenChange, onConfirm }) {
  const RELAX = String(process.env.REACT_APP_RELAX_RECIPE_VALIDATION || process.env.REACT_APP_OFFLINE || process.env.REACT_APP_USE_MOCK || 'true').toLowerCase() === 'true';
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [file, setFile] = useState(null);

  const reset = () => {
    setCodigo('');
    setNombre('');
    setCategoria('');
    setFile(null);
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!RELAX && (!nombre || !codigo)) return;

    let docUrl = null;
    let docName = null;
    if (file) {
      docUrl = URL.createObjectURL(file);
      docName = file.name;
    }

    const payload = {
      id: Date.now().toString(),
      codigo: codigo || `REC-${Date.now()}`,
      nombre: nombre || 'Sin nombre',
      categoria: categoria || 'Sin categoría',
      aporte: 0,
      porcion: 1,
      tiempo: 0,
      rendimiento: 1,
      argumentacionComercial: 'Nueva receta',
      tecnicasBase: [],
      utensilios: [],
      procesos: [],
      ingredientes: [],
      montaje: '',
      makeup: 0,
      factorMultiplicacion: 1,
      iva: 0,
      docUrl,
      docName,
    };

    onConfirm(payload);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Receta</DialogTitle>
          <DialogDescription>Agrega una receta rápida y adjunta un archivo Word (.doc o .docx) opcional.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleConfirm}>
          <div>
            <label className="block mb-1">Código</label>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>
          <div>
            <label className="block mb-1">Nombre</label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <label className="block mb-1">Categoría</label>
            <Input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Plato Principal, Postre..." />
          </div>
          <div>
            <label className="block mb-1">Archivo Word (opcional)</label>
            <Input type="file" accept=".doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1">Guardar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
