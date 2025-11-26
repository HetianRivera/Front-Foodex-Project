import { setAuthToken } from './client';

// Demo mode: bypass backend authentication and return a mock user/token
export async function loginRut(rut, role) {
  const data = {
    access: 'demo-access-token',
    rut,
    role,
    user: { id: 1, name: 'Demo User', role },
  };
  setAuthToken(data.access);
  try { localStorage.setItem('foodex_token', data.access); } catch {}
  return data;
}

export function clearAuth() {
  try { localStorage.removeItem('foodex_token'); } catch {}
  setAuthToken(null);
}