# FOODEX App (CRA + Tailwind)

Aplicación web desarrollada con Create React App (React 18) y Tailwind CSS, diseñada para que alumnos y profesores puedan acceder al sistema Foodex de forma rápida y sencilla.
Incluye pantallas de inicio de sesión, dashboard, visualización de recetas, componentes interactivos basados en Radix UI y un diseño responsivo optimizado para uso en tablets dentro de talleres gastronómicos.

---

## Requisitos
| Componente / Herramienta | Versión recomendada | ¿Para qué sirve? |
|--------------------------|---------------------|------------------|
| Node.js | 16+ (LTS recomendado) | Permite ejecutar React y los comandos npm. |
| npm (incluido con Node) | 8+ | Maneja las dependencias del proyecto. |
| Visual Studio Code | Última versión |	Editor recomendado para abrir el proyecto y usar la terminal integrada. |
| Extensión VS Code: JavaScript/TypeScript | Opcional | Mejora la experiencia al editar código React. |
| Google Chrome / Edge | Última versión | Navegador donde se visualizará la app. |
| Backend Foodex activo | URL configurada en .env |	La app necesita conectarse al backend para login y datos reales. |

---

## Instalación y configuración
### Clonar el repositorio
```
git clone https://github.com/Proyecto-Integrado-Foodex/ProyectoIntegrado_Front
cd ProyectoIntegrado_Front
```

### Instalar dependencias
En la carpeta raíz del proyecto:
```
npm install
```
Esto instala React, Tailwind, Axios, Radix UI, sonner, lucide-react, etc.

### Configurar variables de entorno (.env)
Crear un archivo .env en la raíz del proyecto con:
```
REACT_APP_API_BASE=http://localhost:8000
REACT_APP_DEBUG_API=true
```
- REACT_APP_API_BASE = URL del backend Foodex.
Si se modifica el .env, se debe reiniciar el servidor con CTRL + C y npm start.

---

## Ejecutar el proyecto
### Ejecutar en modo desarrollo (web)
```powershell
npm start
```

La aplicación se abrirá automáticamente en:
```
http://localhost:3000
```

## Ver desde una tablet en la misma red
### Obtén tu IP local:
```powershell
ipconfig
```
Busca “Dirección IPv4” (ej. `192.168.1.34`).

### Levanta el servidor accesible en la red:
```powershell
$env:HOST="0.0.0.0"; $env:PORT="3000"; npm start
```

### En la tablet abre:
```
http://<TU_IP_LOCAL>:3000 
``` 
(Ejemplo: `http://192.168.1.34:3000`). 
Si Windows pide permisos de firewall, permítelos.

---

## Tests (Pruebas del proyecto)
El proyecto incluye pruebas automáticas para verificar que algunas partes del frontend funcionan correctamente.
Estas pruebas usan dos herramientas:
- Jest → ejecuta las pruebas.
- React Testing Library → simula componentes, botones, textos, etc.

En la terminal se debe ejecutar:
```powershell
npm test
```
Después de ejecutarlo:
Se abrirá un panel interactivo en la consola, el cual, mostrará automáticamente:
- si las pruebas pasaron
- si fallaron
- y qué parte del código tienen problemas.

Por defecto el proyecto trae una prueba básica ubicada en:
```
src/App.test.js
```
Esta prueba generalmente verifica que el componente principal (App.js) se pueda cargar sin errores.

---

## Build de producción
Cuando el proyecto ya está listo y quieres generar una versión final optimizada, que sea más rápida y ligera para producción, debes ejecutar:

```powershell
npm run build
```
Genera la carpeta `build/` minificada y lista para desplegar.

---

## Estilos (Tailwind + utilidades)
- Tailwind configurado en `tailwind.config.js` y `postcss.config.js`.
- Estilos globales en `src/styles/globals.css` (incluye `@tailwind base`, `components`, `utilities` y variables CSS para tema claro/oscuro).
- Clases utilitarias combinadas con `tailwind-merge` y `clsx` (función `cn`).

| Elemento | ¿Para qué sirve? |
|----------|------------------|
| Configuración de Tailwind (tailwind.config.js y postcss.config.js) |	Activa y configura Tailwind para que el proyecto pueda usar clases de diseño. |
| Estilos globales (src/styles/globals.css) |	Carga los estilos base de Tailwind y define el estilo general de toda la aplicación. |
| Clases utilitarias combinadas (tailwind-merge + clsx (función cn)) |	Combina clases CSS de forma limpia y evita conflictos entre estilos. |

Estas herramientas permiten crear una interfaz moderna y clara sin construir todo desde cero, mejoran la experiencia del usuario y garantizan una comunicación eficiente con el backend.

---

## Componentes UI (Radix UI) y librerías
### Componentes UI (Radix UI)
-Estos componentes se encuentran en: `src/components/ui/*`.

| Componente (Radix UI) | ¿Para qué sirve? |
|-----------------------|------------------|
| Dialog | Crear ventanas modales para formularios o mostrar información. |
| Tabs | Organizar contenido en pestañas (por ejemplo, secciones de una receta). |
| Accordion | Mostrar secciones que se pueden expandir y colapsar. |
| Checkbox | Casillas de selección dentro de formularios o filtros. |
| Avatar | Mostrar la imagen o iniciales del usuario. |
| AspectRatio | Mantener proporciones correctas en imágenes o videos. |
| Otros (Slot, etc.) | Ayudan a crear componentes reutilizables y flexibles. |

### Librerías adicionales

| Librería | ¿Para qué  sirve? |
|----------|-------------------|
| lucide-react  | Proporciona iconos modernos usados en botones, menús y UI.  |
| sonner | Muestra notificaciones (éxito, error, info). El Toaster está configurado en `src/index.js`. |
| react-day-picker | Ofrece un calendario visual para seleccionar fechas en la interfaz. |
| Axios | Permite comunicar el frontend con el backend (llamadas a la API). |

---

## Funcionalidades clave
### Login simple (`src/components/LoginPage.js`).
Permite que profesores y alumnos ingresen al sistema.

### Dashboard con tarjetas de recetas y estadísticas.
Muestra las recetas disponibles en formato de tarjetas y permite acceder a acciones principales.

### Botón “+ Nueva Receta” (creación de recetas)
Abre la página de creación de receta, donde el profesor puede ingresar:
| Campo                  | ¿Para qué sirve? |
|------------------------|------------------|
| Nombre de la receta    | Identifica la receta. |
| Código | Ordena y clasifica la receta de forma única. |
| Categoría | Agrupa la receta según su tipo. |
| Argumentación comercial | Explica el propósito o valor del plato. |
| Tiempo | Indica cuánto tarda la preparación. |
| Ingredientes | Lista lo necesario para elaborar la receta. |
| Técnicas | Define los métodos culinarios que se aplican. |
| Etapas del proceso | Describe los pasos para preparar la receta. |

### Exportar Word
Una vez completados los datos, el profesor puede generar una ficha en formato (.docx) usando el botón “Exportar Word”.
- El documento se crea automáticamente usando la librería docx.
- Se descarga directamente en el navegador del usuario.

### Vista de receta con pestañas
La información de la receta se organiza en secciones:
| Sección      | ¿Para qué sirve? |
|--------------|------------------|
| Proceso | Describe paso a paso cómo se prepara la receta. |
| Ingredientes | Muestra los insumos necesarios para elaborar el plato. |
| Técnicas | Indica los métodos culinarios aplicados en la preparación. |
| Montaje | Explica cómo debe presentarse o emplatarse el plato. |

### Modal de utensilios
Permite visualizar de forma agrupada los utensilios necesarios para preparar la receta.

### Botón de Logout
Ubicado de forma visible y con estilo destructive para facilitar el cierre de sesión.

---

## Cómo agregar una nueva receta
1. Inicia sesión como “Profesor”.
2. En el Dashboard, haz clic en “+ Nueva Receta”.
3. Completa los campos principales de la receta (Código, Nombre, Categoría, Argumentación comercial, Tiempo, Ingredientes, Técnicas y Etapas del proceso).
4. Presiona “Guardar” para registrar la receta en el sistema.
5. Si quieres generar la ficha en formato Word, haz clic en el botón “Exportar Word”.
- Se descargará un archivo .docx con los datos de la receta (datos generales, ingredientes, técnicas, etc.).

Notas:
- El archivo Word se genera automáticamente en el navegador usando la información que ingresaste en la receta.
- Dependiendo del navegador, el .docx puede abrirse directamente en Word o descargarse a la carpeta de descargas.

---

## Estructura relevante
| Archivo / Carpeta | ¿Para qué sirve? |
|-------------------|------------------|
| `src/App.js` | Controla el estado global y la navegación. |
| `src/components/Dashboard.js` | Muestra las recetas y las acciones principales. |
| `src/components/NewRecipeModal.js` | Modal antiguo para crear recetas (ya no se usa con Word). |
| `src/components/DocViewerDialog.js` | Permite abrir o descargar documentos Word de recetas antiguas. |
| `src/components/RecipeView.js` | Muestra el detalle de una receta en pestañas. |
| `src/components/ui/*` | Componentes base reutilizables para la interfaz. |

El proyecto organiza sus componentes según su función: App.js maneja el estado general, Dashboard y RecipeView gestionan la visualización de recetas, algunos módulos antiguos se mantienen por compatibilidad, y la carpeta ui reúne componentes reutilizables que aseguran una interfaz consistente.

---

## Solución de problemas
### Tailwind no aplica estilos
Verificar:
- Falta importar los estilos globales:
El archivo src/index.js debe incluir esta línea:
```
import "./styles/globals.css";
```
Este archivo es el que activa Tailwind en todo el proyecto.
Si no está importado, la aplicación no mostrará estilos correctamente.

- No ejecutaste las dependencias:
Debes asegurarte de haber instalado todo con:
```
npm install
```
Esto descarga todas las librerías necesarias del proyecto, incluyendo Tailwind, React y los componentes UI.

### Puerto 3000 ocupado:
Si aparece un mensaje indicando que el puerto 3000 ya está en uso, significa que otra aplicación está utilizando ese puerto.

Puedes iniciar el servidor en otro puerto usando:
```powershell
$env:PORT=3001; npm start
```
### Acceso desde tablet: 
- Asegúrate de que ambos dispositivos estén en la misma Wi-Fi.
- Verifica que el frontal se esté ejecutando con host 0.0.0.0.
- Permite el firewall de Windows.


### Problemas de instalación
Instalación limpia:
```powershell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```
Esto hará:

1. Borrar dependencias antiguas
2. Borrar la configuración de bloqueo
3. Instalar todo nuevamente desde cero

Después de esto, el proyecto debe funcionar sin problemas.

## Finalizar ejecución
Para detener el servidor:
```
CTRL + C
```


---

## Proyecto iniciado con [Create React App] (https://github.com/facebook/create-react-app).
