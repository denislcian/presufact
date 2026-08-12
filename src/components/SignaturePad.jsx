import { useRef, useEffect, useState } from 'react';
import { Eraser, Check } from 'lucide-react';

// Pad de firma con canvas: funciona con dedo (movil), stylus y raton.
// onChange recibe el dataURL PNG de la firma (o null al borrar).
export default function SignaturePad({ value, onChange, label = 'Firma' }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const [signed, setSigned] = useState(!!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    // canvas nitido en pantallas retina
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e293b';
    // si ya habia firma guardada, mostrarla
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = value;
      hasInk.current = true;
    }
  }, []);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasInk.current = true;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (hasInk.current) {
      onChange(canvasRef.current.toDataURL('image/png'));
      setSigned(true);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInk.current = false;
    setSigned(false);
    onChange(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
          {label}
          {signed && <Check size={13} className="text-emerald-500" />}
        </span>
        <button type="button" onClick={clear}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition">
          <Eraser size={12} /> Borrar
        </button>
      </div>
      <canvas ref={canvasRef}
        className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl bg-white cursor-crosshair touch-none"
        onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} />
      <p className="text-xs text-gray-400 mt-1">Firma con el dedo (móvil) o el ratón. Se incluirá en el PDF sobre la línea de conformidad.</p>
    </div>
  );
}
