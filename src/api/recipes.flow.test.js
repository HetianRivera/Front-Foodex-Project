import { createFullRecipe } from './recipes';
import { api } from './client';

// Mock directo del cliente API para controlar request/get/post
jest.mock('./client', () => {
  const api = {
    request: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
  };
  return { api, enableCredentials: jest.fn(), setAuthToken: jest.fn() };
});

describe('createFullRecipe - flujo de endpoints', () => {
  const callOrder = [];

  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;

    // Entorno y sesión
    process.env.REACT_APP_RECIPES_ENDPOINT = '/api/v1/recetas/';
    process.env.REACT_APP_TECHNIQUE_LINK_SCOPE = 'used';
    process.env.REACT_APP_SEMESTRE_ID = '1';
    localStorage.setItem('foodex_user', JSON.stringify({ id_usuario: 1 }));

    // Registro de orden
    api.request.mockImplementation(async (config) => {
      callOrder.push(['request', config.method?.toUpperCase(), config.url]);
      // Creación de receta
      return { data: { id_receta: 100, nombre_receta: 'X' }, status: 201 };
    });

    api.get.mockImplementation(async (url) => {
      callOrder.push(['get', url]);
      if (url === '/api/v1/unidades/') {
        return { data: [
          { id_unidad: 1, nombre_unidad: 'gramos' },
          { id_unidad: 2, nombre_unidad: 'kilogramos' },
          { id_unidad: 3, nombre_unidad: 'mililitros' },
          { id_unidad: 4, nombre_unidad: 'litros' },
          { id_unidad: 5, nombre_unidad: 'unidades' },
        ]};
      }
      if (url === '/api/v1/categorias/') {
        return { data: [
          { id_categoria: 10, nombre_categoria: 'Abarrotes' },
          { id_categoria: 11, nombre_categoria: 'Cárnicos' },
          { id_categoria: 12, nombre_categoria: 'Verduras' },
          { id_categoria: 13, nombre_categoria: 'Ovolácteos' },
          { id_categoria: 14, nombre_categoria: 'Licores' },
        ]};
      }
      return { data: [] };
    });

    api.post.mockImplementation(async (url, data) => {
      callOrder.push(['post', url]);
      if (url === '/api/v1/ingredientes/') {
        return { data: { id_ingrediente: 200, ...data }, status: 201 };
      }
      if (url === '/api/v1/etapas/') {
        return { data: { id_etapa: 300, ...data }, status: 201 };
      }
      if (url === '/api/v1/tecnicas/') {
        return { data: { id_tecnica: 400, ...data }, status: 201 };
      }
      if (url === '/api/v1/receta-ingredientes/') {
        return { data: { ok: true, ...data }, status: 201 };
      }
      if (url === '/api/v1/receta-etapas/') {
        return { data: { ok: true, ...data }, status: 201 };
      }
      if (url === '/api/v1/etapa-ingredientes/') {
        return { data: { ok: true, ...data }, status: 201 };
      }
      if (url === '/api/v1/ingrediente-tecnica/') {
        return { data: { ok: true, ...data }, status: 201 };
      }
      return { data: { ok: true }, status: 201 };
    });
  });

  test('llama endpoints en el orden esperado y con vínculos', async () => {
    const uiRecipe = {
      codigo: 'REC-001',
      nombre: 'Prueba',
      categoria: 'Abarrotes',
      montaje: 'Emplatado',
      ingredientes: [
        {
          categoria: 'Abarrotes',
          ingredientes: [ { nombre: 'Sal', cantidad: 5, unidad: 'gr', tiempoCoccion: 0 } ],
        },
      ],
      procesos: [
        {
          etapa: 'A',
          titulo: 'Mezclar',
          descripcion: 'Mezclar todo',
          tiempoEstimado: 1,
          ingredientesUsados: [ { nombre: 'Sal', cantidad: 5, unidad: 'gr' } ],
        },
      ],
      tecnicas: [
        { nombre: 'Tostado', descripcion: 'Tostar ligeramente' }
      ],
    };

    const res = await createFullRecipe(uiRecipe);

    expect(res).toEqual(expect.objectContaining({ id_receta: 100 }));

    // Verificar orden básico de alto nivel
    const orderStrings = callOrder.map(x => x.join(' '));
    // 1) Crear receta
    expect(orderStrings[0]).toBe('request POST /api/v1/recetas/');
    // 2) Prefetch catálogos
    expect(orderStrings).toContain('get /api/v1/unidades/');
    expect(orderStrings).toContain('get /api/v1/categorias/');
    // 3) Crear ingrediente
    expect(orderStrings).toContain('post /api/v1/ingredientes/');
    // 4) Crear etapa
    expect(orderStrings).toContain('post /api/v1/etapas/');
    // 5) Crear técnica (opcional)
    expect(orderStrings).toContain('post /api/v1/tecnicas/');
    // 6) Enlaces: receta-ingredientes
    expect(orderStrings).toContain('post /api/v1/receta-ingredientes/');
    // 7) Enlaces: receta-etapas
    expect(orderStrings).toContain('post /api/v1/receta-etapas/');
    // 8) Enlaces: etapa-ingredientes
    expect(orderStrings).toContain('post /api/v1/etapa-ingredientes/');
    // 9) Enlaces: ingrediente-tecnica (scope=used)
    expect(orderStrings).toContain('post /api/v1/ingrediente-tecnica/');
  });
});
