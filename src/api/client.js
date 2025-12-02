import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000';

export const api = axios.create({
  baseURL: API_BASE,
  // Importante: no activar credenciales por defecto para evitar errores CORS si el backend
  // aún no expone Access-Control-Allow-Credentials correctamente. Actívelo sólo cuando
  // necesite cookies/sesión llamando a enableCredentials(true).
  withCredentials: false,
});

export function enableCredentials(flag = true) {
  api.defaults.withCredentials = !!flag;
}

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}