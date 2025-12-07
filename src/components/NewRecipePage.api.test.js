import { crearReceta } from './NewRecipePage';
import * as recipesApi from '../api/recipes';

// Mock del módulo de API de recetas
jest.mock('../api/recipes');

describe('crearReceta - POST a API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('envía payload a createRecipe y devuelve data', async () => {
    const payload = { codigo: 'REC-001', nombre: 'Hamburguesa' };
    const mockResp = { id: 'abc123', ...payload };
    recipesApi.createRecipe.mockResolvedValueOnce(mockResp);

    const data = await crearReceta(payload);

    expect(recipesApi.createRecipe).toHaveBeenCalledWith(payload);
    expect(data).toEqual(expect.objectContaining({ id: 'abc123', nombre: 'Hamburguesa' }));
  });

  test('propaga error de servidor (status y data)', async () => {
    const payload = { codigo: 'REC-002' };
    const error = { response: { status: 400, data: { error: 'Bad request' } } };
    recipesApi.createRecipe.mockRejectedValueOnce(error);

    await expect(crearReceta(payload)).rejects.toEqual(error);
    expect(recipesApi.createRecipe).toHaveBeenCalledWith(payload);
  });
});
