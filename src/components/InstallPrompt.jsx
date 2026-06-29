import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

// Shows a discreet "Install app" button when the browser allows installing the PWA.
// Helps users realise Presufact can live on their desktop like a real program.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('install-dismissed') === '1');

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  // Already installed (running standalone) → nothing to show
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone;
  if (standalone || dismissed || !deferred) return null;

  const install = async () => {
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted' || outcome === 'dismissed') setDeferred(null);
  };

  const close = () => {
    localStorage.setItem('install-dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 flex items-start gap-3">
        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Download size={20} className="text-accent" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">Instala Presufact</p>
          <p className="text-xs text-gray-500 mt-0.5">Tenlo como una app en tu escritorio. Funciona sin conexion.</p>
          <button onClick={install} className="mt-2 w-full px-3 py-1.5 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-medium transition">
            Instalar
          </button>
        </div>
        <button onClick={close} className="text-gray-400 hover:text-gray-600 transition flex-shrink-0">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
