import { useState, useEffect } from 'react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardFooter } from './DashboardFooter';
import { FullScreenLoader } from './FullScreenLoader';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from 'docx';
import { toast } from 'sonner';
import { ChevronDown, Trash2 } from 'lucide-react';
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
import { validateRecipePayload } from '../utils/validators';

const CATEGORIES = ['Cárnicos', 'Verduras', 'Ovolácteos', 'Abarrotes', 'Licores'];
const UNIDADES = ['gr', 'kg', 'ml', 'lt', 'u'];
const STAGES = ['A', 'B', 'C', 'D', 'E'];
const MAX_STAGE_TIME = 9999;

const inputClass =
  'bg-slate-50 text-slate-900 placeholder-slate-400 ' +
  'dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 ' +
  'transition-colors duration-300';

const selectClass =
  'w-full border rounded px-2 py-2 ' +
  'bg-slate-50 text-slate-900 placeholder-slate-400 ' +
  'dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 ' +
  'border-slate-200 dark:border-slate-700 ' +
  'transition-colors duration-300';

export function NewRecipePage({ onCancel, onSave, user }) {
  const [isSaving, setIsSaving] = useState(false);

  

  const RELAX =
    String(
      process.env.REACT_APP_RELAX_RECIPE_VALIDATION ||
        process.env.REACT_APP_OFFLINE ||
        process.env.REACT_APP_USE_MOCK ||
        'false'
    ).toLowerCase() === 'true';

  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [imagenFile, setImagenFile] = useState(null);

  const [porcion, setPorcion] = useState(1);


  const [tiempo, setTiempo] = useState(0);
  const [tareaInicio, setTareaInicio] = useState('');
  const [montaje, setMontaje] = useState('');

  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});

  const [savedIngredientes, setSavedIngredientes] = useState([]);
  const [tecnicas, setTecnicas] = useState([{ nombre: '', descripcion: '', saved: false }]);
  const [savedTecnicas, setSavedTecnicas] = useState([]);
  const [ingredientesCategorias, setIngredientesCategorias] = useState(
    CATEGORIES.map(c => ({ categoria: c, ingredientes: [] }))
  );

  // Inicializar con una etapa mínima (A). El usuario puede agregar hasta 5 (A-E).
  const [procesos, setProcesos] = useState([
    { etapa: STAGES[0], titulo: '', descripcion: '', tiempoEstimado: 0, saved: false, ingredientesUsados: [] }
  ]);

  const [openStageIndex, setOpenStageIndex] = useState(0);

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
        return value !== undefined && value !== null && String(value).trim() === ''
          ? 'No deje solo espacios'
          : '';
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

  const addIngredient = categoriaIndex => {
    setIngredientesCategorias(prev =>
      prev.map((cat, i) =>
        i === categoriaIndex
          ? {
              ...cat,
              ingredientes: [
                ...cat.ingredientes,
                { nombre: '', cantidad: 0, unidad: 'gr', saved: false },
              ],
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
            j === ingredientIndex
              ? {
                  ...ing,
                  [key]: key === 'cantidad' || key === 'tiempoCoccion' ? parseInt(value || '0', 10) : value,
                }
              : ing
          ),
        };
      })
    );
  };

  const removeIngredient = (categoriaIndex, ingredientIndex) => {
    // Determine ingredient entry (name + unidad + optional _id) before removing
    const ingEntry = ingredientesCategorias?.[categoriaIndex]?.ingredientes?.[ingredientIndex] || {};
    const ingName = String(ingEntry.nombre || '').trim();
    const ingUnidad = String(ingEntry.unidad || '').trim();

    setIngredientesCategorias(prev =>
      prev.map((cat, i) =>
        i === categoriaIndex
          ? { ...cat, ingredientes: cat.ingredientes.filter((_, j) => j !== ingredientIndex) }
          : cat
      )
    );

    if (ingName) {
      // Remove matching saved ingrediente by name+unidad or by _id if available
      setSavedIngredientes(prev => prev.filter(si => {
        if (ingEntry._id) return si._id !== ingEntry._id;
        return !(String(si.nombre).trim() === ingName && String(si.unidad || '').trim() === ingUnidad);
      }));

      // Remove ingredient usages in etapas by matching _id if present, otherwise by name+unidad
      setProcesos(prev => prev.map(p => ({
        ...p,
        ingredientesUsados: Array.isArray(p.ingredientesUsados)
          ? p.ingredientesUsados.filter(iu => {
              if (ingEntry._id && iu._id) return iu._id !== ingEntry._id;
              const iuName = String(iu.nombre || '').trim();
              const iuUnidad = String(iu.unidad || '').trim();
              return !(iuName === ingName && iuUnidad === ingUnidad);
            })
          : []
      })));
    }
  };

  const saveIngrediente = (categoriaIndex, ingredientIndex) => {
    const cat = ingredientesCategorias[categoriaIndex];
    const ing = cat?.ingredientes?.[ingredientIndex];
    if (!ing) return;

    const n = (ing.nombre || '').trim();
    if (!n) {
      toast.error('Ingresa un nombre de ingrediente');
      return;
    }

    const toSave = {
      _id: `${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      nombre: n,
      cantidad: Number(ing.cantidad) || 0,
      unidad: ing.unidad || 'gr',
      categoria: cat.categoria,
      tiempoCoccion: Number(ing.tiempoCoccion) || 0,
    };

    // helper: normalize unit and convert to grams when possible
    const toGrams = (cantidad, unidad) => {
      const u = String((unidad || '')).trim().toLowerCase();
      const c = Number(cantidad) || 0;
      if (u === 'gr' || u === 'g') return c;
      if (u === 'kg') return c * 1000;
      return null; // not convertible
    };

    // ensure total used in procesos doesn't exceed this quantity
    const usedAcrossProcesos = procesos.reduce((acc, p) => {
      const used = (p.ingredientesUsados || []).reduce((s, iu) => {
        const iuName = String(iu.nombre || '').trim().toLowerCase();
        const iuUnit = String(iu.unidad || '').trim().toLowerCase();
        const toName = String(toSave.nombre || '').trim().toLowerCase();
        const toUnit = String(toSave.unidad || '').trim().toLowerCase();

        const sameById = iu._id && toSave._id && iu._id === toSave._id;
        const sameByNameUnit = iuName === toName && iuUnit === toUnit;

        if (sameById || sameByNameUnit) {
          return s + (Number(iu.cantidad) || 0);
        }
        // additionally, match by gram-equivalence if both convertible
        const iuGr = toGrams(iu.cantidad, iu.unidad);
        const toGr = toGrams(toSave.cantidad, toSave.unidad);
        if (iuName === toName && iuGr !== null && toGr !== null && iuGr === toGr) {
          return s + (Number(iu.cantidad) || 0);
        }
        return s;
      }, 0);
      return acc + used;
    }, 0);

    if (usedAcrossProcesos > toSave.cantidad) {
      toast.error(`No se puede guardar: ya se usan ${usedAcrossProcesos} ${toSave.unidad} de ${toSave.nombre} en las etapas`);
      return;
    }

    setSavedIngredientes(prev => {
      // helper to convert to grams
      const toGramsLocal = (cantidad, unidad) => {
        const u = String((unidad || '')).trim().toLowerCase();
        const c = Number(cantidad) || 0;
        if (u === 'gr' || u === 'g') return c;
        if (u === 'kg') return c * 1000;
        return null;
      };

      const toGr = toGramsLocal(toSave.cantidad, toSave.unidad);
      const nameNorm = String(toSave.nombre || '').trim().toLowerCase();

      for (let i = 0; i < prev.length; i++) {
        const ex = prev[i];
        const exName = String(ex.nombre || '').trim().toLowerCase();
        const exUnit = String(ex.unidad || '').trim().toLowerCase();

        if (exName !== nameNorm) continue;

        // same unit -> update
        if (exUnit === String(toSave.unidad || '').trim().toLowerCase()) {
          const copy = [...prev];
          copy[i] = { ...ex, ...toSave };
          return copy;
        }

        // both convertible to grams and equal -> offer to update existing entry
        const exGr = toGramsLocal(ex.cantidad, ex.unidad);
        if (toGr !== null && exGr !== null && toGr === exGr) {
          const msg = `Ya existe "${ex.nombre}" con ${ex.cantidad}${ex.unidad}. ¿Deseas actualizar esa entrada con ${toSave.cantidad}${toSave.unidad}?`;
          const accept = window.confirm(msg);
          if (accept) {
            const copy = [...prev];
            // preserve existing _id so references remain, update cantidad/unidad/tiempo
            copy[i] = { ...ex, cantidad: toSave.cantidad, unidad: toSave.unidad, tiempoCoccion: toSave.tiempoCoccion };
            return copy;
          }
          return prev;
        }
      }

      // otherwise add as distinct entry
      return [...prev, toSave];
    });

    setIngredientesCategorias(prev =>
      prev.map((c, i) =>
        i === categoriaIndex
          ? {
              ...c,
              ingredientes: c.ingredientes.map((x, j) =>
                j === ingredientIndex ? { ...x, saved: true } : x
              ),
            }
          : c
      )
    );

    // no mostrar notificación aquí; sólo mostrar al finalizar el guardado de la receta
  };

  const toggleEditIngrediente = (categoriaIndex, ingredientIndex) => {
    setIngredientesCategorias(prev =>
      prev.map((c, i) =>
        i === categoriaIndex
          ? {
              ...c,
              ingredientes: c.ingredientes.map((x, j) =>
                j === ingredientIndex ? { ...x, saved: false } : x
              ),
            }
          : c
      )
    );
  };

  const addIngredienteEtapa = etapaIndex => {
    setProcesos(prev =>
      prev.map((p, i) =>
        i === etapaIndex
          ? {
              ...p,
              ingredientesUsados: [
                ...p.ingredientesUsados,
                { _id: '', nombre: '', cantidad: 0, unidad: 'gr', tiempoCoccion: 0, saved: false },
              ],
            }
          : p
      )
    );
  };

  const updateIngredienteEtapa = (etapaIndex, ingredienteIndex, key, value) => {
    // If changing cantidad, ensure not exceeding saved ingrediente total across etapas
    if (key === 'cantidad') {
      const newVal = parseInt(value || '0', 10);

      // find total available for this ingredient from savedIngredientes
      const iuRef = procesos[etapaIndex]?.ingredientesUsados?.[ingredienteIndex] || {};
      const ingredientId = iuRef._id || null;
      const ingredientName = iuRef.nombre || null;

      const savedRef = ingredientId ? savedIngredientes.find(si => si._id === ingredientId) : savedIngredientes.find(si => si.nombre === ingredientName);
      const totalAvailable = savedRef ? Number(savedRef.cantidad) || 0 : null;

      if (totalAvailable !== null) {
        // compute total used in other etapas (including this ingrediente other entries)
        let usedOther = 0;
        procesos.forEach((p, pi) => {
          p.ingredientesUsados.forEach((iu, ii) => {
            const matches = savedRef && savedRef._id ? (iu._id === savedRef._id) : (String(iu.nombre || '').trim().toLowerCase() === String(ingredientName || '').trim().toLowerCase() && String(iu.unidad || '').trim() === String(savedRef?.unidad || '').trim());
            if (matches) {
              if (pi === etapaIndex && ii === ingredienteIndex) return; // skip current
              usedOther += Number(iu.cantidad) || 0;
            }
          });
        });

        const remaining = totalAvailable - usedOther;
        if (newVal > remaining) {
          toast.error(`Cantidad excede disponibilidad. Quedan ${remaining}${savedRef.unidad || ''}`);
          // clamp to remaining (not negative)
          const clamped = Math.max(0, remaining);
          // apply clamped value
          setProcesos(prev =>
            prev.map((p, i) => {
              if (i !== etapaIndex) return p;
              return {
                ...p,
                ingredientesUsados: p.ingredientesUsados.map((ing, j) => (j === ingredienteIndex ? { ...ing, cantidad: clamped } : ing)),
              };
            })
          );
          return;
        }
      }

      // If changing tiempoCoccion, ensure it does not exceed the etapa's tiempoEstimado
      if (key === 'tiempoCoccion') {
        const newVal = parseInt(value || '0', 10);
        const etapaTiempo = procesos[etapaIndex]?.tiempoEstimado || 0;
        if (newVal > etapaTiempo) {
          toast.error(`El tiempo de cocción no puede exceder el tiempo estimado de la etapa (${etapaTiempo} min)`);
          const clamped = Math.max(0, etapaTiempo);
          setProcesos(prev =>
            prev.map((p, i) => {
              if (i !== etapaIndex) return p;
              return {
                ...p,
                ingredientesUsados: p.ingredientesUsados.map((ing, j) => (j === ingredienteIndex ? { ...ing, tiempoCoccion: clamped } : ing)),
              };
            })
          );
          return;
        }
      }
    }

    setProcesos(prev =>
      prev.map((p, i) => {
        if (i !== etapaIndex) return p;

        return {
          ...p,
          ingredientesUsados: p.ingredientesUsados.map((ing, j) => {
            if (j !== ingredienteIndex) return ing;

            if (key === 'nombre') {
              // `value` can be a saved ingrediente _id (from select) or free text name
              const refById = savedIngredientes.find(si => si._id === value);
              if (refById) {
                return {
                  ...ing,
                  _id: refById._id,
                  nombre: refById.nombre,
                  unidad: refById.unidad,
                  tiempoCoccion: Number(refById.tiempoCoccion) || 0,
                };
              }
              // free text entry: clear _id so it is treated as manual
              return { ...ing, _id: '', nombre: value };
            }

            return { ...ing, [key]: key === 'cantidad' || key === 'tiempoCoccion' ? parseInt(value || '0', 10) : value };
          }),
        };
      })
    );
  };

  const removeIngredienteEtapa = (etapaIndex, ingredienteIndex) => {
    setProcesos(prev =>
      prev.map((p, i) =>
        i === etapaIndex
          ? { ...p, ingredientesUsados: p.ingredientesUsados.filter((_, j) => j !== ingredienteIndex) }
          : p
      )
    );
  };

  const saveIngredienteEtapa = (etapaIndex, ingredienteIndex) => {
    setProcesos(prev =>
      prev.map((p, i) =>
        i === etapaIndex
          ? {
              ...p,
              ingredientesUsados: p.ingredientesUsados.map((ing, j) =>
                j === ingredienteIndex ? { ...ing, saved: true } : ing
              ),
            }
          : p
      )
    );
    // no mostrar notificación aquí; sólo mostrar al finalizar el guardado de la receta
  };

  const toggleEditIngredienteEtapa = (etapaIndex, ingredienteIndex) => {
    setProcesos(prev =>
      prev.map((p, i) =>
        i === etapaIndex
          ? {
              ...p,
              ingredientesUsados: p.ingredientesUsados.map((ing, j) =>
                j === ingredienteIndex ? { ...ing, saved: false } : ing
              ),
            }
          : p
      )
    );
  };

  const saveProceso = (index) => {
    const p = procesos[index];
    if (!p) return;
    if (!p.titulo?.trim() || !p.descripcion?.trim() || !p.tiempoEstimado) {
      toast.error('Completa título, descripción y tiempo para guardar la etapa');
      return;
    }
    setProcesos(prev => prev.map((x, i) => (i === index ? { ...x, saved: true } : x)));
    // no mostrar notificación aquí; sólo mostrar al finalizar el guardado de la receta
  };

  const toggleEditProceso = (index) => {
    setProcesos(prev => prev.map((x, i) => (i === index ? { ...x, saved: false } : x)));
  };

  const addStage = () => {
    const max = STAGES.length;
    if (procesos.length >= max) {
      toast.error(`Máximo ${max} etapas (A-E)`);
      return;
    }
    const next = procesos.length; // 0-based
    const etapa = STAGES[next] || `E`;
    setProcesos(prev => [...prev, { etapa, titulo: '', descripcion: '', tiempoEstimado: 0, saved: false, ingredientesUsados: [] }]);
    setOpenStageIndex(procesos.length); // abrir la nueva etapa
  };

  const removeStage = (index) => {
    if ((procesos || []).length <= 1) {
      toast.error('Debe quedar al menos 1 etapa');
      return;
    }
    setProcesos(prev => {
      const next = prev.filter((_, i) => i !== index);
      // Reassign letters A..E according to order
      return next.map((p, i) => ({ ...p, etapa: STAGES[i] || p.etapa }));
    });
    // Adjust open index
    setOpenStageIndex(prev => {
      if (prev === index) return -1;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  // keep total tiempo synced with sum of etapas
  useEffect(() => {
    const total = procesos.reduce((s, p) => s + (Number(p.tiempoEstimado) || 0), 0);
    setTiempo(total);
  }, [procesos]);

  // compute gramaje por porcion from savedIngredientes (convert basic units)
  // removed gramaje por porcion calculation

  const addTecnica = () => {
    setTecnicas(prev => {
      if (prev.length >= 1) {
        toast.error('Solo se permite una técnica');
        return prev;
      }
      return [...prev, { nombre: '', descripcion: '', saved: false }];
    });
  };

  const updateTecnica = (index, key, value) => {
    setTecnicas(prev => prev.map((t, i) => (i === index ? { ...t, [key]: value } : t)));
  };

  const removeTecnica = index => {
    setTecnicas(prev => prev.filter((_, i) => i !== index));
  };

  const saveTecnica = index => {
    const t = tecnicas[index];
    if (!t?.nombre?.trim() || !t?.descripcion?.trim()) return;

    setTecnicas(prev => prev.map((x, i) => (i === index ? { ...x, saved: true } : x)));

    setSavedTecnicas(prev => {
      const existingIdx = prev.findIndex(
        x => x.nombre.trim().toLowerCase() === t.nombre.trim().toLowerCase()
      );
      const newEntry = { nombre: t.nombre.trim(), descripcion: t.descripcion.trim() };

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = { ...copy[existingIdx], ...newEntry };
        return copy;
      }
      return [...prev, newEntry];
    });

    // no mostrar notificación aquí; sólo mostrar al finalizar el guardado de la receta
  };

  const handleSave = async () => {
    
    // Validación: etapas A-E únicas
    const STAGE_SET = new Set(['A', 'B', 'C', 'D', 'E']);
    const phases = procesos.map(p => String(p.etapa || '').trim().toUpperCase());
    const invalidPhases = phases.filter(ph => !STAGE_SET.has(ph));
    const dupPhases = phases.filter((ph, idx) => phases.indexOf(ph) !== idx);

    if (invalidPhases.length > 0) {
      toast.error(`Etapas inválidas: ${invalidPhases.join(', ')}. Deben ser letras A-E.`);
      return;
    }
    if (dupPhases.length > 0) {
      toast.error(`Etapas duplicadas: ${Array.from(new Set(dupPhases)).join(', ')}`);
      return;
    }

    const allFields = ['codigo', 'nombre', 'categoria', 'tiempo', 'tareaInicio', 'montaje'];
    const newTouched = {};
    allFields.forEach(f => (newTouched[f] = true));
    setTouched(newTouched);

    let newErrors = {};
    if (!RELAX) {
      if (!codigo) newErrors.codigo = 'El código es obligatorio';
      if (!nombre) newErrors.nombre = 'El nombre es obligatorio';
      if (!categoria) newErrors.categoria = 'La categoría es obligatoria';
      if (!tiempo) newErrors.tiempo = 'El tiempo es obligatorio';
      if (!tareaInicio) newErrors.tareaInicio = 'La tarea de inicio es obligatoria';
      if (!montaje.trim()) newErrors.montaje = 'Debes ingresar el montaje final';

      if (!ingredientesCategorias.some(cat => cat.ingredientes.length > 0))
        newErrors.ingredientes = 'Debes agregar al menos un ingrediente';

      if (!procesos.some(p => p.titulo.trim() && p.descripcion.trim() && p.tiempoEstimado))
        newErrors.procesos =
          'Debes completar al menos una etapa con título, tiempo y descripción';

      // Ensure no etapa exceeds max allowed time
      const over = procesos.find(p => Number(p.tiempoEstimado) > MAX_STAGE_TIME);
      if (over) {
        newErrors.procesos = `La etapa ${over.etapa || '?'} tiene un tiempo mayor a ${MAX_STAGE_TIME} minutos`;
      }

      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0) {
        toast.error('No se ha podido guardar la receta. Faltan campos obligatorios');
        return;
      }
    } else {
      setErrors({});
    }

    const ingredientesFinal = ingredientesCategorias.map(cat => ({
      categoria: cat.categoria,
      ingredientes: cat.ingredientes.map(ing => ({
        nombre: ing.nombre,
        cantidad: Number(ing.cantidad) || 0,
        unidad: ing.unidad,
      })),
    }));

    const receta = {
      id: Date.now().toString(),
      codigo: codigo || `REC-${Date.now()}`,
      nombre: nombre || 'Sin nombre',
      categoria: categoria || 'Sin categoría',
      aporte: 0,
      porcion: Number(porcion) || 1,
      tiempo: Number(tiempo) || 0,
      rendimiento: Number(porcion) || 1,
      tareaInicio: tareaInicio || '',
      ingredientes: ingredientesFinal,
      procesos: procesos.map(p => ({
        etapa: String(p.etapa || '').trim().toUpperCase(),
        titulo: p.titulo,
        descripcion: p.descripcion,
        ingredientesUsados: (p.ingredientesUsados || []).map(i => ({
          ...i,
          cantidad: Number(i.cantidad) || 0,
          tiempoCoccion: Number(i.tiempoCoccion) || 0,
        })),
        tiempoEstimado: Number(p.tiempoEstimado) || 0,
      })),
      tecnicas: savedTecnicas.filter(t => t.nombre?.trim()),
      montaje,
    };

    try {
      // Validate payload against global limits
      const valErrors = validateRecipePayload(receta || {});
      if (valErrors && valErrors.length) {
        setErrors(prev => ({ ...prev, validation: valErrors }));
        toast.error('No se puede guardar: hay campos que exceden los límites');
        return;
      }

      setIsSaving(true);
      const saved = await createFullRecipe(receta);

      // Mostrar único mensaje de éxito al terminar el guardado
      onSave(saved);
      toast.success('Se ha guardado correctamente');
    } catch (err) {
      const status = err?.response?.status;
      const body = err?.response?.data;
      const msg =
        body && typeof body === 'object'
          ? JSON.stringify(body)
          : body || err?.message || 'Error desconocido';

      console.warn('Fallo al guardar en API', status, msg);
      toast.error(`No se pudo guardar en el servidor (${status || 'sin código'}). ${msg}`);

      // fallback local
      onSave(receta);
      // Mostrar mensaje de éxito también en el fallback local (cumple "solo ahí")
      toast.success('Se ha guardado correctamente');
    } finally {
      setIsSaving(false);
    }
  };

  const exportWord = async () => {
    if (!nombre) return;

    const metaRows = [
      ['Código', codigo],
      ['Nombre', nombre],
      ['Categoría', categoria],
      ['Porciones', String(porcion)],
      ['Tiempo (min)', String(tiempo)],
    ];

    const tableMeta = new Table({
      rows: metaRows.map(r => {
        return new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: r[0], bold: true })],
                }),
              ],
            }),
            new TableCell({
              children: [new Paragraph(r[1] || '')],
            }),
          ],
        });
      }),
    });

    const ingredientesTables = ingredientesCategorias.map(cat => {
      const header = new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: cat.categoria, bold: true })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Cantidad', bold: true })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Unidad', bold: true })] })],
          }),
        ],
      });

      const rows = cat.ingredientes.map(ing => {
        return new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(ing.nombre || '')] }),
            new TableCell({ children: [new Paragraph(String(ing.cantidad ?? ''))] }),
            new TableCell({ children: [new Paragraph(String(ing.unidad ?? ''))] }),
          ],
        });
      });

      return new Table({ rows: [header, ...rows] });
    });

    const tecnicasBlocks = [];
    if (savedTecnicas.length) {
      tecnicasBlocks.push(
        new Paragraph({ children: [new TextRun({ text: 'Técnicas', bold: true })] })
      );

      savedTecnicas.forEach((t, idx) => {
        tecnicasBlocks.push(
          new Paragraph({
            children: [new TextRun({ text: `${idx + 1}. ${t.nombre}`, bold: true })],
          })
        );
        tecnicasBlocks.push(new Paragraph(t.descripcion || ''));
        tecnicasBlocks.push(new Paragraph(''));
      });
    }

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Ficha Técnica', bold: true, size: 32 })],
            }),
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
            ...tecnicasBlocks,
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${codigo || 'receta'}_${nombre || 'ficha'}.docx`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-500 ease-in-out">
      <FullScreenLoader show={isSaving} />

      <DashboardHeader user={user} showWelcome={false}>
          <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold">Nueva Ficha Técnica</h1>
          <div className="flex gap-2">
            <Button className={'bg-white text-black hover:bg-gray-200 hover:text-black'} variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button className={'bg-white text-black hover:bg-gray-200 hover:text-black'} onClick={handleSave}>Guardar</Button>
            <Button className={'bg-white text-black hover:bg-gray-200 hover:text-black'} variant="secondary" onClick={exportWord}>
              Exportar Word
            </Button>
          </div>
        </div>
      </DashboardHeader>

      <div className="max-w-7xl mx-auto space-y-6 p-6">
        {/* Datos Generales */}
        <Card className="bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Datos Generales</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div>
              <label className="block mb-1">Código</label>
              <Input
                value={codigo}
                onChange={e => handleChange('codigo', e.target.value, setCodigo)}
                onBlur={e => handleBlur('codigo', e.target.value)}
                className={inputClass}
              />
              {touched.codigo && errors.codigo && (
                <span className="text-red-500 text-sm">{errors.codigo}</span>
              )}
            </div>

            <div>
              <label className="block mb-1">Nombre</label>
              <Input
                value={nombre}
                onChange={e => handleChange('nombre', e.target.value, setNombre)}
                onBlur={e => handleBlur('nombre', e.target.value)}
                className={inputClass}
              />
              {touched.nombre && errors.nombre && (
                <span className="text-red-500 text-sm">{errors.nombre}</span>
              )}
            </div>

            <div>
              <label className="block mb-1">Categoría</label>
              <Input
                value={categoria}
                onChange={e => handleChange('categoria', e.target.value, setCategoria)}
                onBlur={e => handleBlur('categoria', e.target.value)}
                className={inputClass}
              />
              {touched.categoria && errors.categoria && (
                <span className="text-red-500 text-sm">{errors.categoria}</span>
              )}
            </div>

            <div>
              <label className="block mb-1">Tiempo (min)</label>
              <Input
                type="number"
                step={1}
                inputMode="numeric"
                pattern="[0-9]*"
                min={0}
                value={tiempo}
                disabled
                onKeyDown={preventDecimalKey}
                onPaste={preventDecimalPaste}
                className={inputClass}
              />
              {touched.tiempo && errors.tiempo && (
                <span className="text-red-500 text-sm">{errors.tiempo}</span>
              )}
            </div>

            <div>
              <label className="block mb-1">Porciones</label>
              <Input
                type="number"
                step={1}
                inputMode="numeric"
                pattern="[0-9]*"
                min={1}
                value={porcion}
                onChange={e => setPorcion(parseInt(e.target.value || '0', 10))}
                onKeyDown={preventDecimalKey}
                onPaste={preventDecimalPaste}
                className={inputClass}
              />
            </div>

            <div>
              {/* Gramaje por porción removed */}
            </div>

            <div className="col-span-3">
              <label className="block mb-1">Descripción</label>
              <Textarea
                rows={3}
                value={tareaInicio}
                onChange={e => handleChange('tareaInicio', e.target.value, setTareaInicio)}
                onBlur={e => handleBlur('tareaInicio', e.target.value)}
                className={inputClass}
              />
              {touched.tareaInicio && errors.tareaInicio && (
                <span className="text-red-500 text-sm">{errors.tareaInicio}</span>
              )}
            </div>

            <div className="col-span-2">
              <label className="block mb-2">Imagen del Plato (opcional)</label>
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-lg px-4 py-3 transition-colors duration-300">
                <label className="bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-700 dark:text-slate-100 font-medium py-2 px-4 rounded border border-slate-200 dark:border-slate-600 cursor-pointer text-sm whitespace-nowrap transition-colors duration-300">
                  Seleccionar archivo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setImagenFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                <span className="text-sm text-slate-500 dark:text-slate-300 truncate">
                  {imagenFile ? imagenFile.name : 'Ningún archivo seleccionado'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ingredientes */}
        <Card className="bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-semibold">Ingredientes</CardTitle>
          </CardHeader>

          <CardContent className="space-y-8">
            {errors.ingredientes && (
              <span className="text-red-500 text-sm block mb-2">{errors.ingredientes}</span>
            )}

            {ingredientesCategorias.map((cat, ci) => (
              <div key={ci} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold">{cat.categoria}</h4>
                  <Button className={'dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:hover:text-black'} size="sm" variant="secondary" onClick={() => addIngredient(ci)}>
                    Agregar
                  </Button>
                </div>

                <div className="space-y-3">
                  {cat.ingredientes.map((ing, ii) => (
                    <div key={ii} className="grid grid-cols-7 gap-2 items-end">
                      <div className="col-span-2">
                        <label className="block mb-1">Nombre</label>
                        <Input
                          value={ing.nombre}
                          onChange={e => updateIngredient(ci, ii, 'nombre', e.target.value)}
                          disabled={!!ing.saved}
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="block mb-1">Cantidad</label>
                        <Input
                          type="number"
                          step={1}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min={0}
                          value={ing.cantidad}
                          onChange={e => updateIngredient(ci, ii, 'cantidad', parseInt(e.target.value || '0', 10))}
                          disabled={!!ing.saved}
                          onKeyDown={preventDecimalKey}
                          onPaste={preventDecimalPaste}
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="block mb-1">Unidad</label>
                        <select
                          className={selectClass}
                          value={ing.unidad}
                          onChange={e => updateIngredient(ci, ii, 'unidad', e.target.value)}
                          disabled={!!ing.saved}
                        >
                          {UNIDADES.map(u => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2 justify-end">
                        {!ing.saved ? (
                          <Button size="sm" onClick={() => saveIngrediente(ci, ii)}>
                            Guardar
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => toggleEditIngrediente(ci, ii)}
                          >
                            Editar
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeIngredient(ci, ii)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}

                  {cat.ingredientes.length === 0 && (
                    <p className="text-sm text-slate-500">Sin ingredientes en esta categoría.</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Etapas */}
        <Card className="bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300">
          <CardHeader>
            <div className="w-full flex items-center justify-between">
              <CardTitle className="text-2xl font-semibold">Etapas</CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={addStage} disabled={procesos.length >= STAGES.length}>
                  Agregar Etapa
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {errors.procesos && (
              <span className="text-red-500 text-sm block mb-2">{errors.procesos}</span>
            )}

            {procesos.map((p, pi) => (
              <div key={p.etapa} className="space-y-4 rounded border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-t border-b border-slate-200 dark:border-slate-700 transition-colors duration-300">
                  <h4 className="text-lg font-semibold">Etapa {p.etapa}</h4>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => (p.saved ? toggleEditProceso(pi) : saveProceso(pi))}
                      className={'hover:bg-white dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:hover:text-black'}
                    >
                      {p.saved ? 'Editar' : 'Guardar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeStage(pi)}
                      title="Eliminar etapa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpenStageIndex(openStageIndex === pi ? -1 : pi)}
                      title={openStageIndex === pi ? 'Cerrar' : 'Expandir'}
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${openStageIndex === pi ? 'rotate-180' : 'rotate-0'}`} />
                    </Button>
                  </div>
                </div>

                {openStageIndex === pi && (
                  <div className="grid grid-cols-3 gap-4 p-4 pt-0">
                    <div className="col-span-1">
                      <label className="block mb-1">Título</label>
                      <Input
                        value={p.titulo}
                        disabled={!!p.saved}
                        onChange={e =>
                          setProcesos(prev =>
                            prev.map((x, i) => (i === pi ? { ...x, titulo: e.target.value } : x))
                          )
                        }
                        className={inputClass}
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block mb-1">Tiempo Estimado (min)</label>
                      <Input
                        type="number"
                        step={1}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min={0}
                        value={p.tiempoEstimado}
                        disabled={!!p.saved}
                        max={MAX_STAGE_TIME}
                        onChange={e => {
                          let newTiempo = parseInt(e.target.value || '0', 10);
                          if (newTiempo > MAX_STAGE_TIME) {
                            toast.error(`El tiempo de etapa no puede ser mayor a ${MAX_STAGE_TIME} minutos`);
                            newTiempo = MAX_STAGE_TIME;
                            setErrors(prev => ({ ...prev, procesos: `Tiempo de etapa no puede superar ${MAX_STAGE_TIME} minutos` }));
                          } else {
                            setErrors(prev => ({ ...prev, procesos: '' }));
                          }

                          setProcesos(prev =>
                            prev.map((x, i) =>
                              i === pi
                                ? {
                                    ...x,
                                    tiempoEstimado: newTiempo,
                                    ingredientesUsados: (x.ingredientesUsados || []).map(ing => ({
                                      ...ing,
                                      tiempoCoccion: Math.min(Number(ing.tiempoCoccion) || 0, newTiempo),
                                    })),
                                  }
                                : x
                            )
                          );
                        }}
                        onKeyDown={preventDecimalKey}
                        onPaste={preventDecimalPaste}
                        className={inputClass}
                      />
                    </div>

                    <div className="col-span-3">
                      <label className="block mb-1">Descripción</label>
                      <Textarea
                        rows={3}
                        value={p.descripcion}
                        disabled={!!p.saved}
                        onChange={e =>
                          setProcesos(prev =>
                            prev.map((x, i) =>
                              i === pi ? { ...x, descripcion: e.target.value } : x
                            )
                          )
                        }
                        className={inputClass}
                      />
                    </div>

                    <div className="col-span-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">Ingredientes usados</p>
                        <Button className={'dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:hover:text-black'} size="sm" variant="secondary" onClick={() => addIngredienteEtapa(pi)} disabled={!!p.saved}>
                          Agregar
                        </Button>
                      </div>

                      {p.ingredientesUsados.map((iu, ii) => (
                        <div key={ii} className="grid grid-cols-7 gap-2 items-end">
                          <div className="col-span-2">
                            <label className="block mb-1">Ingrediente</label>

                              {savedIngredientes.length > 0 ? (
                              <select
                                className={selectClass}
                                value={iu._id || ''}
                                onChange={e => updateIngredienteEtapa(pi, ii, 'nombre', e.target.value)}
                                disabled={!!iu.saved || !!p.saved}
                              >
                                <option value="">Seleccionar...</option>
                                {savedIngredientes.map((ing) => (
                                  <option key={ing._id} value={ing._id}>
                                    {ing.nombre} — {ing.cantidad}{ing.unidad}
                                  </option>
                                ))}
                              </select>
                              ) : (
                              <Input
                                value={iu.nombre}
                                onChange={e => updateIngredienteEtapa(pi, ii, 'nombre', e.target.value)}
                                placeholder="Primero guarda ingredientes"
                                disabled={!!iu.saved || !!p.saved}
                                className={inputClass}
                              />
                            )}
                          </div>

                          <div>
                            <label className="block mb-1">Cantidad</label>
                              <Input
                                type="number"
                                step={1}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                min={0}
                                value={iu.cantidad}
                                onChange={e => updateIngredienteEtapa(pi, ii, 'cantidad', parseInt(e.target.value || '0', 10))}
                                disabled={!!iu.saved || !!p.saved}
                                onKeyDown={preventDecimalKey}
                                onPaste={preventDecimalPaste}
                                className={inputClass}
                              />
                          </div>

                          <div>
                            <label className="block mb-1">Unidad</label>
                              <select
                                className={selectClass}
                                value={iu.unidad}
                                onChange={e => updateIngredienteEtapa(pi, ii, 'unidad', e.target.value)}
                                disabled={!!iu.saved || !!p.saved}
                              >
                              {UNIDADES.map(u => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block mb-1">Tiempo cocción (min)</label>
                              <Input
                                type="number"
                                step={1}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                min={0}
                                value={iu.tiempoCoccion || 0}
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
                                disabled={!!iu.saved || !!p.saved}
                                onKeyDown={preventDecimalKey}
                                onPaste={preventDecimalPaste}
                                className={inputClass}
                              />
                          </div>

                          <div className="flex gap-2 justify-end">
                            {!iu.saved ? (
                              <Button size="sm" onClick={() => saveIngredienteEtapa(pi, ii)}>
                                Guardar
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => toggleEditIngredienteEtapa(pi, ii)}
                              >
                                Editar
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeIngredienteEtapa(pi, ii)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      ))}

                      {p.ingredientesUsados.length === 0 && (
                        <p className="text-sm text-slate-500">Sin ingredientes en esta etapa.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Técnica */}
        <Card className="bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-2xl font-semibold">Técnica Base</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {tecnicas.map((t, idx) => (
              <div key={idx} className="space-y-4 p-4 rounded border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1">Nombre</label>
                    <Input
                      value={t.nombre}
                      onChange={e => updateTecnica(idx, 'nombre', e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  {/* controls removed: no agregar/eliminar técnica */}

                  <div className="col-span-2">
                    <label className="block mb-1">Descripción</label>
                    <Textarea
                      rows={4}
                      value={t.descripcion}
                      onChange={e => updateTecnica(idx, 'descripcion', e.target.value)}
                      className={inputClass}
                    />
                    {t.saved && <p className="text-xs text-green-600 mt-1">Registrada</p>}
                  </div>
                </div>
              </div>
            ))}

            {tecnicas.length === 0 && (
              <p className="text-sm text-slate-500">No hay técnica agregada.</p>
            )}
          </CardContent>
        </Card>

        {/* Montaje */}
        <Card className="bg-white dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Montaje Final</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={5}
              value={montaje}
              onChange={e => handleChange('montaje', e.target.value, setMontaje)}
              onBlur={e => handleBlur('montaje', e.target.value)}
              placeholder="Descripción del montaje final"
              className={inputClass}
            />
            {touched.montaje && errors.montaje && (
              <span className="text-red-500 text-sm block mt-2">{errors.montaje}</span>
            )}
          </CardContent>
        </Card>
      </div>

      <DashboardFooter />
    </div>
  );
}

export async function crearReceta(payload) {
  return await createRecipe(payload);
}

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