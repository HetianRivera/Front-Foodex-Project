import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LogOut, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { LogoFoodex } from './LogoFoodex';

// Complete logo SVG with chef hat graphic
function InlineLogo() {
  return (
    <div className="relative size-full rounded-lg p-2">
      <LogoFoodex className="w-full h-full" />
        <defs>
          <clipPath id="clip0_184_230">
            <rect fill="white" height="115" width="100" />
          </clipPath>
        </defs>
    </div>
  );
}

export function DashboardHeader({ user, onLogout, children, showWelcome = true }) {
    const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem("foodex_theme") === "dark";
    } catch {
      return false;
    }
  });
    useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      try { localStorage.setItem("foodex_theme", "dark"); } catch {}
    } else {
      root.classList.remove("dark");
      try { localStorage.setItem("foodex_theme", "light"); } catch {}
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  let semestreText;
  if (month >= 1 && month <= 2) {
    semestreText = `Período Vacaciones ${year}`;
  } else if (month >= 3 && month <= 6) {
    semestreText = `Semestre Otoño ${year}`;
  } else if (month >= 7 && month <= 12) {
    semestreText = `Semestre Primavera ${year}`;
  }
  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 shadow-lg">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 flex-shrink-0">
              <InlineLogo />
            </div>
            <div>
              <h1 className="text-3xl">FOODEX - Taller Gastronómico</h1>
              <p className="text-xl text-slate-300">{semestreText}</p>
            </div>
            <Button variant="secondary" size="lg" onClick={toggleTheme} className="p-4 transition-colors duration-500 ease-in-out" title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              {showWelcome && <p className="text-lg text-slate-300">Bienvenido/a</p>}
              <p className="text-2xl mb-2">Nicolás</p>
            </div>
            {onLogout && (
               <Button onClick={onLogout} size="lg" className="p-6 text-lg bg-red-700 hover:bg-red-900 text-white dark:bg-red-800 dark:hover:bg-red-700 transition-colors duration-300 ease-in-out">
                 <LogOut className="w-6 h-6" />
                 <span className="ml-2">Salir</span>
               </Button>
             )}
           </div>
        </div>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
