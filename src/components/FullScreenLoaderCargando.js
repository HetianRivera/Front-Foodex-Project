import { useEffect, useState } from 'react';
import { LogoFoodex } from './LogoFoodex';

export function FullScreenLoader({ show, text = 'Cargando...' }) {
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    if (!show) {
      setVisibleChars(0);
      return;
    }

    setVisibleChars(0);
    const interval = setInterval(() => {
      setVisibleChars(prev =>
        prev >= text.length ? 0 : prev + 1
      );
    }, 120); // velocidad de escritura

    return () => clearInterval(interval);
  }, [show, text]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        {/* Logo FOODEX */}
        <div className="w-40 h-40 relative">
          <LogoFoodex className="w-full h-full" />
        </div>

        {/* Texto con efecto de escritura */}
        <p className="text-lg text-white font-medium mt-4 tracking-[0.35em]">
          {text.slice(0, visibleChars) || '\u00A0'}
        </p>
      </div>
    </div>
  );
}
