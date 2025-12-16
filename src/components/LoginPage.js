import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { FullScreenLoader } from './FullScreenLoader';
import { DashboardFooter } from './DashboardFooter';
import { LogoFoodex } from './LogoFoodex';
import { loginWithTokenEndpoint } from '../api/auth';
import { Moon, Sun} from 'lucide-react';

export function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    setUsernameError(value.trim() ? '' : 'Usuario requerido');
  };
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
      try { localStorage.setItem("foodex_theme", "dark"); } catch { }
    } else {
      root.classList.remove("dark");
      try { localStorage.setItem("foodex_theme", "light"); } catch { }
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

    const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !username.trim()) { setUsernameError('Usuario requerido'); return; }
    if (!password || password.length < 4) { setPasswordError('Ingresa tu contraseña'); return; }
    setIsLoading(true);
    try {
      // Autenticación real contra backend con username+password
      const resp = await loginWithTokenEndpoint(username.trim(), password);
      const u = resp?.user || {};
      const roleFromApi = Array.isArray(u.roles) ? (u.roles.some(r => String(r).toLowerCase().includes('profesor')) ? 'profesor' : 'alumno') : undefined;
      const role = selectedRole || roleFromApi || 'alumno';
      try { localStorage.setItem('foodex_ui_role', role); } catch { }
      const name = u.nombre || u.name || `${u.nombre || ''} ${u.apellido || ''}`.trim() || 'Usuario';
      onLogin({
        name,
        role,
        username: username.trim(),
        token: resp?.access || null,
        user: u,
      });
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || '';
      if (status === 404 || status === 400 || /no encontrado|inválido/i.test(detail)) {
        setUsernameError('Usuario no válido');
      } else {
        setUsernameError('Error al validar el usuario. Intenta nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-500 ease-in-out">
      <FullScreenLoader show={isLoading} />
      <div className="flex justify-center mb-4 margin-top-8 pt-8 px-4">
        <Button
          variant="secondary"
          onClick={toggleTheme}
          className="w-full max-w-xs h-11 transition-colors duration-500 ease-in-out"
          title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
      </div>
      <div className='flex-1 w-full max-w-6xl mx-auto px-4 py-6 flex items-center justify-center'>
        <Card className="bg-white dark:bg-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl p-16 max-w-4xl w-full text-center transition-colors duration-500 ease-in-out">
          <CardHeader className="text-center space-y-3 pb-8">
            <div className="w-40 h-40 mx-auto mb-4">
              <LogoFoodex className="w-full h-full" />
            </div>
            <CardDescription className="text-sm italic text-gray-400 mb-8 dark:text-slate-300 transition-colors duration-500 ease-in-out" style={{ fontFamily: "calibri, sans-serif", fontWeight: 500 }}>
              El sabor de siempre, en formato digital
            </CardDescription>
            <CardTitle className="text-2xl mb-8 text-slate-700 dark:text-slate-200 whitespace-nowrap transition-colors duration-500 ease-in-out">FOODEX - Taller Gastronómico</CardTitle>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label className="block text-xl text-slate-700 dark:text-slate-200 mb-4 text-left transition-colors duration-500 ease-in-out">Usuario</label>
                <Input
                  type="text"
                  placeholder="Tu usuario"
                  value={username}
                  onChange={handleUsernameChange}
                  required
                  className={'w-full px-6 py-6 text-4xl rounded-xl focus:outline-none transition-colors bg-gray-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 placeholder:text-xl transition-colors duration-500 ease-in-out' + (usernameError ? 'border-2 border-red-500' : '')}
                />
                {usernameError && (
                  <p className="text-red-600 text-lg mt-2 text-left">{usernameError}</p>
                )}
              </div>

              <div>
                <label className="block text-xl text-slate-700 dark:text-slate-200 mb-4 text-left transition-colors duration-500 ease-in-out">Contraseña</label>
                <Input
                  type="password"
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
                  required
                  className={'w-full px-6 py-6 text-4xl rounded-xl focus:outline-none transition-colors bg-gray-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 placeholder:text-xl transition-colors duration-500 ease-in-out' + (passwordError ? 'border-2 border-red-500' : '')}
                />
                {passwordError && (
                  <p className="text-red-600 text-lg mt-2 text-left">{passwordError}</p>
                )}
              </div>

              <div className="space-y-4">
                <label className="text-xl"></label>
                <div className="grid grid-cols-2 gap-8 mb-12">
                  <button type="button" onClick={() => setSelectedRole('alumno')} className={`p-10 rounded-2xl border-4 transition-all ${selectedRole === 'alumno' ? 'border-red-600 bg-red-50' : 'border-gray-300 hover:border-red-600'}`}>
                    <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${selectedRole === 'alumno' ? 'bg-red-600' : 'bg-gray-200'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-graduation-cap w-12 h-12 ${selectedRole === 'alumno' ? 'text-white' : 'text-gray-600'}`} aria-hidden="true">
                        <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
                        <path d="M22 10v6"></path>
                        <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
                      </svg>
                    </div>
                    <p className={`text-2xl text-center transition-colors duration-500 ease-in-out ${selectedRole === "alumno" ? "text-slate-900 dark:text-slate-black" : "text-slate-900 dark:text-white"}`}>
                      Alumno
                    </p>
                  </button>

                  <button type="button" onClick={() => setSelectedRole('profesor')} className={`p-10 rounded-2xl border-4 transition-all ${selectedRole === 'profesor' ? 'border-red-600 bg-red-50' : 'border-gray-300 hover:border-red-600'}`}>
                    <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${selectedRole === 'profesor' ? 'bg-red-600' : 'bg-gray-200'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-book-open w-12 h-12 ${selectedRole === 'profesor' ? 'text-white' : 'text-gray-600'}`} aria-hidden="true">
                        <path d="M12 7v14"></path>
                        <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
                      </svg>
                    </div>
                    <p className={`text-2xl text-center transition-colors duration-500 ease-in-out ${selectedRole === "profesor" ? "text-slate-900 dark:text-slate-black" : "text-slate-900 dark:text-white"}`}>
                      Profesor
                    </p>
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-red-600 text-white py-10 rounded-xl hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-2xl"
                disabled={!username || !!usernameError || !selectedRole}>
                Iniciar Sesión
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <DashboardFooter />
    </div>
  );
}
