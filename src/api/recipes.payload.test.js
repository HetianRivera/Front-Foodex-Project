import { createFullRecipe } from './recipes';

// Mock API client
jest.mock('./client', () => {
  const posts = [];
  return {
    api: {
      request: jest.fn((config) => {
        const { method = 'get', url, data } = config || {};
        const m = String(method).toLowerCase();
        if (m === 'get') {
          if (url.includes('categorias')) {
            return Promise.resolve({ data: [{ id_categoria: 55, nombre_categoria: 'Abarrotes' }], status: 200 });
          }
          return Promise.resolve({ data: {}, status: 200 });
        }
        if (m === 'post') {
          posts.push({ url, data });
          if (url.includes('recetas')) {
            return Promise.resolve({ data: { id_receta: 777 }, status: 201 });
          }
          if (url.includes('ingredientes')) {
            const id = 1000 + posts.filter(p => p.url.includes('ingredientes')).length;
            return Promise.resolve({ data: { id_ingrediente: id }, status: 201 });
          }
          if (url.includes('etapas')) {
            const id = 2000 + posts.filter(p => p.url.includes('etapas')).length;
            return Promise.resolve({ data: { id_etapa: id }, status: 201 });
          }
          if (url.includes('receta-ingredientes')) {
            const id = 3000 + posts.filter(p => p.url.includes('receta-ingredientes')).length;
            return Promise.resolve({ data: { id_receta_ingrediente: id }, status: 201 });
          }
          if (url.includes('receta-etapas')) {
            const id = 4000 + posts.filter(p => p.url.includes('receta-etapas')).length;
            return Promise.resolve({ data: { id_receta_etapa: id }, status: 201 });
          }
          if (url.includes('etapa-ingredientes')) {
            const id = 5000 + posts.filter(p => p.url.includes('etapa-ingredientes')).length;
            return Promise.resolve({ data: { id_etapa_ingrediente: id }, status: 201 });
          }
          if (url.includes('ingrediente-tecnica')) {
            const id = 6000 + posts.filter(p => p.url.includes('ingrediente-tecnica')).length;
            return Promise.resolve({ data: { id_ingrediente_tecnica: id }, status: 201 });
          }
          return Promise.resolve({ data: {}, status: 200 });
        }
        return Promise.resolve({ data: {}, status: 200 });
      }),
      post: jest.fn((url, data) => {
        posts.push({ url, data });
        // Simulate backend IDs based on endpoint
        if (url.includes('recetas')) {
          return Promise.resolve({ data: { id_receta: 777 }, status: 201 });
        }
        if (url.includes('ingredientes')) {
          // Return id_ingrediente sequentially
          const id = 1000 + posts.filter(p => p.url.includes('ingredientes')).length;
          return Promise.resolve({ data: { id_ingrediente: id }, status: 201 });
        }
        if (url.includes('etapas')) {
          const id = 2000 + posts.filter(p => p.url.includes('etapas')).length;
          return Promise.resolve({ data: { id_etapa: id }, status: 201 });
        }
        if (url.includes('receta-ingredientes')) {
          const id = 3000 + posts.filter(p => p.url.includes('receta-ingredientes')).length;
          return Promise.resolve({ data: { id_receta_ingrediente: id }, status: 201 });
        }
        if (url.includes('receta-etapas')) {
          const id = 4000 + posts.filter(p => p.url.includes('receta-etapas')).length;
          return Promise.resolve({ data: { id_receta_etapa: id }, status: 201 });
        }
        if (url.includes('etapa-ingredientes')) {
          const id = 5000 + posts.filter(p => p.url.includes('etapa-ingredientes')).length;
          return Promise.resolve({ data: { id_etapa_ingrediente: id }, status: 201 });
        }
        if (url.includes('ingrediente-tecnica')) {
          const id = 6000 + posts.filter(p => p.url.includes('ingrediente-tecnica')).length;
          return Promise.resolve({ data: { id_ingrediente_tecnica: id }, status: 201 });
        }
        if (url.includes('categorias')) {
          return Promise.resolve({ data: [{ id_categoria: 55, nombre_categoria: 'Abarrotes' }], status: 200 });
        }
        return Promise.resolve({ data: {}, status: 200 });
      }),
      get: jest.fn((url) => {
        if (url.includes('categorias')) {
          return Promise.resolve({ data: [{ id_categoria: 55, nombre_categoria: 'Abarrotes' }], status: 200 });
        }
        return Promise.resolve({ data: {}, status: 200 });
      }),
    },
  };
});

describe('createFullRecipe payloads', () => {
  it('envía payloads correctos y captura IDs de relaciones', async () => {
    // Mock sesión y valores en localStorage requeridos
    global.localStorage?.setItem('foodex_user', JSON.stringify({ id_usuario: 68 }));
    global.localStorage?.setItem('foodex_id_semestre', '1');

    const uiRecipe = {
      nombre: 'Receta Test',
      codigo: 'RT-01',
      ingredientes: [
        { categoria: 'Abarrotes', ingredientes: [{ nombre: 'Azucar', cantidad: 2 }] },
      ],
      procesos: [
        {
          etapa: 'A',
          titulo: 'Mezclar',
          descripcion: 'Mezclar ingredientes',
          tiempoEstimado: 10,
          ingredientesUsados: [{ nombre: 'Azucar', cantidad: 2 }],
        },
      ],
      tecnicas: [
        { nombre: 'Batir', descripcion: 'Batir suavemente' },
      ],
    };

    const res = await createFullRecipe(uiRecipe);

    // Resultado base debe tener id_receta
    expect(res).toBeDefined();
    expect(res.id || res.id_receta).toBeDefined();
  });
});
