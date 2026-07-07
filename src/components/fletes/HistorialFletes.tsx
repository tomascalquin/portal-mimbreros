import type { CotizacionFlete } from '../../types';
import { formatCLP } from '../../utils/fecha';
import { getRutasFrecuentes } from '../../hooks/useFletes';

interface Props {
  cotizaciones: CotizacionFlete[];
  onEliminar: (id: string) => void;
  onRecotizar: (c: CotizacionFlete) => void;
}

function MetricasHistorial({ cotizaciones }: { cotizaciones: CotizacionFlete[] }) {
  if (cotizaciones.length === 0) return null;
  const total = cotizaciones.reduce((s, c) => s + c.precio_final, 0);
  const promedio = total / cotizaciones.length;
  const frecuentes = getRutasFrecuentes(cotizaciones, 1);
  const rutaTop = frecuentes[0] ? `${frecuentes[0].origen} → ${frecuentes[0].destino}` : '—';
  const margenProm = cotizaciones.reduce((s, c) => s + (c.margen_pct ?? 0), 0) / cotizaciones.length;

  return (
    <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl p-4 text-white fade-in">
      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">📈 Resumen</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[9px] text-stone-400 font-bold mb-0.5">Total cotizado</p>
          <p className="font-black text-amber-300 text-lg leading-none">{formatCLP(Math.round(total))}</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[9px] text-stone-400 font-bold mb-0.5">Promedio</p>
          <p className="font-black text-white text-lg leading-none">{formatCLP(Math.round(promedio))}</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[9px] text-stone-400 font-bold mb-0.5">Ruta frecuente</p>
          <p className="font-bold text-white text-[11px] leading-tight">{rutaTop}</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[9px] text-stone-400 font-bold mb-0.5">Margen promedio</p>
          <p className="font-black text-white text-lg leading-none">{margenProm.toFixed(0)}%</p>
        </div>
      </div>
      <p className="text-[9px] text-stone-500 mt-2 text-right">{cotizaciones.length} cotizaciones guardadas</p>
    </div>
  );
}

export default function HistorialFletes({ cotizaciones, onEliminar, onRecotizar }: Props) {
  if (cotizaciones.length === 0) return (
    <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-10 text-center">
      <span className="text-4xl block mb-3">📋</span>
      <p className="text-stone-400 font-bold text-sm">Sin cotizaciones guardadas aún</p>
      <p className="text-stone-300 text-xs mt-1">Genera tu primera cotización</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <MetricasHistorial cotizaciones={cotizaciones} />
      {cotizaciones.map(c => (
        <div key={c.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden fade-in">
          <div className="bg-stone-800 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">{c.origen} → {c.destino}</p>
              {c.cliente_nombre && <p className="text-stone-400 text-xs">{c.cliente_nombre}</p>}
              <p className="text-stone-500 text-[10px]">{c.vehiculo_nombre ?? '—'} · {c.distancia_km} km{c.ida_y_vuelta ? ' I+V' : ''}</p>
            </div>
            <div className="text-right">
              <p className="font-black text-amber-300 text-xl">{formatCLP(c.precio_final)}</p>
              <p className="text-stone-400 text-[10px]">{new Date(c.created_at!).toLocaleDateString('es-CL')}</p>
            </div>
          </div>
          <div className="px-4 py-3 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[9px] text-stone-400 font-bold">⛽ Combustible</p><p className="text-xs font-bold text-stone-700">{formatCLP(c.costo_combustible)}</p></div>
              <div><p className="text-[9px] text-stone-400 font-bold">🔩 Desgaste</p><p className="text-xs font-bold text-stone-700">{formatCLP(c.costo_desgaste)}</p></div>
              <div><p className="text-[9px] text-stone-400 font-bold">🛣️ Peajes</p><p className="text-xs font-bold text-stone-700">{formatCLP(c.costo_peajes)}</p></div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => onRecotizar(c)}
                className="text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-all"
              >
                🔄 Re-cotizar
              </button>
              <button
                onClick={() => confirm('¿Eliminar cotización?') && onEliminar(c.id)}
                className="text-xs font-bold text-red-400 hover:text-red-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
