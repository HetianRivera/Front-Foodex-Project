import { useState } from 'react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardFooter } from './DashboardFooter';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from 'docx';
import { toast } from 'sonner';
import { api } from '../api/client';
import {
  createRecipe,
  createFullRecipe,
  getRecipe,
  listRecipes,
  updateRecipe,
  deleteRecipe,
  linkIngredienteTecnica,
  linkCategoriaIngrediente,
} from '../api/recipes';

const CATEGORIES = ['Cárnicos','Verduras','Ovolácteos','Abarrotes','Licores'];
const UNIDADES = ['gr','kg','ml','lt','u'];

export function NewRecipePage({ onCancel, onSave, user }) {
  const RELAX = String(process.env.REACT_APP_RELAX_RECIPE_VALIDATION || process.env.REACT_APP_OFFLINE || process.env.REACT_APP_USE_MOCK || 'true').toLowerCase() === 'true';
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [imagenFile, setImagenFile] = useState(null);
  const [porcion, setPorcion] = useState(1);
  const [gramajePorPorcion, setGramajePorPorcion] = useState(0);
  const [tiempo, setTiempo] = useState(0);
  const [tareaInicio, setTareaInicio] = useState('');
  // Técnicas de base y PCC removidos (no están en la API)
  // Se removió la UI de utensilios; no se mantiene estado
  const [montaje, setMontaje] = useState('');
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [savedIngredientes, setSavedIngredientes] = useState([]);
  const [tecnicas, setTecnicas] = useState([]);
  const [savedTecnicas, setSavedTecnicas] = useState([]);
  // Técnicas: nombre + descripción (simple). Se guardan individualmente.

    const [ingredientesCategorias, setIngredientesCategorias] = useState(
      CATEGORIES.map(c => ({ categoria: c, ingredientes: [] }))
    );
    const STAGES = ['A','B','C','D','E'];
    const [procesos, setProcesos] = useState(
      STAGES.map(etapa => ({ etapa, titulo: '', descripcion: '', tiempoEstimado: 0, ingredientesUsados: [] }))
    );
    // Control de UI: sólo una etapa abierta a la vez
    const [openStageIndex, setOpenStageIndex] = useState(0);

    // Helpers de validación y manejo de inputs usados en onChange/onBlur
    const validateField = (field, value) => {
      switch (field) {
        case 'codigo':
        case 'nombre':
        case 'categoria':
          return String(value || '').trim() ? '' : 'Este campo es obligatorio';
        case 'tiempo': {
          const n = Number(value);
          if (!Number.isFinite(n) || n < 0) return 'Debe ser un número >= 0';
          return '';
        }
        case 'tareaInicio':
        case 'montaje':
          return value !== undefined && value !== null && String(value).trim() === '' ? 'No deje solo espacios' : '';
        default:
          return '';
      }
    };

    const handleChange = (field, value, setter) => {
      setter(value);
      setTouched(prev => ({ ...prev, [field]: true }));
      const err = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: err }));
    };

    const handleBlur = (field, value) => {
      setTouched(prev => ({ ...prev, [field]: true }));
      const err = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: err }));
    };


    const addIngredient = (categoriaIndex) => {
      setIngredientesCategorias(prev => prev.map((cat,i)=> i===categoriaIndex ? {
        ...cat,
          ingredientes: [...cat.ingredientes,{ nombre:'', cantidad:0, unidad:'gr', tiempoCoccion: 0 }]
      } : cat));
    };
    const updateIngredient = (categoriaIndex, ingredientIndex, key, value) => {
      setIngredientesCategorias(prev => prev.map((cat,i)=> {
        if (i!==categoriaIndex) return cat;
        return { ...cat, ingredientes: cat.ingredientes.map((ing,j)=> j===ingredientIndex ? { ...ing, [key]: value } : ing) };
      }));
    };
    const removeIngredient = (categoriaIndex, ingredientIndex) => {
      setIngredientesCategorias(prev => prev.map((cat,i)=> i===categoriaIndex ? {
        ...cat,
        ingredientes: cat.ingredientes.filter((_,j)=> j!==ingredientIndex)
      } : cat));
    };
    const saveIngrediente = (categoriaIndex, ingredientIndex) => {
      const cat = ingredientesCategorias[categoriaIndex];
      const ing = cat?.ingredientes?.[ingredientIndex];
      if (!ing) return;
      const nombre = (ing.nombre || '').trim();
      if (!nombre) { toast.error('Ingresa un nombre de ingrediente'); return; }
      const toSave = { nombre, cantidad: Number(ing.cantidad) || 0, unidad: ing.unidad || 'gr', categoria: cat.categoria, tiempoCoccion: Number(ing.tiempoCoccion) || 0 };
      setSavedIngredientes(prev => {
        const idx = prev.findIndex(x => x.nombre === toSave.nombre);
        if (idx >= 0) { const copy = [...prev]; copy[idx] = { ...copy[idx], ...toSave }; return copy; }
        return [...prev, toSave];
      });
      // bloquear edición del ingrediente hasta que se pulse "Editar"
      setIngredientesCategorias(prev => prev.map((c,i)=> i===categoriaIndex ? {
        ...c,
        ingredientes: c.ingredientes.map((ingr,j)=> j===ingredientIndex ? { ...ingr, saved: true } : ingr)
      } : c));
      toast.success('Ingrediente guardado');
    };
    const toggleEditIngrediente = (categoriaIndex, ingredientIndex) => {
      setIngredientesCategorias(prev => prev.map((c,i)=> i===categoriaIndex ? {
        ...c,
        ingredientes: c.ingredientes.map((ingr,j)=> j===ingredientIndex ? { ...ingr, saved: false } : ingr)
      } : c));
    };

    const addIngredienteEtapa = (etapaIndex) => {
      setProcesos(prev => prev.map((p,i)=> i===etapaIndex ? { ...p, ingredientesUsados: [...p.ingredientesUsados,{ nombre:'', cantidad:0, unidad:'gr', saved:false }] } : p));
    };
    const updateIngredienteEtapa = (etapaIndex, ingredienteIndex, key, value) => {
      setProcesos(prev => prev.map((p,i)=> i===etapaIndex ? { ...p, ingredientesUsados: p.ingredientesUsados.map((ing,j)=> j===ingredienteIndex ? { ...ing, [key]: value } : ing) } : p));
    };
    const removeIngredienteEtapa = (etapaIndex, ingredienteIndex) => {
      setProcesos(prev => prev.map((p,i)=> i===etapaIndex ? { ...p, ingredientesUsados: p.ingredientesUsados.filter((_,j)=> j!==ingredienteIndex) } : p));
    };
    const saveIngredienteEtapa = (etapaIndex, ingredienteIndex) => {
      setProcesos(prev => prev.map((p,i)=> i===etapaIndex ? { ...p, ingredientesUsados: p.ingredientesUsados.map((ing,j)=> j===ingredienteIndex ? { ...ing, saved:true } : ing) } : p));
      toast.success('Ingrediente de etapa guardado');
    };
    const toggleEditIngredienteEtapa = (etapaIndex, ingredienteIndex) => {
      setProcesos(prev => prev.map((p,i)=> i===etapaIndex ? { ...p, ingredientesUsados: p.ingredientesUsados.map((ing,j)=> j===ingredienteIndex ? { ...ing, saved:false } : ing) } : p));
    };

    const adjustToGramaje = () => {
      const gramaje = Number(gramajePorPorcion);
      const porciones = Number(porcion);
      if (gramaje<=0 || porciones<=0) return;
      const flat = ingredientesCategorias.flatMap(c=>c.ingredientes);
      if (flat.length===0) return;
      const totalActual = flat.reduce((sum, ing)=>{
        let cant = Number(ing.cantidad)||0;
        if (ing.unidad==='kg') cant = cant*1000;
        return sum + cant;
      },0);
      const totalDeseado = gramaje * porciones;
      if (totalActual===0) return;
      const factor = totalDeseado / totalActual;
      setIngredientesCategorias(prev => prev.map(cat => ({
        ...cat,
        ingredientes: cat.ingredientes.map(ing => {
          let cant = Number(ing.cantidad)||0;
          let unidad = ing.unidad;
          if (unidad==='kg') cant = cant*1000;
          let nuevaCant = cant*factor;
          if (nuevaCant>=1000) { unidad='kg'; nuevaCant = nuevaCant/1000; } else { unidad='gr'; }
          return { ...ing, cantidad: +nuevaCant.toFixed(2), unidad };
        })
      })));
    };

    const addTecnica = () => {
      setTecnicas(prev => {
        if (prev.length >= 1) { toast.error('Solo se permite una técnica'); return prev; }
        return [...prev, { nombre: '', descripcion: '', saved: false }];
      });
    };
    const updateTecnica = (index, key, value) => { setTecnicas(prev => prev.map((t,i)=> i===index ? { ...t, [key]: value } : t)); };
    const removeTecnica = (index) => { setTecnicas(prev => prev.filter((_,i)=> i!==index)); };
    const saveTecnica = (index) => {
      setTecnicas(prev => prev.map((t,i)=> i===index ? { ...t, saved: true } : t));
      setSavedTecnicas(prev => {
        const t = tecnicas[index];
        if (!t?.nombre?.trim() || !t?.descripcion?.trim()) return prev;
        const existingIdx = prev.findIndex(x=>x.nombre.trim().toLowerCase()===t.nombre.trim().toLowerCase());
        const newEntry = { nombre: t.nombre.trim(), descripcion: t.descripcion.trim(), ingredientesVinculados: [] };
        if (existingIdx>=0) { const copy = [...prev]; copy[existingIdx] = { ...copy[existingIdx], ...newEntry }; return copy; }
        return [...prev, newEntry];
      });
      toast.success('Técnica guardada');
    };

    const handleSave = async () => {
      // Validación adicional: etapas A-E únicas
      const STAGE_SET = new Set(['A','B','C','D','E']);
      const phases = procesos.map(p=> String(p.etapa||'').trim().toUpperCase());
      const invalidPhases = phases.filter(ph => !STAGE_SET.has(ph));
      const dupPhases = phases.filter((ph, idx) => phases.indexOf(ph) !== idx);
      if (invalidPhases.length > 0) {
        toast.error(`Etapas inválidas: ${invalidPhases.join(', ')}. Deben ser letras A-E.`);
        return;
      }
      if (dupPhases.length > 0) {
        const uniqDup = Array.from(new Set(dupPhases));
        toast.error(`Etapas duplicadas: ${uniqDup.join(', ')}. Cada letra A-E debe ser única.`);
        return;
      }
      const allFields = ['codigo','nombre','categoria','tiempo','tareaInicio','montaje'];
      const newTouched = {}; allFields.forEach(field => newTouched[field] = true); setTouched(newTouched);

      let newErrors = {};
      if (!RELAX) {
        if (!codigo) newErrors.codigo = 'El código es obligatorio';
        if (!nombre) newErrors.nombre = 'El nombre es obligatorio';
        if (!categoria) newErrors.categoria = 'La categoría es obligatoria';
        if (!tiempo) newErrors.tiempo = 'El tiempo es obligatorio';
        if (!tareaInicio) newErrors.tareaInicio = 'La tarea de inicio es obligatoria';
        if (!ingredientesCategorias.some(cat => cat.ingredientes.length > 0)) newErrors.ingredientes = 'Debes agregar al menos un ingrediente';
        if (!procesos.some(p => p.titulo.trim() && p.descripcion.trim() && p.tiempoEstimado)) newErrors.procesos = 'Debes completar al menos una etapa con título, tiempo y descripción';
        // Validación UI: asegurar letras A-E únicas
        const phases2 = procesos.map(p=> String(p.etapa||'').trim().toUpperCase());
        const invalidPhases2 = phases2.filter(ph => !STAGE_SET.has(ph));
        const dupPhases2 = phases2.filter((ph, idx) => phases2.indexOf(ph) !== idx);
        if (invalidPhases2.length > 0) newErrors.procesos = 'Las etapas deben ser letras A-E';
        if (dupPhases2.length > 0) newErrors.procesos = 'No puedes repetir letras de etapa (A-E)';
        // Se elimina la validación de utensilios al quitar la UI
        if (!montaje.trim()) newErrors.montaje = 'Debes ingresar el montaje final';
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) { toast.error('No se ha podido guardar la receta. Faltan campos obligatorios'); return; }
      } else { setErrors({}); }

      const ingredientesFinal = ingredientesCategorias.map(cat => ({
        categoria: cat.categoria,
        ingredientes: cat.ingredientes.map(ing => ({ nombre: ing.nombre, cantidad: Number(ing.cantidad)||0, unidad: ing.unidad, tiempoCoccion: Number(ing.tiempoCoccion)||0 }))
      }));
      const receta = {
        id: Date.now().toString(),
        codigo: codigo || `REC-${Date.now()}`,
        nombre: nombre || 'Sin nombre',
        categoria: categoria || 'Sin categoría',
        aporte: 0,
        porcion: Number(porcion)||1,
        tiempo: Number(tiempo)||0,
        rendimiento: Number(porcion)||1,
        tareaInicio: tareaInicio||'',
        ingredientes: ingredientesFinal,
        procesos: procesos.map(p => ({
          etapa: String(p.etapa||'').trim().toUpperCase(),
          titulo: p.titulo,
          descripcion: p.descripcion,
          ingredientesUsados: p.ingredientesUsados.map(i=> ({ ...i, cantidad: Number(i.cantidad)||0 })),
          tiempoEstimado: Number(p.tiempoEstimado)||0
        })),
        tecnicas: savedTecnicas.filter(t=> t.nombre.trim()),
        // Campos removidos: tecnicasBase, puntosCriticos y utensilios
        montaje,
        gramajePorPorcion: Number(gramajePorPorcion)||0
      };
      try {
        const saved = await createFullRecipe(receta);
        const idCandidate = saved?.id ?? saved?.id_receta ?? saved?.pk ?? saved?.uuid ?? null;
        if (idCandidate != null) {
          toast.success(`Receta ${(saved?.nombre || saved?.nombre_receta || nombre || 'sin nombre')} guardada`);
          onSave(saved);
        } else {
          toast.success(`Receta ${(saved?.nombre || saved?.nombre_receta || nombre || 'sin nombre')} guardada`);
          onSave(saved);
        }
      } catch (err) {
        const status = err?.response?.status;
        const body = err?.response?.data;
        const msg = (body && typeof body === 'object') ? JSON.stringify(body) : (body || err?.message || 'Error desconocido');
        console.warn('Fallo al guardar en API, usando guardado local', status, msg);
        
        // Si se creó la receta en backend pero falló al crear relaciones,
        // usar el id_receta real del servidor en lugar del ID temporal
        const recetaParaGuardar = err._recipeBase 
          ? { ...receta, id_receta: err._recipeBase.id_receta || err._recipeBase.id }
          : receta;
        
        toast.error(`No se pudo guardar en el servidor (${status || 'sin código'}). ${msg}`);
        onSave(recetaParaGuardar);
      }
    };

    const exportWord = async () => {
      if (!nombre) return;
      const metaRows = [
        ['Código', codigo],
        ['Nombre', nombre],
        ['Categoría', categoria],
        ['Porciones', String(porcion)],
        ['Gramaje por porción (g)', String(gramajePorPorcion)],
        ['Tiempo (min)', String(tiempo)]
      ];
      const tableMeta = new Table({
        rows: metaRows.map(r => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r[0], bold: true })] })] }) ,
            new TableCell({ children: [new Paragraph(r[1] || '')] })
          ]
        }))
      });
      const ingredientesTables = ingredientesCategorias.map(cat => {
        const header = new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: cat.categoria, bold: true })] })] }) ,
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Cantidad', bold: true })] })] }) ,
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Unidad', bold: true })] })] })
          ]
        });
        const rows = cat.ingredientes.map(ing => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(ing.nombre)] }),
            new TableCell({ children: [new Paragraph(String(ing.cantidad))] }),
            new TableCell({ children: [new Paragraph(ing.unidad)] })
          ]
        }));
        return new Table({ rows: [header, ...rows] });
      });
      const tecnicasBlocks = [];
      if (savedTecnicas.length) {
        tecnicasBlocks.push(new Paragraph({ children: [new TextRun({ text: 'Técnicas', bold: true })] }));
        savedTecnicas.forEach((t, idx) => {
          tecnicasBlocks.push(new Paragraph({ children: [new TextRun({ text: `${idx+1}. ${t.nombre}`, bold: true })] }));
          tecnicasBlocks.push(new Paragraph(t.descripcion));
          tecnicasBlocks.push(new Paragraph(''));
        });
      }
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Ficha Técnica', bold: true, size: 32 })] }),
              new Paragraph(''),
              tableMeta,
              new Paragraph(''),
              new Paragraph({ children: [new TextRun({ text: 'Tarea de Inicio', bold: true })] }),
              new Paragraph(tareaInicio || ''),
              new Paragraph(''),
              new Paragraph({ children: [new TextRun({ text: 'Ingredientes', bold: true })] }),
              ...ingredientesTables,
              new Paragraph(''),
              new Paragraph({ children: [new TextRun({ text: 'Procesos', bold: true })] }),
              ...tecnicasBlocks
            ]
          }
        ]
      });
      const blob = await Packer.toBlob(doc);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${codigo || 'receta'}_${nombre || 'ficha'}.docx`;
      a.click();
    };

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-500 ease-in-out">
        <DashboardHeader user={user}>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Nueva Ficha Técnica</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>Cancelar</Button>
             <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleSave}>Guardar</Button>
              <Button variant="secondary" onClick={exportWord}>Exportar Word</Button>
            </div>
          </div>
        </DashboardHeader>
        <div className="max-w-7xl mx-auto space-y-6 p-6">
          {/* Sección: General */}
          <div className="space-y-6">
              <Card className="bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-slate-100">Datos Generales</CardTitle>
                  </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block mb-1">Código</label>
                    <Input value={codigo} onChange={e => handleChange('codigo', e.target.value, setCodigo)} onBlur={e => handleBlur('codigo', e.target.value)} 
                    className="bg-slate-50 text-slate-900 placeholder-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 transition-colors duration-300"/>
                    {touched.codigo && errors.codigo && (<span className="text-red-500 text-sm">{errors.codigo}</span>)}
                  </div>
                  <div>
                    <label className="block mb-1">Nombre</label>
                    <Input value={nombre} onChange={e => handleChange('nombre', e.target.value, setNombre)} onBlur={e => handleBlur('nombre', e.target.value)}
                    className="bg-slate-50 text-slate-900 placeholder-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 transition-colors duration-300"/>
                    {touched.nombre && errors.nombre && (<span className="text-red-500 text-sm">{errors.nombre}</span>)}
                  </div>
                  <div>
                    <label className="block mb-1">Categoría</label>
                    <Input value={categoria} onChange={e => handleChange('categoria', e.target.value, setCategoria)} onBlur={e => handleBlur('categoria', e.target.value)} 
                    className="bg-slate-50 text-slate-900 placeholder-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 transition-colors duration-300"/>
                    {touched.categoria && errors.categoria && (<span className="text-red-500 text-sm">{errors.categoria}</span>)}
                  </div>
                  <div>
                    <label className="block mb-1">Tiempo (min)</label>
                    <Input type="number" value={tiempo} min={0} onChange={e => handleChange('tiempo', e.target.value, setTiempo)} onBlur={e => handleBlur('tiempo', e.target.value)} 
                    className="bg-slate-50 text-slate-900 placeholder-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 transition-colors duration-300"/>
                    {touched.tiempo && errors.tiempo && (<span className="text-red-500 text-sm">{errors.tiempo}</span>)}
                  </div>
                  <div>
                    <label className="block mb-1">Porciones</label>
                    <Input type="number" value={porcion} min={1} onChange={e=>setPorcion(e.target.value)}
                    className="bg-slate-50 text-slate-900 placeholder-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 transition-colors duration-300"/>
                  </div>
                  <div>
                    <label className="block mb-1">Gramaje por porción (g)</label>
                    <Input type="number" value={gramajePorPorcion} min={0} onChange={e=>setGramajePorPorcion(e.target.value)} 
                    className="bg-slate-50 text-slate-900 placeholder-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 transition-colors duration-300"/>
                  </div>
                  <div className="col-span-3">
                    <label className="block mb-1">Tarea de Inicio (M.e.P.)</label>
                    <Textarea rows={3} value={tareaInicio} onChange={e => handleChange('tareaInicio', e.target.value, setTareaInicio)} onBlur={e => handleBlur('tareaInicio', e.target.value)}
                      className="bg-slate-50 text-slate-900 placeholder-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 transition-colors duration-300"/>
                    {touched.tareaInicio && errors.tareaInicio && (<span className="text-red-500 text-sm">{errors.tareaInicio}</span>)}
                  </div>
                  <div className="col-span-2">
                    <label className="block mb-2">Imagen del Plato (opcional)</label>
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-lg px-4 py-3 transition-colors duration-300">
                      <label className="bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-700 dark:text-slate-100 font-medium py-2 px-4 rounded border border-slate-200 dark:border-slate-600 cursor-pointer text-sm whitespace-nowrap transition-colors duration-300">
                        Seleccionar archivo
                        <input type="file" accept="image/*" onChange={e => setImagenFile(e.target.files?.[0] || null)} className="hidden"/>
                      </label>
                      <span className="text-sm text-slate-500 dark:text-slate-300 truncate">{imagenFile ? imagenFile.name : 'Ningún archivo seleccionado'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
          </div>

          {/* Sección: Ingredientes */}
          <div className="space-y-6">
              <Card className="bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Ingredientes por Categoría</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={adjustToGramaje}>Ajustar a Gramaje</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  {errors.ingredientes && (<span className="text-red-500 text-sm block mb-2">{errors.ingredientes}</span>)}
                  {ingredientesCategorias.map((cat, ci) => (
                    <div key={ci} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xl font-semibold">{cat.categoria}</h4>
                        <Button size="sm" variant="secondary" onClick={()=>addIngredient(ci)}>Agregar</Button>
                      </div>
                      <div className="space-y-3">
                        {cat.ingredientes.map((ing, ii) => (
                          <div key={ii} className="grid grid-cols-7 gap-2 items-end">
                            <div className="col-span-2">
                              <label className="block mb-1">Nombre</label>
                              <Input value={ing.nombre} onChange={e=>updateIngredient(ci,ii,'nombre',e.target.value)} disabled={!!ing.saved}
                              className="bg-slate-50 text-slate-900 placeholder-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 transition-colors duration-300" />
                            </div>
                            <div>
                              <label className="block mb-1">Cantidad</label>
                              <Input type="number" min={0} value={ing.cantidad} onChange={e=>updateIngredient(ci,ii,'cantidad',e.target.value)} disabled={!!ing.saved}
                              className="bg-slate-50 text-slate-900 placeholder-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 transition-colors duration-300" />
                            </div>
                            <div>
                              <label className="block mb-1">Unidad</label>
                              <select className="w-full border rounded px-2 py-2 bg-slate-50 text-slate-900 placeholder-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 transition-colors duration-300" value={ing.unidad} onChange={e=>updateIngredient(ci,ii,'unidad',e.target.value)} disabled={!!ing.saved}>
                                {UNIDADES.map(u=> <option key={u} value={u}>{u}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block mb-1">Tiempo cocción (min)</label>
                              <Input type="number" min={0} value={ing.tiempoCoccion || 0} onChange={e=>updateIngredient(ci,ii,'tiempoCoccion',e.target.value)} disabled={!!ing.saved}
                              className="bg-slate-50 text-slate-900 placeholder-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 transition-colors duration-300" />
                            </div>
                            <div className="flex gap-2 justify-end">
                              {!ing.saved ? (
                                <Button size="sm" onClick={()=>saveIngrediente(ci,ii)}>Guardar</Button>
                              ) : (
                                <Button variant="secondary" size="sm" onClick={()=>toggleEditIngrediente(ci,ii)}>Editar</Button>
                              )}
                              <Button variant="destructive" size="sm" onClick={()=>removeIngredient(ci,ii)}>Eliminar</Button>
                            </div>
                          </div>
                        ))}
                        {cat.ingredientes.length===0 && (<p className="text-sm text-slate-500">Sin ingredientes en esta categoría.</p>)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
          </div>

          {/* Sección: Proceso */}
          <div className="space-y-6">
              <Card className="bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300">
                <CardHeader><CardTitle>Etapas</CardTitle></CardHeader>
                <CardContent className="space-y-8">
                  {errors.procesos && (<span className="text-red-500 text-sm block mb-2">{errors.procesos}</span>)}
                  {procesos.map((p, pi)=>(
                    <div key={p.etapa} className="space-y-4 rounded border">
                      <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-t border-b border-slate-200 dark:border-slate-700 transition-colors duration-300">
                        <h4 className="text-lg font-semibold">Etapa {p.etapa}</h4>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setOpenStageIndex(openStageIndex === pi ? -1 : pi)}>
                            {openStageIndex === pi ? 'Ingresar' : 'Expandir'}
                          </Button>
                        </div>
                      </div>
                      {openStageIndex === pi && (
                      <div className="grid grid-cols-3 gap-4 p-4 pt-0">
                        <div className="col-span-1">
                          <label className="block mb-1">Título</label>
                          <Input value={p.titulo} onChange={e=>setProcesos(prev=> prev.map((x,i)=> i===pi? {...x,titulo:e.target.value}:x))}
                          className='bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300'/>
                        </div>
                        <div className="col-span-1">
                          <label className="block mb-1">Tiempo Estimado (min)</label>
                          <Input type="number" min={0} value={p.tiempoEstimado} onChange={e=>setProcesos(prev=> prev.map((x,i)=> i===pi? {...x,tiempoEstimado:e.target.value}:x))}
                          className='bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300'/>
                        </div>
                        <div className="col-span-3">
                          <label className="block mb-1">Descripción</label>
                          <Textarea rows={3} value={p.descripcion} onChange={e=>setProcesos(prev=> prev.map((x,i)=> i===pi? {...x,descripcion:e.target.value}:x))}
                            className='bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300'/>
                        </div>
                        <div className="col-span-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">Ingredientes usados</p>
                            <Button size="sm" variant="secondary" onClick={()=>addIngredienteEtapa(pi)}>Agregar</Button>
                          </div>
                          {p.ingredientesUsados.map((iu, ii)=>(
                            <div key={ii} className="grid grid-cols-6 gap-2 items-end">
                              <div className="col-span-2">
                                <label className="block mb-1">Ingrediente</label>
                                {savedIngredientes.length > 0 ? (
                                  <select className="w-full border rounded px-2 py-2 bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300" value={iu.nombre} onChange={e=>{
                                    const selected = savedIngredientes.find(ing=>ing.nombre===e.target.value);
                                    if(selected){
                                      updateIngredienteEtapa(pi,ii,'nombre',selected.nombre);
                                      updateIngredienteEtapa(pi,ii,'unidad',selected.unidad);
                                    }}} disabled={!!iu.saved}>
                                    <option value="" className="bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300">Seleccionar...</option>
                                    {savedIngredientes.map((ing,idx)=> <option key={idx} value={ing.nombre}>{ing.nombre} ({ing.categoria})</option>)}
                                  </select>
                                ) : (
                                  <Input value={iu.nombre} onChange={e=>updateIngredienteEtapa(pi,ii,'nombre',e.target.value)} placeholder="Primero guarda ingredientes" disabled={!!iu.saved} 
                                  className='bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300'/>
                                )}
                              </div>
                              <div>
                                <label className="block mb-1">Cantidad</label>
                                <Input type="number" min={0} value={iu.cantidad} onChange={e=>updateIngredienteEtapa(pi,ii,'cantidad',e.target.value)} disabled={!!iu.saved}
                                className='bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300'/>
                              </div>
                              <div>
                                <label className="block mb-1">Unidad</label>
                                <select className="w-full border rounded px-2 py-2 bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300" value={iu.unidad} onChange={e=>updateIngredienteEtapa(pi,ii,'unidad',e.target.value)} disabled={!!iu.saved}>
                                  {UNIDADES.map(u=> <option key={u} value={u}>{u}</option>)}
                                </select>
                              </div>
                              <div className="flex gap-2 justify-end">
                                {!iu.saved ? (
                                  <Button size="sm" onClick={()=>saveIngredienteEtapa(pi,ii)}>Guardar</Button>
                                ) : (
                                  <Button variant="secondary" size="sm" onClick={()=>toggleEditIngredienteEtapa(pi,ii)}>Editar</Button>
                                )}
                                <Button variant="destructive" size="sm" onClick={()=>removeIngredienteEtapa(pi,ii)}>Eliminar</Button>
                              </div>
                            </div>
                          ))}
                          {p.ingredientesUsados.length===0 && (<p className="text-sm text-slate-500">Sin ingredientes en esta etapa.</p>)}
                        </div>
                      </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
          </div>

          {/* Sección: Técnicas/PCC */}
          <div className="space-y-6">
              <Card className="bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300">
                <CardHeader className="flex items-center justify-between"><CardTitle>Tecnica Base</CardTitle>
                  {tecnicas.length === 0 && (
                    <Button size="sm" variant="secondary" onClick={addTecnica}>Agregar Técnica</Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {tecnicas.map((t, idx)=>(
                    <div key={idx} className="space-y-4 p-4 rounded border">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block mb-1">Nombre de la Técnica</label>
                          <Input value={t.nombre} onChange={e=>updateTecnica(idx,'nombre',e.target.value)}
                          className='bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300'/>
                        </div>
                        <div className="flex items-end justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={()=>saveTecnica(idx)} disabled={!t.nombre.trim() || !t.descripcion.trim() || t.saved}>Guardar</Button>
                          <Button variant="destructive" size="sm" onClick={()=>removeTecnica(idx)}>Eliminar</Button>
                        </div>
                        <div className="col-span-2">
                          <label className="block mb-1">Descripción</label>
                          <Textarea rows={4} value={t.descripcion} onChange={e=>updateTecnica(idx,'descripcion',e.target.value)}
                            className='bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300'/>
                          {t.saved && <p className="text-xs text-green-600 mt-1">Guardada</p>}
                          {/* Vinculación manual eliminada: ahora se vincula automáticamente a ingredientes usados */}
                        </div>
                      </div>
                    </div>
                  ))}
                  {tecnicas.length===0 && <p className="text-sm text-slate-500">No hay técnica agregada.</p>}
                </CardContent>
              </Card>
              {/* Sección de Utensilios Necesarios removida de la UI */}
          </div>

          {/* Sección: Montaje */}
          <div className="space-y-6">
              <Card className="bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300">
                <CardHeader><CardTitle>Montaje Final</CardTitle></CardHeader>
                <CardContent>
                  <Textarea rows={5} value={montaje} onChange={e => handleChange('montaje', e.target.value, setMontaje)} onBlur={e => handleBlur('montaje', e.target.value)} placeholder="Descripción del montaje final"
                    className='bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300'/>
                  {touched.montaje && errors.montaje && (<span className="text-red-500 text-sm block mt-2">{errors.montaje}</span>)}
                </CardContent>
              </Card>
          </div>
        </div>
        <DashboardFooter />
      </div>
    );
  }

  export async function crearReceta(payload) {
    // Unificar con el flujo oficial: usa createRecipe (respeta /api/v1/recetas/ y variantes)
    return await createRecipe(payload);
  }

  // Re-export convenient wrappers to expose all recipe endpoints from this module
  export const apiRecipes = {
    createRecipe,
    createFullRecipe,
    getRecipe,
    listRecipes,
    updateRecipe,
    deleteRecipe,
    linkIngredienteTecnica,
    linkCategoriaIngrediente,
  };
  