
import { useEffect, useState } from "react";
import { LoginPage } from "./components/LoginPage";
import { Dashboard } from "./components/Dashboard";
import { RecipeView } from "./components/RecipeView";
import { NewRecipePage } from "./components/NewRecipePage";
import { toast } from "sonner";
import HealthCheck from "./components/HealthCheck";
import { clearAuth, getStoredSession } from "./api/auth";
import { listRecipes } from "./api/recipes";

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
  useEffect(() => {
    if (!user) return;

    const loadRecipesFromAPI = async () => {
      setLoadingRecipes(true);
      try {
        const data = await listRecipes();
        const recipesList = Array.isArray(data) ? data : (data?.results || []);
        setRecipes(recipesList);
      } catch (err) {
        console.error('Error cargando recetas:', err);
        toast.error('Error al cargar las recetas');
      } finally {
        setLoadingRecipes(false);
      }
    };

    loadRecipesFromAPI();
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
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
    setRecipes((prev) => [{ ...newRecipe }, ...prev]);
  };

  const handleStartNewRecipe = () => {
    if (recipes.length >= 10) {
      try {
        toast && toast.error("Límite de 10 recetas del semestre alcanzado");
      } catch {}
      return;
    }
    setCreatingNewRecipe(true);
  };

  const handleCancelNewRecipe = () => {
    setCreatingNewRecipe(false);
  };

  if (!user) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-2">Health Check (opcional)</h2>
          <HealthCheck />
        </div>
      </>
    );
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
          toast.success(`Receta "${payload.nombre}" guardada correctamente`);
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