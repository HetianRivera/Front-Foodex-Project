# FOODEX App (CRA + Tailwind)

Aplicación web creada con Create React App (React 18) y Tailwind CSS. Incluye panel para alumnos/profesores, visualización de recetas, adjunto de documentos Word y mejora de estilos responsive para tablet.

## Requisitos
- Node.js LTS (recomendado >= 16)
- npm

## Instalación
```powershell
npm install
```

## Ejecutar en desarrollo (web)
```powershell
npm start
```
Se abre en `http://localhost:3000`.

### Ver desde una tablet en la misma red
1. Obtén tu IP local:
```powershell
ipconfig
```
Busca “Dirección IPv4” (ej. `192.168.1.34`).

2. Levanta el servidor accesible en la red:
```powershell
$env:HOST="0.0.0.0"; $env:PORT="3000"; npm start
```

3. En la tablet abre `http://<TU_IP_LOCAL>:3000` (ej.: `http://192.168.1.34:3000`). Si Windows pide permisos de firewall, permítelos.

## Tests
```powershell
npm test
```
Ejecuta las pruebas en modo interactivo (Jest + Testing Library). Hay una prueba básica en `src/App.test.js`.

## Build de producción
```powershell
npm run build
```
Genera la carpeta `build/` minificada y lista para desplegar.

## Estilos (Tailwind + utilidades)
- Tailwind configurado en `tailwind.config.js` y `postcss.config.js`.
- Estilos globales en `src/styles/globals.css` (incluye `@tailwind base`, `components`, `utilities` y variables CSS para tema claro/oscuro).
- Clases utilitarias combinadas con `tailwind-merge` y `clsx` (función `cn`).

## UI y librerías
- Componentes UI propios en `src/components/ui/*` (basados en Radix UI):
	- Dialog, Tabs, Checkbox, Accordion, Avatar, AspectRatio, etc.
- Iconos: `lucide-react`.
- Notificaciones: `sonner` (Toaster en `src/index.js`).
- Fechas: `react-day-picker` (calendario).

## Funcionalidades clave
- Login simple (`src/components/LoginPage.js`).
- Dashboard con tarjetas de recetas y estadísticas.
- Botón “+ Nueva Receta” para profesores: abre un modal para crear una receta rápida y adjuntar un archivo Word (`.doc`/`.docx`).
- Si la receta tiene documento adjunto, aparece el botón “Documento” para descargarlo/abrirlo.
- Vista de receta con pestañas (Proceso, Ingredientes, Técnicas, Montaje, Costos) y modal de utensilios.
- Botón de “Logout” ahora destacado con estilo “destructive” para mayor visibilidad.

## Cómo agregar una nueva receta (con archivo Word)
1. Inicia sesión como “Profesor”.
2. En el Dashboard, haz clic en “+ Nueva Receta”.
3. Completa “Código”, “Nombre” y opcionalmente “Categoría”.
4. Adjunta tu archivo Word (`.doc` o `.docx`) si quieres compartir el documento completo.
5. Guarda. La receta aparecerá en la grilla. Si adjuntaste archivo, verás el botón “Documento”.

Notas:
- El visor en navegador de `.doc/.docx` puede no ser compatible; se ofrece descarga o apertura en pestaña nueva.
- Los datos de ejemplo residen en `src/data/recipes.js`. Las recetas nuevas se agregan en memoria (estado de la app) para la demo.

## Estructura relevante
- `src/App.js`: estado global de usuario, recetas y navegación.
- `src/components/Dashboard.js`: listado, “+ Nueva Receta”, visor de documento, logout.
- `src/components/NewRecipeModal.js`: modal para crear receta y adjuntar Word.
- `src/components/DocViewerDialog.js`: diálogo para descargar/abrir documento.
- `src/components/RecipeView.js`: detalle con pestañas.
- `src/components/ui/*`: componentes base reutilizables.

## Dependencias
Consulta `requeriments.txt` para una lista plana de dependencias (`dependencies` y `devDependencies`) con versiones usadas en este proyecto.

## Solución de problemas
- “No se ven los estilos / Tailwind”: verifica que `src/index.js` importe `./styles/globals.css` (ya está hecho) y que hayas ejecutado `npm install`.
- Puerto 3000 ocupado:
```powershell
$env:PORT=3001; npm start
```
- Acceso desde tablet: asegúrate que PC y tablet están en la misma Wi‑Fi y permite el firewall al primer arranque.
- Si la instalación falla, reinstala limpio:
```powershell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

---
Proyecto iniciado con [Create React App](https://github.com/facebook/create-react-app).
