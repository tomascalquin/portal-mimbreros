import { useState, useMemo } from 'react';
import type { CotizacionFlete } from '../../types';
import { formatCLP } from '../../utils/fecha';
import { getRutasFrecuentes } from '../../hooks/useFletes';

interface Props {
  cotizaciones: CotizacionFlete[];
  onEliminar: (id: string) => void;
  onRecotizar: (c: CotizacionFlete) => void;
}

type RangoFecha = 'todo' | 'hoy' | 'semana' | 'mes';

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

function filtrarPorFecha(cotizaciones: CotizacionFlete[], rango: RangoFecha): CotizacionFlete[] {
  if (rango === 'todo') return cotizaciones;
  const ahora = new Date();
  return cotizaciones.filter(c => {
    if (!c.created_at) return false;
    const fecha = new Date(c.created_at);
    if (rango === 'hoy') {
      return fecha.toDateString() === ahora.toDateString();
    }
    if (rango === 'semana') {
      const hace7 = new Date(ahora); hace7.setDate(ahora.getDate() - 7);
      return fecha >= hace7;
    }
    if (rango === 'mes') {
      return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
    }
    return true;
  });
}

const RANGOS: { value: RangoFecha; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'mes', label: 'Este mes' },
  { value: 'semana', label: '7 días' },
  { value: 'hoy', label: 'Hoy' },
];

export default function HistorialFletes({ cotizaciones, onEliminar, onRecotizar }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [rango, setRango] = useState<RangoFecha>('todo');

  const filtradas = useMemo(() => {
    let result = filtrarPorFecha(cotizaciones, rango);
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      result = result.filter(c =>
        c.origen.toLowerCase().includes(q) ||
        c.destino.toLowerCase().includes(q) ||
        (c.cliente_nombre ?? '').toLowerCase().includes(q) ||
        (c.vehiculo_nombre ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [cotizaciones, busqueda, rango]);

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

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-3 space-y-2">
        {/* Búsqueda */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">🔍</span>
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, ruta, vehículo..."
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold text-stone-800 placeholder:font-normal placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 font-bold text-sm"
            >✕</button>
          )}
        </div>

        {/* Rango de fechas */}
        <div className="flex gap-1.5">
          {RANGOS.map(r => (
            <button
              key={r.value}
              onClick={() => setRango(r.value)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                rango === r.value
                  ? 'bg-amber-700 text-white'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Contador de resultados */}
        <p className="text-[10px] text-stone-400 font-bold text-right">
          {filtradas.length === cotizaciones.length
            ? `${cotizaciones.length} cotizaciones`
            : `Mostrando ${filtradas.length} de ${cotizaciones.length}`}
        </p>
      </div>

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-stone-200 p-8 text-center">
          <span className="text-3xl block mb-2">🔍</span>
          <p className="text-stone-400 font-bold text-sm">Sin resultados</p>
          <button
            onClick={() => { setBusqueda(''); setRango('todo'); }}
            className="text-amber-700 text-xs font-bold mt-2 underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        filtradas.map(c => {
          const distReal = c.ida_y_vuelta ? c.distancia_km * 2 : c.distancia_km;
          const precioPorKm = distReal > 0 ? Math.round(c.precio_final / distReal) : 0;
          const costoTotal = c.costo_combustible + c.costo_desgaste + c.costo_conductor + c.costo_almuerzo + c.costo_peajes;
          const margenPesos = c.precio_final - costoTotal;
          const margenPct = costoTotal > 0 ? Math.round((margenPesos / c.precio_final) * 100) : 0;
          const fecha = new Date(c.created_at!);
          return (
            <div key={c.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden fade-in">
              {/* Header con gradiente */}
              <div className="px-4 py-3 flex items-start justify-between" style={{ background: 'linear-gradient(135deg,#1c1917,#292524)' }}>
                <div className="min-w-0 flex-1 mr-3">
                  <p className="font-black text-white text-sm truncate">{c.origen} → {c.destino}</p>
                  {c.cliente_nombre && <p className="text-amber-300 text-xs font-bold mt-0.5">👤 {c.cliente_nombre}</p>}
                  <p className="text-stone-500 text-[10px] mt-1">{c.vehiculo_nombre ?? '—'} · {c.distancia_km} km{c.ida_y_vuelta ? ' ↔' : ' →'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-amber-300 text-xl leading-none">{formatCLP(c.precio_final)}</p>
                  {precioPorKm > 0 && <p className="text-stone-500 text-[10px] font-bold mt-0.5">{formatCLP(precioPorKm)}/km</p>}
                  <p className="text-stone-600 text-[10px] mt-1">{fecha.toLocaleDateString('es-CL')}</p>
                </div>
              </div>

              {/* Barra de margen visual */}
              {margenPct > 0 && (
                <div className="px-4 pt-2">
                  <div className="flex justify-between text-[9px] font-bold mb-1">
                    <span className="text-stone-500">Costo {formatCLP(costoTotal)}</span>
                    <span className="text-green-600">Margen {margenPct}% ({formatCLP(margenPesos)})</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full flex">
                      <div className="h-full bg-amber-500 transition-all" style={{ width: `${100 - margenPct}%` }} />
                      <div className="h-full bg-green-500 flex-1" />
                    </div>
                  </div>
                </div>
              )}

              {/* Desglose mini */}
              <div className="px-4 py-2.5 space-y-2">
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-stone-50 rounded-lg py-1.5">
                    <p className="text-[9px] text-stone-400 font-bold">⛽ Comb.</p>
                    <p className="text-xs font-black text-stone-700">{formatCLP(c.costo_combustible)}</p>
                  </div>
                  <div className="bg-stone-50 rounded-lg py-1.5">
                    <p className="text-[9px] text-stone-400 font-bold">🔩 Desg.</p>
                    <p className="text-xs font-black text-stone-700">{formatCLP(c.costo_desgaste)}</p>
                  </div>
                  <div className="bg-stone-50 rounded-lg py-1.5">
                    <p className="text-[9px] text-stone-400 font-bold">🛣️ Peajes</p>
                    <p className="text-xs font-black text-stone-700">{formatCLP(c.costo_peajes)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                  <button onClick={() => onRecotizar(c)}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
                    🔄 Re-cotizar
                  </button>
                  <button onClick={() => confirm('¿Eliminar cotización?') && onEliminar(c.id)}
                    className="text-xs font-bold text-red-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-all">
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
