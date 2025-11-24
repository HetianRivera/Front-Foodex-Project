import { useState } from 'react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardFooter } from './DashboardFooter';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from 'docx';
import { ChefHat, Package, AlertTriangle, Utensils } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['Cárnicos','Verduras','Ovolácteos','Abarrotes','Licores','Otros'];
const UNIDADES = ['gr','kg','ml','lt','u'];

export function NewRecipePage({ onCancel, onSave, user, recipes }) {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [imagenFile, setImagenFile] = useState(null);
  const [porcion, setPorcion] = useState(1);
  const [gramajePorPorcion, setGramajePorPorcion] = useState(0);
  const [tiempo, setTiempo] = useState(0);
  const [tecnicasBaseInput, setTecnicasBaseInput] = useState('');
  const [puntosCriticosInput, setPuntosCriticosInput] = useState('');
  const [utensiliosInput, setUtensiliosInput] = useState('');
  const [montaje, setMontaje] = useState('');
  const [tareaInicio, setTareaInicio] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [savedIngredientes, setSavedIngredientes] = useState([]);
  const [errors, setErrors] = useState({});


  const [ingredientesCategorias, setIngredientesCategorias] = useState(
    CATEGORIES.map(c => ({ categoria: c, ingredientes: [] }))
  );
  const STAGES = ['A','B','C','D','E'];
  const [procesos, setProcesos] = useState(
    STAGES.map(etapa => ({ etapa, titulo: '', descripcion: '', tiempoEstimado: 0, ingredientesUsados: [] }))
  );

  const addIngredient = (categoriaIndex) => {
    setIngredientesCategorias(prev => prev.map((cat,i)=> i===categoriaIndex ? {
      ...cat,
      ingredientes: [...cat.ingredientes,{ nombre:'', cantidad:0, unidad:'gr'}]
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
  
  const saveIngredientes = () => {
    const flat = ingredientesCategorias.flatMap(c => c.ingredientes.map(ing => ({
      ...ing,
      categoria: c.categoria
    }))).filter(ing => ing.nombre.trim());
    setSavedIngredientes(flat);
    toast.success(`${flat.length} ingredientes guardados`);
  };

  const addIngredienteEtapa = (etapaIndex) => {
    setProcesos(prev => prev.map((p,i)=> i===etapaIndex ? {
      ...p,
      ingredientesUsados: [...p.ingredientesUsados,{ nombre:'', cantidad:0, unidad:'gr' }]
    } : p));
  };
  const updateIngredienteEtapa = (etapaIndex, ingredienteIndex, key, value) => {
    setProcesos(prev => prev.map((p,i)=> i===etapaIndex ? {
      ...p,
      ingredientesUsados: p.ingredientesUsados.map((ing,j)=> j===ingredienteIndex ? { ...ing, [key]: value } : ing)
    } : p));
  };
  const removeIngredienteEtapa = (etapaIndex, ingredienteIndex) => {
    setProcesos(prev => prev.map((p,i)=> i===etapaIndex ? {
      ...p,
      ingredientesUsados: p.ingredientesUsados.filter((_,j)=> j!==ingredienteIndex)
    } : p));
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

  const handleSave = () => {
    const newErrors = {};
    if (!codigo) newErrors.codigo = 'El código es obligatorio';
    if (!nombre) newErrors.nombre = 'El nombre es obligatorio';
    if (!categoria) newErrors.categoria = 'La categoría es obligatoria';
    if (!tiempo) newErrors.tiempo = 'El tiempo es obligatorio';
    if (!tareaInicio) newErrors.tareaInicio = 'La tarea de inicio es obligatoria';

    if (!ingredientesCategorias.some(cat => cat.ingredientes.length > 0)) {newErrors.ingredientes = 'Debes agregar al menos un ingrediente';}

    if (!procesos.some(p => p.titulo.trim() && p.descripcion.trim() && p.tiempoEstimado)) {newErrors.procesos = 'Debes completar al menos una etapa con título, tiempo y descripción';}

    if (!tecnicasBaseInput.trim()) {newErrors.tecnicasBaseInput = 'Debes ingresar al menos una técnica de base';}
    if (!puntosCriticosInput.trim()) {newErrors.puntosCriticosInput = 'Debes ingresar al menos un punto crítico de control';}
    if (!utensiliosInput.trim()) {newErrors.utensiliosInput = 'Debes ingresar al menos un utensilio necesario';}
    if (!montaje.trim()) {newErrors.montaje = 'Debes ingresar el montaje final';}

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const ingredientesFinal = ingredientesCategorias.map(cat => ({
      categoria: cat.categoria,
      ingredientes: cat.ingredientes.map(ing => {
        const cantidadNum = Number(ing.cantidad)||0;
        return { ...ing, cantidad: cantidadNum};
      })
    }));
    const receta = {
      id: Date.now().toString(),
      codigo,
      nombre,
      categoria: categoria || 'Sin categoría',
      aporte: 0,
      porcion: Number(porcion)||1,
      tiempo: Number(tiempo)||0,
      rendimiento: Number(porcion)||1,
      tareaInicio: tareaInicio||'',
      ingredientes: ingredientesFinal,
      procesos: procesos.map(p => ({
        etapa: p.etapa,
        titulo: p.titulo,
        descripcion: p.descripcion,
        ingredientesUsados: p.ingredientesUsados.map(i=> ({ ...i, cantidad: Number(i.cantidad)||0 })),
        tiempoEstimado: Number(p.tiempoEstimado)||0
      })),
      tecnicasBase: tecnicasBaseInput.split('\n').map(t=>t.trim()).filter(Boolean),
      puntosCriticos: puntosCriticosInput.split('\n').map(t=>t.trim()).filter(Boolean),
      utensilios: utensiliosInput.split('\n').map(t=>t.trim()).filter(Boolean),
      montaje,
      gramajePorPorcion: Number(gramajePorPorcion)||0
    };
    onSave(receta);
  };

  const exportWord = async () => {
    if (!nombre) return;
    const metaRows = [
      ['Código', codigo],
      ['Nombre', nombre],
      ['Categoría', categoria],
      ['Porciones', String(porcion)],
      ['Gramaje por porción (g)', String(gramajePorPorcion)],
      ['Tiempo (min)', String(tiempo)],
    ];
    const tableMeta = new Table({
      rows: metaRows.map(r => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r[0], bold: true })] })] }),
          new TableCell({ children: [new Paragraph(r[1] || '')] })
        ]
      }))
    });
    const ingredientesTables = ingredientesCategorias.map(cat => {
      const header = new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: cat.categoria, bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Cantidad', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Unidad', bold: true })] })] }),
        ]
      });
      const rows = cat.ingredientes.map(ing => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(ing.nombre)] }),
          new TableCell({ children: [new Paragraph(String(ing.cantidad))] }),
          new TableCell({ children: [new Paragraph(ing.unidad)] }),
        ]
      }));
      return new Table({ rows: [header, ...rows] });
    });
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
            ...procesos.map(p => new Paragraph(`${p.etapa} - ${p.titulo}: ${p.descripcion}`)),
            new Paragraph(''),
            new Paragraph({ children: [new TextRun({ text: 'Montaje', bold: true })] }),
            new Paragraph(montaje || ''),
            new Paragraph(''),
            new Paragraph({ children: [new TextRun({ text: 'Técnicas Base', bold: true })] }),
            ...tecnicasBaseInput.split('\n').filter(Boolean).map(t => new Paragraph('- ' + t)),
            new Paragraph(''),
            new Paragraph({ children: [new TextRun({ text: 'Puntos Críticos', bold: true })] }),
            ...puntosCriticosInput.split('\n').filter(Boolean).map(t => new Paragraph('- ' + t)),
            new Paragraph(''),
            new Paragraph({ children: [new TextRun({ text: 'Utensilios', bold: true })] }),
            ...utensiliosInput.split('\n').filter(Boolean).map(t => new Paragraph('- ' + t)),
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
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader user={user}>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Nueva Ficha Técnica</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
            <Button variant="secondary" onClick={exportWord}>Exportar Word</Button>
          </div>
        </div>
      </DashboardHeader>
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 h-auto gap-2 bg-slate-200 p-2">
            <TabsTrigger value="general" className="text-lg py-5 data-[state=active]:bg-white">
              <ChefHat className="w-6 h-6 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="ingredientes" className="text-lg py-5 data-[state=active]:bg-white">
              <Package className="w-6 h-6 mr-2" />
              Ingredientes
            </TabsTrigger>
            <TabsTrigger value="proceso" className="text-lg py-5 data-[state=active]:bg-white">
              <ChefHat className="w-6 h-6 mr-2" />
              Proceso
            </TabsTrigger>
            <TabsTrigger value="tecnicas" className="text-lg py-5 data-[state=active]:bg-white">
              <AlertTriangle className="w-6 h-6 mr-2" />
              Técnicas/PCC
            </TabsTrigger>
            <TabsTrigger value="montaje" className="text-lg py-5 data-[state=active]:bg-white">
              <Utensils className="w-6 h-6 mr-2"  />
              Montaje
            </TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Datos Generales</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block mb-1">Código</label>
                  <Input value={codigo} onChange={e=>setCodigo(e.target.value)} required />
                  {errors.codigo && <span className="text-red-500 text-sm">{errors.codigo}</span>}
                </div>
                <div>
                  <label className="block mb-1">Nombre</label>
                  <Input value={nombre} onChange={e=>setNombre(e.target.value)} required/>
                  {errors.nombre && <span className="text-red-500 text-sm">{errors.nombre}</span>}
                </div>
                <div>
                  <label className="block mb-1">Categoría</label>
                  <Input value={categoria} onChange={e=>setCategoria(e.target.value)} required/>
                  {errors.categoria && <span className="text-red-500 text-sm">{errors.categoria}</span>}
                </div>
                <div>
                  <label className="block mb-1">Tiempo (min)</label>
                  <Input type="number" value={tiempo} min={0} onChange={e=>setTiempo(e.target.value)} required/>
                  {errors.tiempo && <span className="text-red-500 text-sm">{errors.tiempo}</span>}
                </div>
                <div>
                  <label className="block mb-1">Porciones</label>
                  <Input type="number" value={porcion} min={1} onChange={e=>setPorcion(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1">Gramaje por porción (g)</label>
                  <Input type="number" value={gramajePorPorcion} min={0} onChange={e=>setGramajePorPorcion(e.target.value)} />
                </div>
                <div className="col-span-3">
                  <label className="block mb-1">Tarea de Inicio (M.e.P.)</label>
                  <Textarea rows={3} value={tareaInicio} onChange={e=>setTareaInicio(e.target.value)} required/>
                    {errors.tareaInicio && <span className="text-red-500 text-sm">{errors.tareaInicio}</span>}
                </div>
                <div className="col-span-2">
                  <label className="block mb-2">Imagen del Plato (opcional)</label>
                  <div className="flex items-center gap-3 bg-gray-100 border border-gray-300 rounded-lg px-4 py-3">
                    <label className="bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded border border-gray-300 cursor-pointer text-sm whitespace-nowrap">
                      Seleccionar archivo
                      <input type="file" accept="image/*" onChange={e => setImagenFile(e.target.files?.[0] || null)} className="hidden"/>
                    </label>
                    <span className="truncate">{imagenFile ? imagenFile.name : 'Ningún archivo seleccionado'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="ingredientes" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ingredientes por Categoría</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={adjustToGramaje}>Ajustar a Gramaje</Button>
                  <Button onClick={saveIngredientes}>Guardar Ingredientes</Button>
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
                        <div key={ii} className="grid grid-cols-6 gap-2 items-end">
                          <div className="col-span-2">
                            <label className="block mb-1">Nombre</label>
                            <Input value={ing.nombre} onChange={e=>updateIngredient(ci,ii,'nombre',e.target.value)} />
                          </div>
                          <div>
                            <label className="block mb-1">Cantidad</label>
                            <Input type="number" min={0} value={ing.cantidad} onChange={e=>updateIngredient(ci,ii,'cantidad',e.target.value)} />
                          </div>
                          <div>
                            <label className="block mb-1">Unidad</label>
                            <select className="w-full border rounded px-2 py-2" value={ing.unidad} onChange={e=>updateIngredient(ci,ii,'unidad',e.target.value)}>
                              {UNIDADES.map(u=> <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="destructive" size="sm" onClick={()=>removeIngredient(ci,ii)}>Eliminar</Button>
                          </div>
                        </div>
                      ))}
                      {cat.ingredientes.length===0 && <p className="text-sm text-slate-500">Sin ingredientes en esta categoría.</p>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="proceso" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Etapas A - E</CardTitle></CardHeader>
              <CardContent className="space-y-8">
                {errors.procesos && (
  <span className="text-red-500 text-sm block mb-2">{errors.procesos}</span>
)}
                {procesos.map((p, pi)=>(
                  <div key={p.etapa} className="space-y-4 p-4 rounded border">
                    <h4 className="text-lg font-semibold">Etapa {p.etapa}</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-1">
                        <label className="block mb-1">Título</label>
                        <Input value={p.titulo} onChange={e=>setProcesos(prev=> prev.map((x,i)=> i===pi? {...x,titulo:e.target.value}:x))} />
                      </div>
                      <div className="col-span-1">
                        <label className="block mb-1">Tiempo Estimado (min)</label>
                        <Input type="number" min={0} value={p.tiempoEstimado} onChange={e=>setProcesos(prev=> prev.map((x,i)=> i===pi? {...x,tiempoEstimado:e.target.value}:x))} />
                      </div>
                      <div className="col-span-3">
                        <label className="block mb-1">Descripción</label>
                        <Textarea rows={3} value={p.descripcion} onChange={e=>setProcesos(prev=> prev.map((x,i)=> i===pi? {...x,descripcion:e.target.value}:x))} />
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
                                <select 
                                  className="w-full border rounded px-2 py-2" 
                                  value={iu.nombre} 
                                  onChange={e=>{
                                    const selected = savedIngredientes.find(ing=>ing.nombre===e.target.value);
                                    if(selected){
                                      updateIngredienteEtapa(pi,ii,'nombre',selected.nombre);
                                      updateIngredienteEtapa(pi,ii,'unidad',selected.unidad);
                                    }
                                  }}
                                >
                                  <option value="">Seleccionar...</option>
                                  {savedIngredientes.map((ing,idx)=> <option key={idx} value={ing.nombre}>{ing.nombre} ({ing.categoria})</option>)}
                                </select>
                              ) : (
                                <Input value={iu.nombre} onChange={e=>updateIngredienteEtapa(pi,ii,'nombre',e.target.value)} placeholder="Primero guarda ingredientes" />
                              )}
                            </div>
                            <div>
                              <label className="block mb-1">Cantidad</label>
                              <Input type="number" min={0} value={iu.cantidad} onChange={e=>updateIngredienteEtapa(pi,ii,'cantidad',e.target.value)} />
                            </div>
                            <div>
                              <label className="block mb-1">Unidad</label>
                              <select className="w-full border rounded px-2 py-2" value={iu.unidad} onChange={e=>updateIngredienteEtapa(pi,ii,'unidad',e.target.value)}>
                                {UNIDADES.map(u=> <option key={u} value={u}>{u}</option>)}
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="destructive" size="sm" onClick={()=>removeIngredienteEtapa(pi,ii)}>Eliminar</Button>
                            </div>
                          </div>
                        ))}
                        {p.ingredientesUsados.length===0 && <p className="text-sm text-slate-500">Sin ingredientes en esta etapa.</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="tecnicas" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Técnicas de Base</CardTitle></CardHeader>
              <CardContent>
                <Textarea rows={6} value={tecnicasBaseInput} placeholder="Una por línea" onChange={e=>setTecnicasBaseInput(e.target.value)} />
                {errors.tecnicasBaseInput && <span className="text-red-500 text-sm block mt-2">{errors.tecnicasBaseInput}</span>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Puntos Críticos de Control (PCC)</CardTitle></CardHeader>
              <CardContent>
                <Textarea rows={6} value={puntosCriticosInput} placeholder="Uno por línea" onChange={e=>setPuntosCriticosInput(e.target.value)} />
                {errors.puntosCriticosInput && <span className="text-red-500 text-sm block mt-2">{errors.puntosCriticosInput}</span>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Utensilios Necesarios</CardTitle></CardHeader>
              <CardContent>
                <Textarea rows={4} value={utensiliosInput} placeholder="Uno por línea" onChange={e=>setUtensiliosInput(e.target.value)} />
                {errors.utensiliosInput && <span className="text-red-500 text-sm block mt-2">{errors.utensiliosInput}</span>}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="montaje" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Montaje Final</CardTitle></CardHeader>
              <CardContent>
                <Textarea rows={5} value={montaje} onChange={e=>setMontaje(e.target.value)} placeholder="Descripción del montaje final" />
                {errors.montaje && <span className="text-red-500 text-sm block mt-2">{errors.montaje}</span>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <DashboardFooter />
    </div>
  );
}
