import { api, setAuthToken } from './client';

export async function loginRut(rut, role) {
  const { data } = await api.post('/auth/rut-login/', { rut, role });
  setAuthToken(data.access);
  localStorage.setItem('foodex_token', data.access);
  return data;
}