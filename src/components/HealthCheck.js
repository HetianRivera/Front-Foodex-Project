import { useEffect, useState } from 'react';

const BASE = (process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000').replace(/\/+$/, '');
// Asegura que no quede '/api' en la base al construir rutas de Swagger
const ROOT = BASE.replace(/\/api\/?$/, '');
// Ajusta esta ruta según tu backend (consulta Swagger):
// Ejemplos: '/health', '/api/v1/health/', '/status'
const PATH = '/swagger/?format=openapi';

export default function HealthCheck() {
  const [res, setRes] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const url = `${ROOT}${PATH}`;
    fetch(url, { mode: 'cors' })
      .then(async (r) => {
        let data = null;
        try { data = await r.json(); } catch {}
        setRes({ url, status: r.status, data });
      })
      .catch(setErr);
  }, []);

  if (err) return <pre>Error: {String(err)}</pre>;
  if (!res) return <p>Checking backend…</p>;
  return <pre>{JSON.stringify(res, null, 2)}</pre>;
}
