import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, ClipboardList, Settings, ArrowRight, Users, TrendingUp, Clock, CheckCircle2, Plus, Receipt } from 'lucide-react';
import { getAllDocuments, getEmisorSettings, getClientes, isPendienteCobro } from '../db';
import { calcInvoiceTaxBreakdown, formatNumber, formatDateES } from '../utils/formatters';
import { BarChart, Donut, HBarList } from './Charts';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const eur = (v) => `${formatNumber(v)} €`;
const eurCorto = (v) => v >= 1000 ? `${formatNumber(v / 1000, 1)} k€` : `${formatNumber(v, 0)} €`;
const totalDoc = (d) => calcInvoiceTaxBreakdown(d.lineas || [], d.iva, d.deducciones).total;

// Colores de ESTADO (siempre con etiqueta al lado, nunca solos)
const ESTADO_PRESU = [
  { key: 'pendiente', label: 'Pendientes', color: '#f59e0b' },
  { key: 'aceptado', label: 'Aceptados', color: '#10b981' },
  { key: 'rechazado', label: 'Rechazados', color: '#ef4444' },
];

// Inicio de la app: cuadro de mando calculado sobre los documentos guardados.
export default function HomePage() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const [facturas, presupuestos, clientes, em] = await Promise.all([
        getAllDocuments('factura'), getAllDocuments('presupuesto'), getClientes(), getEmisorSettings()
      ]);
      setCompanyName(em?.nombre || '');
      const year = new Date().getFullYear();
      const reales = facturas.filter(f => !f.esProforma && f.estado !== 'rechazada');
      const delAno = reales.filter(f => (f.date || '').startsWith(String(year)));

      const facturadoAno = delAno.reduce((s, f) => s + totalDoc(f), 0);
      const pendienteCobro = reales.filter(isPendienteCobro).reduce((s, f) => s + totalDoc(f), 0);
      const nPendientes = reales.filter(isPendienteCobro).length;
      const hoy = new Date().toISOString().split('T')[0];
      const vencidas = reales.filter(f => isPendienteCobro(f) && (f.vencimientos || []).some(v => v.fecha && v.fecha < hoy));

      // Mes derivado del string 'YYYY-MM-DD' (sin new Date: evita saltos de zona horaria)
      const porMes = MESES.map((m, i) => ({
        label: m,
        value: delAno.filter(f => Number((f.date || '').slice(5, 7)) - 1 === i).reduce((s, f) => s + totalDoc(f), 0),
      }));

      const presuPend = presupuestos.filter(p => (p.estado || 'pendiente') === 'pendiente');
      const valorPresuPend = presuPend.reduce((s, p) => s + totalDoc(p), 0);
      const nAcept = presupuestos.filter(p => p.estado === 'aceptado').length;
      const nRech = presupuestos.filter(p => p.estado === 'rechazado').length;
      const tasaAcept = nAcept + nRech > 0 ? Math.round((nAcept / (nAcept + nRech)) * 100) : null;
      const estados = ESTADO_PRESU.map(e => ({ ...e, value: presupuestos.filter(p => (p.estado || 'pendiente') === e.key).length }));

      const porCliente = new Map();
      for (const f of reales) {
        const k = f.cliente?.nombre || 'Sin nombre';
        porCliente.set(k, (porCliente.get(k) || 0) + totalDoc(f));
      }
      const topClientes = [...porCliente.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([label, value]) => ({ label, value }));

      const recientes = [
        ...facturas.map(d => ({ ...d, _tipo: 'factura' })),
        ...presupuestos.map(d => ({ ...d, _tipo: 'presupuesto' })),
      ].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 6);

      setData({
        nFacturas: facturas.length, nFacturasReales: delAno.length, nPresupuestos: presupuestos.length, nClientes: clientes.length,
        facturadoAno, pendienteCobro, nPendientes, nVencidas: vencidas.length, porMes,
        presuPend: presuPend.length, valorPresuPend, tasaAcept, estados, topClientes, recientes, year,
      });
    })().catch((e) => { console.error(e); setError(true); });
  }, []);

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-16 bg-white rounded-2xl border border-red-200 p-6 text-center">
        <p className="font-semibold text-gray-800">No se pudieron leer los datos guardados</p>
        <p className="text-sm text-gray-500 mt-1">Puede que el navegador esté en modo privado o bloquee el almacenamiento local.</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-semibold transition">Reintentar</button>
      </div>
    );
  }
  if (!data) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;
  }

  const vacio = data.nFacturas + data.nPresupuestos === 0;

  const kpis = [
    { label: `Facturado en ${data.year}`, value: eur(data.facturadoAno), icon: TrendingUp, tone: 'text-accent bg-blue-50', sub: `${data.nFacturasReales} factura${data.nFacturasReales === 1 ? '' : 's'} este año` },
    { label: 'Pendiente de cobro', value: eur(data.pendienteCobro), icon: Clock, tone: data.nVencidas ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50', sub: data.nVencidas ? `${data.nVencidas} vencida${data.nVencidas > 1 ? 's' : ''} · ${data.nPendientes} pendientes` : `${data.nPendientes} factura${data.nPendientes === 1 ? '' : 's'}` },
    { label: 'Presupuestos abiertos', value: eur(data.valorPresuPend), icon: ClipboardList, tone: 'text-violet-600 bg-violet-50', sub: `${data.presuPend} pendiente${data.presuPend === 1 ? '' : 's'} de respuesta` },
    { label: 'Tasa de aceptación', value: data.tasaAcept === null ? '—' : `${data.tasaAcept} %`, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50', sub: 'presupuestos aceptados vs rechazados' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{companyName || 'Presufact'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cuadro de mando · {data.nClientes} cliente{data.nClientes === 1 ? '' : 's'} · datos guardados solo en este dispositivo</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/presupuestos/nuevo')} className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-semibold transition">
            <Plus size={16} /> Presupuesto
          </button>
          <button onClick={() => navigate('/facturas/nueva')} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold transition">
            <Plus size={16} /> Factura
          </button>
        </div>
      </div>

      {vacio ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <ClipboardList size={36} className="mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg font-bold text-gray-800">Todavía no hay documentos</h2>
          <p className="text-sm text-gray-500 mt-1 mb-5">Crea tu primer presupuesto y este panel se llenará solo con tus cifras.</p>
          <button onClick={() => navigate('/presupuestos/nuevo')} className="px-5 py-2.5 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-semibold transition">
            Crear mi primer presupuesto
          </button>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {kpis.map((k, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{k.label}</span>
                  <span className={`p-1.5 rounded-lg ${k.tone}`}><k.icon size={16} /></span>
                </div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900 tabular-nums">{k.value}</div>
                <div className="text-xs text-gray-400 mt-1">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Facturacion por mes + estado de presupuestos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-bold text-gray-800">Facturación por mes · {data.year}</h2>
                <span className="text-xs text-gray-400">IVA incluido, sin proformas</span>
              </div>
              <BarChart data={data.porMes} formatValue={eurCorto} emptyLabel="Sin facturas este año" />
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-800 mb-3">Presupuestos por estado</h2>
              <div className="flex items-center gap-5">
                <Donut segments={data.estados} centerLabel={data.nPresupuestos} centerSub="total" />
                <ul className="space-y-2 text-sm flex-1">
                  {data.estados.map(e => (
                    <li key={e.key} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-gray-600"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />{e.label}</span>
                      <span className="font-semibold text-gray-900 tabular-nums">{e.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/presupuestos" className="mt-4 inline-flex items-center gap-1 text-sm text-accent hover:underline">Ver presupuestos <ArrowRight size={14} /></Link>
            </div>
          </div>

          {/* Top clientes + ultimos documentos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-bold text-gray-800 flex items-center gap-2"><Users size={16} className="text-gray-400" /> Clientes que más facturan</h2>
                <Link to="/clientes" className="text-xs text-accent hover:underline">Libreta</Link>
              </div>
              {data.topClientes.length ? <HBarList items={data.topClientes} formatValue={eur} /> : <p className="text-sm text-gray-400">Sin facturas todavía.</p>}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-800 mb-3">Últimos documentos</h2>
              <ul className="divide-y divide-gray-100">
                {data.recientes.map(d => (
                  <li key={`${d._tipo}-${d.id}`}>
                    <Link to={`/${d._tipo === 'factura' ? 'facturas' : 'presupuestos'}/editar/${d.id}`} className="flex items-center gap-3 py-2 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition">
                      <span className={`p-1.5 rounded-lg ${d._tipo === 'factura' ? 'bg-blue-50 text-accent' : 'bg-violet-50 text-violet-600'}`}>
                        {d._tipo === 'factura' ? <Receipt size={14} /> : <ClipboardList size={14} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-gray-800 truncate">{d.cliente?.nombre || 'Sin cliente'}</span>
                        <span className="block text-xs text-gray-400">{d.invoiceNumber} · {formatDateES(d.date)}{d.esProforma ? ' · proforma' : ''}</span>
                      </span>
                      <span className="text-sm font-semibold text-gray-900 tabular-nums">{eur(totalDoc(d))}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      {/* Accesos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/presupuestos', label: 'Presupuestos', n: data.nPresupuestos, icon: ClipboardList, cls: 'text-violet-600' },
          { to: '/facturas', label: 'Facturas', n: data.nFacturas, icon: FileText, cls: 'text-accent' },
          { to: '/clientes', label: 'Clientes', n: data.nClientes, icon: Users, cls: 'text-emerald-600' },
          { to: '/ajustes', label: 'Mi empresa', n: null, icon: Settings, cls: 'text-gray-500' },
        ].map(a => (
          <button key={a.to} onClick={() => navigate(a.to)}
            className="group bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm p-4 text-left transition flex items-center gap-3">
            <a.icon size={20} className={a.cls} />
            <span className="flex-1">
              <span className="block text-sm font-semibold text-gray-800">{a.label}</span>
              {a.n !== null && <span className="block text-xs text-gray-400">{a.n}</span>}
            </span>
            <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition" />
          </button>
        ))}
      </div>
    </div>
  );
}
