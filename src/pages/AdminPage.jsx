import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Lock, LogOut, RefreshCw, CheckCircle, RotateCcw, Trash2, Inbox } from 'lucide-react';

// Panel de administracion de tickets. La proteccion REAL esta en el servidor:
// /api/tickets exige el ADMIN_TOKEN en cada peticion (401 sin el). Esta pagina
// solo guarda el token en este navegador para no teclearlo cada vez.
const TOKEN_KEY = 'presufact-admin-token';

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [input, setInput] = useState('');
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Admin · Presufact';
    // no indexar jamas
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); document.title = 'Presufact — Crear facturas y presupuestos gratis, sin registro'; };
  }, []);

  const load = async (tk = token) => {
    if (!tk) return;
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/tickets', { headers: { Authorization: `Bearer ${tk}` } });
      if (r.status === 401) {
        setError('Token incorrecto');
        localStorage.removeItem(TOKEN_KEY);
        setToken('');
        setTickets(null);
        return;
      }
      if (r.status === 503) { setError('El buzón no está configurado todavía (faltan las variables de entorno en Vercel).'); return; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      setTickets(data.tickets || []);
    } catch (e) {
      setError('No se pudo cargar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) load(token); }, []);

  const login = () => {
    const tk = input.trim();
    if (!tk) return;
    localStorage.setItem(TOKEN_KEY, tk);
    setToken(tk);
    setInput('');
    load(tk);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setTickets(null);
  };

  const action = async (method, body) => {
    try {
      const r = await fetch('/api/tickets', {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      load();
    } catch (e) {
      setError('Acción fallida: ' + e.message);
    }
  };

  const abiertos = (tickets || []).filter(t => t.estado === 'abierto');
  const resueltos = (tickets || []).filter(t => t.estado !== 'abierto');

  const ticketCard = (t) => (
    <div key={t.id} className={`border rounded-xl p-4 ${t.estado === 'abierto' ? 'border-amber-200 bg-amber-50/40' : 'border-gray-200 bg-white opacity-70'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-semibold text-gray-800">{t.asunto}</div>
          <div className="text-xs text-gray-400">
            {new Date(t.fecha).toLocaleString('es-ES')}{t.email ? <> · <a href={`mailto:${t.email}`} className="text-accent hover:underline">{t.email}</a></> : ' · sin email'}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {t.estado === 'abierto' ? (
            <button onClick={() => action('PATCH', { id: t.id, estado: 'resuelto' })}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-medium transition">
              <CheckCircle size={13} /> Resolver
            </button>
          ) : (
            <button onClick={() => action('PATCH', { id: t.id, estado: 'abierto' })}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs transition">
              <RotateCcw size={13} /> Reabrir
            </button>
          )}
          <button onClick={() => { if (window.confirm('¿Borrar este ticket definitivamente?')) action('DELETE', { id: t.id }); }}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{t.mensaje}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">Presufact · Admin</span>
          </Link>
          {token && (
            <div className="flex items-center gap-2">
              <button onClick={() => load()} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition disabled:opacity-50">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
              </button>
              <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-sm transition">
                <LogOut size={14} /> Salir
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {!token ? (
          <div className="max-w-sm mx-auto mt-16 bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <Lock size={32} className="mx-auto text-gray-300 mb-4" />
            <h1 className="text-lg font-bold text-gray-800">Acceso de administración</h1>
            <p className="text-sm text-gray-500 mt-1 mb-5">Introduce tu token de administrador.</p>
            <input type="password" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none font-mono"
              placeholder="ADMIN_TOKEN" autoFocus />
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            <button onClick={login} className="mt-4 w-full px-4 py-2.5 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-semibold transition">
              Entrar
            </button>
          </div>
        ) : (
          <>
            {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
            {tickets === null && !error ? (
              <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>
            ) : tickets !== null && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Inbox size={18} className="text-accent" /> Abiertos ({abiertos.length})
                </h2>
                {abiertos.length === 0 ? (
                  <p className="text-sm text-gray-400 mb-6">Sin tickets abiertos. 🎉</p>
                ) : (
                  <div className="space-y-3 mb-8">{abiertos.map(ticketCard)}</div>
                )}
                {resueltos.length > 0 && (
                  <>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Resueltos ({resueltos.length})</h2>
                    <div className="space-y-3">{resueltos.map(ticketCard)}</div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
