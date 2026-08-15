// Graficos minimos en SVG puro (sin librerias, compatibles con la CSP estricta).
// Reglas: marcas finas, una sola escala, un solo tono para magnitudes, colores
// de estado siempre acompanados de etiqueta, tooltip nativo por marca.

// Barras verticales de una serie (p. ej. facturado por mes). En HTML/CSS para
// que texto y barras no escalen con el ancho: legible igual en movil y escritorio.
export function BarChart({ data, color = '#2563eb', height = 160, formatValue = (v) => String(v), emptyLabel = 'Sin datos' }) {
  const max = Math.max(0, ...data.map(d => d.value));
  const maxIdx = data.findIndex(d => d.value === max);
  if (max <= 0) {
    return <div className="h-40 flex items-center justify-center text-sm text-gray-400">{emptyLabel}</div>;
  }
  const n = data.length;
  return (
    <div role="img" aria-label="Gráfico de barras">
      <div className="flex items-end gap-1 sm:gap-2 border-b border-gray-200" style={{ height }}>
        {data.map((d, i) => {
          const pct = d.value > 0 ? Math.max(2, (d.value / max) * 100) : 0;
          const esMax = i === maxIdx;
          // La etiqueta del maximo se ancla hacia dentro en los extremos para no salirse
          const labelPos = i >= n - 2 ? 'right-0' : i <= 1 ? 'left-0' : 'left-1/2 -translate-x-1/2';
          return (
            <div key={i} className="flex-1 h-full flex flex-col justify-end relative min-w-0" title={`${d.label}: ${formatValue(d.value)}`}>
              {esMax && (
                <span className={`absolute ${labelPos} text-[11px] font-semibold text-gray-700 whitespace-nowrap`} style={{ bottom: `calc(${pct}% + 4px)` }}>
                  {formatValue(d.value)}
                </span>
              )}
              <div className="w-full rounded-t" style={{ height: `${pct}%`, backgroundColor: color, opacity: esMax ? 1 : 0.75 }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 sm:gap-2 mt-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] sm:text-[11px] text-gray-400 truncate min-w-0">{d.label}</div>
        ))}
      </div>
    </div>
  );
}

// Linea de tendencia compacta (p. ej. visitas 30 dias)
export function Sparkline({ values, color = '#2563eb', height = 48, formatValue = (v) => String(v) }) {
  const W = 200, H = height, pad = 3;
  const max = Math.max(1, ...values), min = Math.min(...values);
  const range = Math.max(1, max - min);
  const pts = values.map((v, i) => [
    pad + (i / Math.max(1, values.length - 1)) * (W - pad * 2),
    H - pad - ((v - min) / range) * (H - pad * 2),
  ]);
  const line = pts.map(p => p.join(',')).join(' ');
  const area = `M${pts[0][0]},${H} L${line.replace(/ /g, ' L')} L${pts[pts.length - 1][0]},${H} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Tendencia">
      <path d={area} fill={color} opacity="0.08" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} stroke="#fff" strokeWidth="2">
        <title>{`Último: ${formatValue(values[values.length - 1])}`}</title>
      </circle>
    </svg>
  );
}

// Anillo de estados. Los colores son de ESTADO y van siempre con leyenda (la
// pinta el llamador con la misma lista de segmentos).
export function Donut({ segments, size = 120, thickness = 14, centerLabel, centerSub }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const gapPx = 2; // separacion entre segmentos
  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Distribución por estado">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={thickness} />
      {total > 0 && segments.filter(s => s.value > 0).map((s, i) => {
        const len = (s.value / total) * c;
        const dash = Math.max(0, len - gapPx);
        const el = (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
            strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <title>{`${s.label}: ${s.value}`}</title>
          </circle>
        );
        offset += len;
        return el;
      })}
      {centerLabel !== undefined && (
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size / 5} fontWeight="800" fill="#111827">{centerLabel}</text>
      )}
      {centerSub && (
        <text x="50%" y="66%" textAnchor="middle" fontSize={size / 11} fill="#6b7280">{centerSub}</text>
      )}
    </svg>
  );
}

// Lista con barra horizontal proporcional (p. ej. top clientes)
export function HBarList({ items, color = '#2563eb', formatValue = (v) => String(v) }) {
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i} title={`${it.label}: ${formatValue(it.value)}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-gray-700 font-medium">{it.label}</span>
            <span className="text-gray-900 font-semibold tabular-nums flex-shrink-0">{formatValue(it.value)}</span>
          </div>
          <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.max(0, (it.value / max) * 100)}%`, backgroundColor: color, opacity: i === 0 ? 1 : 0.7 }} />
          </div>
          {it.sub && <div className="text-[11px] text-gray-400 mt-0.5">{it.sub}</div>}
        </li>
      ))}
    </ul>
  );
}
