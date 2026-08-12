import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

// Aviso flotante de confirmacion. Uso: toast('Factura duplicada') desde cualquier sitio.
export function toast(message, type = 'ok') {
  window.dispatchEvent(new CustomEvent('presufact-toast', { detail: { message, type } }));
}

const ICONS = { ok: CheckCircle, error: AlertCircle, info: Info };
const STYLES = {
  ok: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-gray-800 text-white'
};

export default function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    let counter = 0;
    const onToast = (e) => {
      const id = ++counter;
      setToasts(prev => [...prev.slice(-2), { id, ...e.detail }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
    };
    window.addEventListener('presufact-toast', onToast);
    return () => window.removeEventListener('presufact-toast', onToast);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] space-y-2 pointer-events-none">
      {toasts.map(t => {
        const Icon = ICONS[t.type] || CheckCircle;
        return (
          <div key={t.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-[fadeIn_.2s_ease-out] ${STYLES[t.type] || STYLES.ok}`}>
            <Icon size={17} className="flex-shrink-0" />
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
