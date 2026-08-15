import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, Lock, LogOut, RefreshCw, CheckCircle, RotateCcw, Trash2, Inbox, Sparkles, Activity, Globe, ShieldCheck, Clock, Mail, Bug, Lightbulb, HelpCircle, ArrowUpRight, ArrowDownRight, LifeBuoy } from 'lucide-react';
import { Sparkline, Donut, HBarList, BarChart } from '../components/Charts';
import { getDemoTickets, updateDemoTicket, deleteDemoTicket, resetDemoTickets, getTraficoDemo, getSaludDemo } from '../utils/adminDemo';

// Panel de administracion.
// - Modo REAL: la proteccion esta en el servidor (/api/tickets exige ADMIN_TOKEN;
//   401 sin el). Aqui solo se guarda el token en este navegador.
// - Modo DEMO (?demo=1 o boton en la puerta): sin token, con tickets de ejemplo,
//   trafico agregado y salud del servicio ficticios, etiquetados como tales.
const TOKEN_KEY = 'presufact-admin-token';
const TITULO_DEFECTO = 'Presufact — Presupuestos y facturas en PDF gratis, sin registro';

const TIPO = {
  bug: { label: 'Fallo', icon: Bug, cls: 'bg-red-50 text-red-600' },
  sugerencia: { label: 'Sugerencia', icon: Lightbulb, cls: 'bg-amber-50 text-amber-700' },
  duda: { label: 'Duda', icon: HelpCircle, cls: 'bg-blue-50 text-blue-600' },
};

const fmtDur = (ms) => {
  const h = ms / 3600000;
  if (h < 1) return `${Math.max(1, Math.round(ms / 60000))} min`;
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0).replace('.', ',')} h`;
  return `${(h / 24).toFixed(1).replace('.', ',')} d`;
};
const fmtInt = (n) => n.toLocaleString('es-ES', { useGrouping: 'always' });

function kpisSoporte(tickets) {
  const abiertos = tickets.filter(t => t.estado === 'abierto');
  const hace30 = Date.now() - 30 * 86400000;
  const resueltos30 = tickets.filter(t => t.estado === 'resuelto' && new Date(t.actualizado || t.fecha).getTime() >= hace30);
  const conTiempo = tickets.filter(t => t.estado === 'resuelto' && t.actualizado);
  const media = conTiempo.length ? conTiempo.reduce((s, t) => s + (new Date(t.actualizado) - new Date(t.fecha)), 0) / conTiempo.length : null;
  const conEmail = tickets.filter(t => t.email).length;
  const masAntiguo = abiertos.length ? Math.min(...abiertos.map(t => new Date(t.fecha).getTime())) : null;
  return {
    abiertos: abiertos.length,
    resueltos30: resueltos30.length,
    tiempoMedio: media === null ? '—' : fmtDur(media),
    respondibles: tickets.length ? Math.round((conEmail / tickets.length) * 100) : 0,
    esperaMax: masAntiguo ? fmtDur(Date.now() - masAntiguo) : '—',
  };
}

export default function AdminPage() {
  const [params, setParams] = useSearchParams();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [demo, setDemo] = useState(() => params.get('demo') === '1');
  const [input, setInput] = useState('');
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('abiertos'); // abiertos | resueltos | todos
  const [tipoFiltro, setTipoFiltro] = useState('todos');

  useEffect(() => {
    document.title = 'Admin · Presufact';
    const meta = document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); document.title = TITULO_DEFECTO; };
  }, []);

  // ---- carga ----
  const loadDemo = () => { setTickets(getDemoTickets()); setError(''); };

  const loadReal = async (tk = token) => {
    if (!tk) return;
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/tickets', { headers: { Authorization: `Bearer ${tk}` } });
      if (r.status === 401) { setError('Token incorrecto'); localStorage.removeItem(TOKEN_KEY); setToken(''); setTickets(null); return; }
      if (r.status === 503) { setError('El buzón real no está configurado todavía (faltan las variables de entorno en Vercel). Puedes ver el panel en modo demo.'); return; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      setTickets(data.tickets || []);
    } catch (e) {
      setError('No se pudo cargar: ' + e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (demo) loadDemo(); else if (token) loadReal(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  const entrarDemo = () => { setDemo(true); setParams({ demo: '1' }, { replace: true }); };
  const salirDemo = () => { setDemo(false); setTickets(null); setParams({}, { replace: true }); };
  const login = () => { const tk = input.trim(); if (!tk) return; localStorage.setItem(TOKEN_KEY, tk); setToken(tk); setInput(''); loadReal(tk); };
  const logout = () => { localStorage.removeItem(TOKEN_KEY); setToken(''); setTickets(null); };

  const action = async (method, body) => {
    if (demo) {
      if (method === 'PATCH') updateDemoTicket(body.id, { estado: body.estado });
      if (method === 'DELETE') deleteDemoTicket(body.id);
      loadDemo();
      return;
    }
    try {
      const r = await fetch('/api/tickets', { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      loadReal();
    } catch (e) { setError('Acción fallida: ' + e.message); }
  };

  // ---- derivados ----
  const kpis = useMemo(() => kpisSoporte(tickets || []), [tickets]);
  const trafico = useMemo(() => demo ? getTraficoDemo() : null, [demo]);
  const salud = useMemo(() => demo ? getSaludDemo() : null, [demo]);
  const porTipo = useMemo(() => {
    const t = tickets || [];
    return ['duda', 'bug', 'sugerencia'].map(k => ({ key: k, label: TIPO[k].label, value: t.filter(x => (x.tipo || 'duda') === k).length }));
  }, [tickets]);
  const ultimos14 = useMemo(() => {
    const t = tickets || [];
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() - (13 - i) * 86400000);
      const key = d.toISOString().split('T')[0];
      return { label: i % 2 === 0 ? `${d.getDate()}` : '', value: t.filter(x => (x.fecha || '').startsWith(key)).length };
    });
  }, [tickets]);

  const visibles = (tickets || [])
    .filter(t => filtro === 'todos' ? true : filtro === 'abiertos' ? t.estado === 'abierto' : t.estado !== 'abierto')
    .filter(t => tipoFiltro === 'todos' ? true : (t.tipo || 'duda') === tipoFiltro);

  const activo = demo || !!token;

  // ---- UI ----
  const ticketCard = (t) => {
    const tp = TIPO[t.tipo || 'duda'];
    return (
      <div key={t.id} className={`border rounded-xl p-4 ${t.estado === 'abierto' ? 'border-amber-200 bg-amber-50/40' : 'border-gray-200 bg-white opacity-80'}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800">{t.asunto}</span>
              {t.tipo && <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${tp.cls}`}><tp.icon size={11} /> {tp.label}</span>}
              {t.local && <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-violet-100 text-violet-700">enviado desde esta demo</span>}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {new Date(t.fecha).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
              {t.email ? <> · <a href={`mailto:${t.email}`} className="text-accent hover:underline">{t.email}</a></> : ' · sin email'}
              {t.estado !== 'abierto' && t.actualizado && <> · resuelto en {fmtDur(new Date(t.actualizado) - new Date(t.fecha))}</>}
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
              aria-label="Borrar ticket" title="Borrar ticket"
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{t.mensaje}</p>
      </div>
    );
  };

  const Kpi = ({ label, value, sub, icon: Icon, tone = 'text-accent bg-blue-50', trend }) => (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</span>
        <span className={`p-1.5 rounded-lg ${tone}`}><Icon size={14} /></span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-extrabold text-gray-900 tabular-nums">{value}</span>
        {trend !== undefined && trend !== null && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(trend)} %
          </span>
        )}
      </div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition min-w-0">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold truncate">Presufact · Admin</span>
            {demo && <span className="ml-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold uppercase tracking-wide">demo</span>}
          </Link>
          {activo && (
            <div className="flex items-center gap-2">
              {demo ? (
                <>
                  <button onClick={() => { resetDemoTickets(); loadDemo(); }} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition">
                    <RefreshCw size={14} /> Reiniciar demo
                  </button>
                  <button onClick={salirDemo} className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition">
                    <LogOut size={14} /> Salir
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => loadReal()} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition disabled:opacity-50">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
                  </button>
                  <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-sm transition">
                    <LogOut size={14} /> Salir
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {!activo ? (
          <div className="max-w-sm mx-auto mt-16 bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <Lock size={32} className="mx-auto text-gray-300 mb-4" />
            <h1 className="text-lg font-bold text-gray-800">Acceso de administración</h1>
            <p className="text-sm text-gray-500 mt-1 mb-5">Introduce tu token de administrador.</p>
            <input type="password" aria-label="Token de administrador" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none font-mono"
              placeholder="ADMIN_TOKEN" autoFocus />
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            <button onClick={login} className="mt-4 w-full px-4 py-2.5 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-semibold transition">Entrar</button>
            <div className="mt-5 pt-5 border-t border-gray-100">
              <button onClick={entrarDemo} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-lg text-sm font-semibold transition">
                <Sparkles size={15} /> Ver el panel en modo demo
              </button>
              <p className="text-[11px] text-gray-400 mt-2">Con tickets, métricas y cifras ficticias.</p>
            </div>
          </div>
        ) : (
          <>
            {demo && (
              <div className="mb-5 flex items-start gap-3 bg-violet-600 text-white rounded-2xl px-4 py-3 text-sm">
                <Sparkles size={16} className="flex-shrink-0 mt-0.5" />
                <p className="flex-1">
                  <strong>Panel en modo demostración.</strong> Los tickets, el tráfico y la salud del servicio son cifras ficticias para enseñar
                  cómo se gestiona Presufact. Si envías un ticket desde <Link to="/ayuda" className="underline">Ayuda</Link> mientras
                  estás en la demo, aparecerá aquí.
                </p>
              </div>
            )}
            {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

            {tickets === null && !error ? (
              <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>
            ) : tickets !== null && (
              <>
                {/* ===== SOPORTE ===== */}
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5"><LifeBuoy size={13} /> Soporte</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  <Kpi label="Tickets abiertos" value={kpis.abiertos} sub={kpis.abiertos ? `el más antiguo lleva ${kpis.esperaMax}` : 'bandeja limpia'} icon={Inbox} tone={kpis.abiertos ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'} />
                  <Kpi label="Resueltos (30 días)" value={kpis.resueltos30} sub={`${tickets.length} tickets en total`} icon={CheckCircle} tone="text-emerald-600 bg-emerald-50" />
                  <Kpi label="Tiempo medio de resolución" value={kpis.tiempoMedio} sub="desde que entra hasta que se resuelve" icon={Clock} />
                  <Kpi label="Con email de contacto" value={`${kpis.respondibles} %`} sub="el email es opcional en el formulario" icon={Mail} tone="text-violet-600 bg-violet-50" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-8">
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-baseline justify-between mb-2">
                      <h3 className="font-semibold text-gray-800 text-sm">Tickets recibidos por día · últimas 2 semanas</h3>
                    </div>
                    <BarChart data={ultimos14} height={130} formatValue={(v) => `${v} ticket${v === 1 ? '' : 's'}`} emptyLabel="Sin tickets en 14 días" />
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-800 text-sm mb-3">Por tipo</h3>
                    <HBarList items={porTipo.map(p => ({ label: p.label, value: p.value }))} formatValue={(v) => `${v}`} />
                    {!demo && <p className="text-[11px] text-gray-400 mt-3">Los tickets reales no llevan tipo: se cuentan como dudas.</p>}
                  </div>
                </div>

                {/* ===== TRAFICO (solo demo) ===== */}
                {demo && trafico && (
                  <>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5"><Globe size={13} /> Tráfico · registros técnicos del hosting, agregados y anónimos</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-3">
                      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Visitas · 30 días</span>
                            <div className="mt-1 flex items-baseline gap-2">
                              <span className="text-2xl font-extrabold text-gray-900 tabular-nums">{fmtInt(trafico.visitas30)}</span>
                              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${trafico.variacion7d >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {trafico.variacion7d >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(trafico.variacion7d)} % vs. semana anterior
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2"><Sparkline values={trafico.serie.map(s => s.visitas)} height={56} formatValue={(v) => `${v} visitas`} /></div>
                        <div className="flex justify-between text-[11px] text-gray-400 mt-1"><span>hace 30 días</span><span>pico: publicación en LinkedIn</span><span>hoy</span></div>
                      </div>
                      <Kpi label="Demos iniciadas" value={fmtInt(trafico.demosIniciadas)} sub="visitas que abren /demo" icon={Sparkles} tone="text-violet-600 bg-violet-50" />
                      <div className="bg-white rounded-2xl border border-gray-200 p-4">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Dispositivos</span>
                        <div className="flex items-center gap-3 mt-1">
                          <Donut segments={trafico.dispositivos} size={72} thickness={10} />
                          <ul className="text-xs space-y-1 flex-1">
                            {trafico.dispositivos.map(d => (
                              <li key={d.label} className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-gray-600"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />{d.label}</span>
                                <span className="font-semibold text-gray-800 tabular-nums">{d.value} %</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-8">
                      <div className="bg-white rounded-2xl border border-gray-200 p-4">
                        <h3 className="font-semibold text-gray-800 text-sm mb-3">Páginas más visitadas</h3>
                        <HBarList items={trafico.paginas} formatValue={fmtInt} />
                      </div>
                      <div className="bg-white rounded-2xl border border-gray-200 p-4">
                        <h3 className="font-semibold text-gray-800 text-sm mb-3">Fuentes de tráfico</h3>
                        <HBarList items={trafico.fuentes} formatValue={(v) => `${v} %`} />
                      </div>
                    </div>
                  </>
                )}

                {/* ===== SALUD (solo demo) ===== */}
                {demo && salud && (
                  <>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5"><Activity size={13} /> Salud del servicio</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                      <Kpi label="Disponibilidad · 30 d" value={salud.uptime30d} sub="hosting estático + función de tickets" icon={Activity} tone="text-emerald-600 bg-emerald-50" />
                      <Kpi label="Respuesta p95" value={`${salud.p95ms} ms`} sub="tiempo hasta primer byte" icon={Clock} />
                      <Kpi label="Errores 5xx · 30 d" value={salud.errores5xx} sub="en la función de tickets" icon={ShieldCheck} tone="text-emerald-600 bg-emerald-50" />
                      <Kpi label="Vulnerabilidades" value={salud.vulnerabilidades} sub={`npm audit · tests ${salud.tests}`} icon={ShieldCheck} tone="text-emerald-600 bg-emerald-50" />
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-8">
                      <div className="flex items-baseline justify-between mb-3">
                        <h3 className="font-semibold text-gray-800 text-sm">Lighthouse · landing</h3>
                        <span className="text-[11px] text-gray-400">último deploy: {new Date(salud.ultimoDeploy).toLocaleDateString('es-ES')}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {salud.lighthouse.map(l => (
                          <div key={l.label} className="flex items-center gap-3">
                            <Donut segments={[{ label: l.label, value: l.value, color: l.value >= 90 ? '#10b981' : '#f59e0b' }, { label: 'resto', value: 100 - l.value, color: '#f3f4f6' }]} size={56} thickness={7} centerLabel={l.value} />
                            <span className="text-xs text-gray-600">{l.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ===== BANDEJA ===== */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Inbox size={18} className="text-accent" /> Bandeja de tickets</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs">
                      {[['abiertos', `Abiertos (${kpis.abiertos})`], ['resueltos', `Resueltos (${tickets.length - kpis.abiertos})`], ['todos', 'Todos']].map(([k, l]) => (
                        <button key={k} onClick={() => setFiltro(k)} className={`px-2.5 py-1.5 rounded-md font-medium transition ${filtro === k ? 'bg-accent text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{l}</button>
                      ))}
                    </div>
                    {demo && (
                      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs">
                        {[['todos', 'Todos'], ['duda', 'Dudas'], ['bug', 'Fallos'], ['sugerencia', 'Sugerencias']].map(([k, l]) => (
                          <button key={k} onClick={() => setTipoFiltro(k)} className={`px-2.5 py-1.5 rounded-md font-medium transition ${tipoFiltro === k ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{l}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {visibles.length === 0 ? (
                  <p className="text-sm text-gray-400 py-8 text-center bg-white rounded-2xl border border-gray-200">Nada por aquí. 🎉</p>
                ) : (
                  <div className="space-y-3">{visibles.map(ticketCard)}</div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
