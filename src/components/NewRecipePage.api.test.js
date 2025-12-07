import axios from 'axios';
import { crearReceta } from './NewRecipePage';

// Asegura mock de axios (usará src/__mocks__/axios.js)
jest.mock('axios');

describe('crearReceta - POST a API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('envía payload a \/recetas\/ y devuelve data', async () => {
    const payload = { codigo: 'REC-001', nombre: 'Hamburguesa' };
    axios.post.mockResolvedValueOnce({ data: { id: 'abc123', ...payload } });

    const data = await crearReceta(payload);

    expect(axios.post).toHaveBeenCalledWith('/recetas/', payload);
    expect(data).toEqual(expect.objectContaining({ id: 'abc123', nombre: 'Hamburguesa' }));
  });

  test('propaga error de servidor (status y data)', async () => {
    const payload = { codigo: 'REC-002' };
    const error = { response: { status: 400, data: { error: 'Bad request' } } };
    axios.post.mockRejectedValueOnce(error);

    await expect(crearReceta(payload)).rejects.toEqual(error);
    expect(axios.post).toHaveBeenCalledWith('/recetas/', payload);
  });
});
