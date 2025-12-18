
import { useEffect, useState } from "react";
import { LoginPage } from "./components/LoginPage";
import { Dashboard } from "./components/Dashboard";
import { RecipeView } from "./components/RecipeView";
import { NewRecipePage } from "./components/NewRecipePage";
import { toast } from "sonner";
import { clearAuth, getStoredSession } from "./api/auth";
import { listRecipes, listUserRecipes } from "./api/recipes";

export default function App() {
  const [user, setUser] = useState(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [creatingNewRecipe, setCreatingNewRecipe] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  // Restaurar sesión si existe
  useEffect(() => {
    try {
      const { token, user: stored } = getStoredSession();
      if (token && stored) {
        const uiRole =
          (typeof localStorage !== "undefined" &&
            localStorage.getItem("foodex_ui_role")) || undefined;

        let role = uiRole || "alumno";
        if (!uiRole && Array.isArray(stored.roles)) {
          const rolesLower = stored.roles.map((r) => String(r).toLowerCase());
          role = rolesLower.includes("profesor")
            ? "profesor"
            : rolesLower.includes("alumno")
            ? "alumno"
            : "alumno";
        }

        const name =
          stored.nombre ||
          stored.name ||
          `${stored.nombre || ""} ${stored.apellido || ""}`.trim() ||
          "Usuario";

        setUser({
          name,
          role,
          username: stored.username,
          rut: stored.rut,
          token,
          user: stored,
        });
      }
    } catch {}

    const onUnload = () => {
      try {
        localStorage.removeItem("foodex_token");
      } catch {}
      try {
        localStorage.removeItem("foodex_user");
      } catch {}
      try {
        localStorage.removeItem("foodex_id_taller");
      } catch {}
      try {
        localStorage.removeItem("foodex_id_semestre");
      } catch {}
    };

    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  // ← AGREGAR: Cargar recetas del API cuando el usuario está autenticado
  // Cargar recetas del API cuando el usuario está autenticado.
  // Extraemos la función para poder llamarla tanto desde el efecto
  // como inmediatamente después del login.
  const loadRecipesFromAPI = async (u) => {
    setLoadingRecipes(true);
    try {
      // Intentar obtener id de usuario del objeto `user` o de localStorage
      let uid = u?.user?.id_usuario ?? u?.user?.id ?? null;
      if (!uid) {
        try {
          const raw = localStorage.getItem('foodex_user');
          if (raw) {
            const parsed = JSON.parse(raw);
            uid = parsed?.id_usuario ?? parsed?.id ?? uid;
          }
        } catch {}
      }

      let recipesList = [];
      if (uid) {
        recipesList = await listUserRecipes(uid);
      } else {
        const data = await listRecipes();
        recipesList = Array.isArray(data) ? data : (data?.results || []);
      }

      // Ordenar recetas: las más recientes primero.
      const getRecencyValue = (r) => {
        if (!r) return 0;
        // Intentar campos de fecha comunes
        const dateFields = ['fecha_creacion','fecha_creado','created_at','created','createdAt','fecha'];
        for (const f of dateFields) {
          const v = r[f];
          if (v) {
            const t = Date.parse(String(v));
            if (!Number.isNaN(t)) return t;
          }
        }
        // Si no hay fecha, usar id numérico como heurística (ids crecientes -> mayor = más reciente)
        const idVal = r?.id_receta ?? r?.id ?? r?.id_receta;
        if (idVal != null && !Number.isNaN(Number(idVal))) return Number(idVal);
        return 0;
      };

      const sorted = (recipesList || []).slice().sort((a, b) => getRecencyValue(b) - getRecencyValue(a));

      // Guardar todas las recetas recibidas (ordenadas por recencia)
      setRecipes(sorted);
    } catch (err) {
      console.error('Error cargando recetas:', err);
      toast.error('Error al cargar las recetas');
    } finally {
      setLoadingRecipes(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setRecipes([]);
      return;
    }
    loadRecipesFromAPI(user);
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    // Recargar recetas inmediatamente con la información del login
    try {
      loadRecipesFromAPI(userData);
    } catch (e) {
      // ignore - la carga también ocurrirá por el efecto
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("foodex_ui_role");
    } catch {}
    clearAuth();
    setUser(null);
    setSelectedRecipeId(null);
    setRecipes([]);
  };

  const handleSelectRecipe = (recipeId) => {
    setSelectedRecipeId(recipeId);
  };

  const handleBackToDashboard = () => {
    setSelectedRecipeId(null);
  };

  const handleAddRecipe = (newRecipe) => {
    // Normalizar respuesta del API (puede venir anidada en { receta, ... })
    const normalize = (item) => {
      if (!item) return item;
      const src = item.receta ? { ...(item.receta || {}), ...item } : { ...item };
      const obj = { ...src };
      obj.id_receta = obj.id_receta ?? obj.id ?? (item.receta && item.receta.id_receta) ?? null;
      obj.nombre = obj.nombre_receta ?? obj.nombre ?? obj.title ?? obj.nombre_receta;
      obj.codigo = obj.codigo_receta ?? obj.codigo ?? obj.code ?? null;
      obj.ingredientes = item.ingredientes ?? item.receta_ingredientes ?? obj.ingredientes ?? [];
      obj.procesos = item.etapas ?? item.receta_etapas ?? item.procesos ?? obj.procesos ?? [];
      obj.tecnicas = item.tecnicas ?? item.tecnica ?? obj.tecnicas ?? [];
      // Asegurar que tanto `id` como `id_receta` estén disponibles en el objeto
      if (!obj.id && obj.id_receta) obj.id = obj.id_receta;
      if (!obj.id_receta && obj.id) obj.id_receta = obj.id;
      return obj;
    };

    const normalized = normalize(newRecipe);
    setRecipes((prev) => [{ ...normalized }, ...prev]);
  };

  const handleStartNewRecipe = () => {
    // Ya no limitamos la creación de recetas — permitir siempre crear una nueva
    setCreatingNewRecipe(true);
  };

  const handleCancelNewRecipe = () => {
    setCreatingNewRecipe(false);
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (selectedRecipeId) {
    return (
      <RecipeView
        recipeId={selectedRecipeId}
        user={user}
        recipes={recipes}
        onBack={handleBackToDashboard}
        onLogout={handleLogout}
      />
    );
  }

  if (creatingNewRecipe) {
    return (
      <NewRecipePage
        onCancel={handleCancelNewRecipe}
        onSave={(payload) => {
          handleAddRecipe(payload);
          setCreatingNewRecipe(false);
          toast.success(`Receta "${payload.nombre}" registrada correctamente`);
        }}
        user={user}
        recipes={recipes}
      />
    );
  }

  return (
    <Dashboard
      user={user}
      recipes={recipes}
      loading={loadingRecipes}
      onLogout={handleLogout}
      onSelectRecipe={handleSelectRecipe}
      onStartNewRecipe={handleStartNewRecipe}
      onRecipeUpdated={(updated) =>
        setRecipes((prev) =>
          prev.map((r) =>
            r.id === updated.id || r.id_receta === updated.id_receta
              ? updated
              : r
          )
        )
      }
      onRecipeDeleted={(id) =>
        setRecipes((prev) =>
          prev.filter((r) => r.id !== id && r.id_receta !== id)
        )
      }
    />
  );
}