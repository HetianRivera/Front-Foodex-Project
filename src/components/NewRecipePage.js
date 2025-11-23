import { useState } from 'react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardFooter } from './DashboardFooter';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from 'docx';
import { ChefHat, Package, AlertTriangle, Utensils, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['Cárnicos','Verduras','Ovolácteos','Abarrotes','Licores','Otros'];
const UNIDADES = ['gr','kg','ml','lt','u'];

export function NewRecipePage({ onCancel, onSave, user, recipes }) {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [argumentacionComercial, setArgumentacionComercial] = useState('');
  const [argumentacionTecnica, setArgumentacionTecnica] = useState('');
  const [imagenFile, setImagenFile] = useState(null);
  const [porcion, setPorcion] = useState(1);
  const [gramajePorPorcion, setGramajePorPorcion] = useState(0);
  const [tiempo, setTiempo] = useState(0);
  const [makeup, setMakeup] = useState(3);
  const [factorMultiplicacion, setFactorMultiplicacion] = useState(3);
  const [iva, setIva] = useState(19);
  const [tecnicasBaseInput, setTecnicasBaseInput] = useState('');
  const [puntosCriticosInput, setPuntosCriticosInput] = useState('');
  const [utensiliosInput, setUtensiliosInput] = useState('');
  const [montaje, setMontaje] = useState('');
  const [tareaInicio, setTareaInicio] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [savedIngredientes, setSavedIngredientes] = useState([]);

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
      ingredientes: [...cat.ingredientes,{ nombre:'', cantidad:0, unidad:'gr', precioUnitario:0 }]
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
    if (!codigo || !nombre) return;
    const ingredientesFinal = ingredientesCategorias.map(cat => ({
      categoria: cat.categoria,
      ingredientes: cat.ingredientes.map(ing => {
        const cantidadNum = Number(ing.cantidad)||0;
        const precioUnit = Number(ing.precioUnitario)||0;
        const precioTotal = +(cantidadNum * precioUnit).toFixed(2);
        return { ...ing, cantidad: cantidadNum, precioUnitario: precioUnit, precioTotal };
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
      argumentacionComercial: argumentacionComercial||'',
      argumentacionTecnica: argumentacionTecnica||'',
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
      makeup: Number(makeup)||0,
      factorMultiplicacion: Number(factorMultiplicacion)||1,
      iva: Number(iva)||0,
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
      ['Make Up %', String(makeup)],
      ['Factor Multiplicación', String(factorMultiplicacion)],
      ['IVA %', String(iva)]
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
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Precio Unit', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total', bold: true })] })] }),
        ]
      });
      const rows = cat.ingredientes.map(ing => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(ing.nombre)] }),
          new TableCell({ children: [new Paragraph(String(ing.cantidad))] }),
          new TableCell({ children: [new Paragraph(ing.unidad)] }),
          new TableCell({ children: [new Paragraph(String(ing.precioUnitario||0))] }),
          new TableCell({ children: [new Paragraph(String(((ing.cantidad||0)*(ing.precioUnitario||0)).toFixed(2)))] }),
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
            new Paragraph({ children: [new TextRun({ text: 'Argumentación Comercial', bold: true })] }),
            new Paragraph(argumentacionComercial || ''),
            new Paragraph(''),
            new Paragraph({ children: [new TextRun({ text: 'Argumentación Técnica', bold: true })] }),
            new Paragraph(argumentacionTecnica || ''),
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
              <DollarSign className="w-6 h-6 mr-2" />
              Montaje/Costos
            </TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Datos Generales</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block mb-1">Código</label>
                  <Input value={codigo} onChange={e=>setCodigo(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1">Nombre</label>
                  <Input value={nombre} onChange={e=>setNombre(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1">Categoría</label>
                  <Input value={categoria} onChange={e=>setCategoria(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1">Tiempo (min)</label>
                  <Input type="number" value={tiempo} min={0} onChange={e=>setTiempo(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1">Porciones</label>
                  <Input type="number" value={porcion} min={1} onChange={e=>setPorcion(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1">Gramaje por porción (g)</label>
                  <Input type="number" value={gramajePorPorcion} min={0} onChange={e=>setGramajePorPorcion(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1">Make Up %</label>
                  <Input type="number" value={makeup} min={0} onChange={e=>setMakeup(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1">Factor Multiplicación</label>
                  <Input type="number" value={factorMultiplicacion} min={1} step={0.1} onChange={e=>setFactorMultiplicacion(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1">IVA %</label>
                  <Input type="number" value={iva} min={0} onChange={e=>setIva(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1">Tarea de Inicio (M.e.P.)</label>
                  <Textarea rows={3} value={tareaInicio} onChange={e=>setTareaInicio(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1">Imagen del Plato (opcional)</label>
                  <Input type="file" accept="image/*" onChange={e=>setImagenFile(e.target.files?.[0]||null)} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Argumentaciones</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Argumentación Comercial</label>
                  <Textarea rows={4} value={argumentacionComercial} onChange={e=>setArgumentacionComercial(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1">Argumentación Técnica</label>
                  <Textarea rows={4} value={argumentacionTecnica} onChange={e=>setArgumentacionTecnica(e.target.value)} />
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
                          <div>
                            <label className="block mb-1">Precio Unitario</label>
                            <Input type="number" min={0} value={ing.precioUnitario} onChange={e=>updateIngredient(ci,ii,'precioUnitario',e.target.value)} />
                          </div>
                          <div className="flex flex-col justify-end">
                            <p className="text-sm text-slate-600">Total: {((Number(ing.cantidad)||0)*(Number(ing.precioUnitario)||0)).toFixed(2)}</p>
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
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Puntos Críticos de Control (PCC)</CardTitle></CardHeader>
              <CardContent>
                <Textarea rows={6} value={puntosCriticosInput} placeholder="Uno por línea" onChange={e=>setPuntosCriticosInput(e.target.value)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Utensilios Necesarios</CardTitle></CardHeader>
              <CardContent>
                <Textarea rows={4} value={utensiliosInput} placeholder="Uno por línea" onChange={e=>setUtensiliosInput(e.target.value)} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="montaje" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Montaje Final</CardTitle></CardHeader>
              <CardContent>
                <Textarea rows={5} value={montaje} onChange={e=>setMontaje(e.target.value)} placeholder="Descripción del montaje final" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Resumen Costos (estimado)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(() => {
                  const totalMateriaPrima = ingredientesCategorias.reduce((sum,cat)=> sum + cat.ingredientes.reduce((s,ing)=> s + (Number(ing.cantidad)||0)*(Number(ing.precioUnitario)||0),0),0);
                  const costoMakeup = totalMateriaPrima * (Number(makeup)||0)/100;
                  const costoNeto = totalMateriaPrima + costoMakeup;
                  const precioVentaNeta = costoNeto * (Number(factorMultiplicacion)||1);
                  const ivaValor = precioVentaNeta * (Number(iva)||0)/100;
                  const precioFinal = precioVentaNeta + ivaValor;
                  return (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p>Materia Prima: <strong>{totalMateriaPrima.toFixed(2)}</strong></p>
                      <p>Make Up: <strong>{costoMakeup.toFixed(2)}</strong></p>
                      <p>Costo Neto: <strong>{costoNeto.toFixed(2)}</strong></p>
                      <p>Venta Neta: <strong>{precioVentaNeta.toFixed(2)}</strong></p>
                      <p>IVA: <strong>{ivaValor.toFixed(2)}</strong></p>
                      <p>Precio Final: <strong>{precioFinal.toFixed(2)}</strong></p>
                      <p>Precio por Porción: <strong>{(porcion>0? (precioFinal/porcion).toFixed(2):'0')}</strong></p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <DashboardFooter />
    </div>
  );
}
