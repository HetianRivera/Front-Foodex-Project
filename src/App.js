import { useEffect, useState } from "react";
import { LoginPage } from "./components/LoginPage";
import { Dashboard } from "./components/Dashboard";
import { RecipeView } from "./components/RecipeView";
import { NewRecipePage } from "./components/NewRecipePage";
import { toast } from "sonner";
import HealthCheck from "./components/HealthCheck";
import { clearAuth, getStoredSession } from "./api/auth";

export default function App() {
  const [user, setUser] = useState(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [creatingNewRecipe, setCreatingNewRecipe] = useState(false);
  const [recipes, setRecipes] = useState([]);

  // Restaurar sesión si existe
  useEffect(() => {
    try {
      const { token, user: stored } = getStoredSession();
      if (token && stored) {
        const uiRole = (typeof localStorage !== 'undefined' && localStorage.getItem('foodex_ui_role')) || undefined;
        // Priorizar el rol seleccionado en UI si existe
        let role = uiRole || 'alumno';
        if (!uiRole && Array.isArray(stored.roles)) {
          // stored.roles ya viene normalizado a nombres (lowercase) cuando es posible
          const rolesLower = stored.roles.map(r => String(r).toLowerCase());
          role = rolesLower.includes('profesor') ? 'profesor' : (rolesLower.includes('alumno') ? 'alumno' : 'alumno');
        }
        const name = stored.nombre || stored.name || `${stored.nombre || ''} ${stored.apellido || ''}`.trim() || 'Usuario';
        setUser({ name, role, username: stored.username, rut: stored.rut, token, user: stored });
      }
    } catch {}
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    try { localStorage.removeItem('foodex_ui_role'); } catch {}
    clearAuth();
    setUser(null);
    setSelectedRecipeId(null);
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
      // Notificar límite alcanzado
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
        {/* Componente opcional para verificar conexión al backend */}
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
      onLogout={handleLogout}
      onSelectRecipe={handleSelectRecipe}
      onStartNewRecipe={handleStartNewRecipe}
    />
  );
}
