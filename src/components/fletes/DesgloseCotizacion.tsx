import { useState, useEffect, useRef } from 'react';
import type { DesgloseCosto, PeajeSeleccionado, VehiculoFlete } from '../../types';
import { formatCLP } from '../../utils/fecha';
import { formatTiempo, compararVehiculos, generarTextoResumen } from '../../hooks/useFletes';
import { useToast } from '../../hooks/useToast';

interface Props {
  desglose: DesgloseCosto;
  vehiculos: VehiculoFlete[];
  vehiculoActualId: string;
  margen: string;
  peajesActivos: PeajeSeleccionado[];
  distanciaKm: number;
  idaYVuelta: boolean;
  horasConductor: string;
  valorHora: string;
  valorAlmuerzo: string;
  guardando: boolean;
  vehiculoNombre: string;
  origen: string;
  destino: string;
  clienteNombre: string;
  onGuardar: () => void;
  onWhatsapp: () => void;
  onPdf: () => void;
  onSeleccionarVehiculo: (id: string) => void;
}

// ── Contador animado de número ──
function AnimatedPrice({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    const steps = 25;
    const delta = (to - from) / steps;
    let step = 0;
    const id = setInterval(() => {
      step++;
      if (step >= steps) { setDisplayed(to); clearInterval(id); return; }
      setDisplayed(Math.round(from + delta * step));
    }, 20);
    return () => clearInterval(id);
  }, [value]);

  return <>{formatCLP(displayed)}</>;
}

// ── Barra de proporción visual ──
function CostBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.max((value / total) * 100, 1) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-stone-600 font-semibold">{label}</span>
        <span className="text-[11px] font-black text-stone-800">{formatCLP(value)}</span>
      </div>
      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <p className="text-[9px] text-stone-400 text-right">{pct.toFixed(0)}%</p>
    </div>
  );
}

export default function DesgloseCotizacion({
  desglose, vehiculos, vehiculoActualId, margen, peajesActivos,
  distanciaKm, idaYVuelta, horasConductor, valorHora, valorAlmuerzo,
  guardando, vehiculoNombre, origen, destino, clienteNombre,
  onGuardar, onWhatsapp, onPdf, onSeleccionarVehiculo,
}: Props) {
  const [copiado, setCopiado] = useState(false);
  const { toast } = useToast();

  const comparacion = vehiculos.length > 1 ? compararVehiculos(vehiculos, {
    distanciaKm, idaYVuelta, peajesSeleccionados: peajesActivos,
    horasConductor: parseFloat(horasConductor) || 0,
    valorHoraConductor: parseFloat(valorHora) || 0,
    valorAlmuerzo: parseFloat(valorAlmuerzo) || 0,
    margenPct: parseFloat(margen) || 0,
  }) : [];

  const handleCopiar = async () => {
    const texto = generarTextoResumen(desglose, {
      vehiculo: vehiculoNombre, origen, destino, distanciaKm, idaYVuelta,
      clienteNombre, peajesSeleccionados: peajesActivos,
      margenPct: parseFloat(margen) || 0,
    });
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { toast('No se pudo copiar al portapapeles', 'error', '❌'); }
  };

  const precioPorKm = distanciaKm > 0
    ? Math.round(desglose.precioFinal / (idaYVuelta ? distanciaKm * 2 : distanciaKm))
    : 0;

  return (
    <div className="space-y-3 fade-in">

      {/* Badge tiempo + precio/km */}
      {desglose.tiempoEstimadoMin > 0 && (
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
            <span className="text-blue-500">⏱️</span>
            <div>
              <p className="text-[9px] text-blue-400 font-bold uppercase">Tiempo est.</p>
              <p className="text-blue-700 font-black text-sm leading-none">~{formatTiempo(desglose.tiempoEstimadoMin)}</p>
            </div>
          </div>
          {precioPorKm > 0 && (
            <div className="flex-1 flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
              <span className="text-purple-500">📏</span>
              <div>
                <p className="text-[9px] text-purple-400 font-bold uppercase">Precio/km</p>
                <p className="text-purple-700 font-black text-sm leading-none">{formatCLP(precioPorKm)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comparador de vehículos */}
      {comparacion.length > 1 && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">📊 Comparar vehículos</p>
          <div className="space-y-2">
            {comparacion.map(({ vehiculo, desglose: d }) => {
              const activo = vehiculo.id === vehiculoActualId;
              return (
                <button key={vehiculo.id} onClick={() => onSeleccionarVehiculo(vehiculo.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all ${activo ? 'bg-amber-700 border-amber-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-amber-300'}`}>
                  <span className={`text-sm font-bold ${activo ? 'text-white' : 'text-stone-700'}`}>{vehiculo.nombre}</span>
                  <span className={`font-black text-base ${activo ? 'text-amber-200' : 'text-amber-700'}`}>{formatCLP(d.precioFinal)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Desglose visual con barras */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 space-y-4">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">📊 Desglose de costos</p>
        
        <div className="space-y-3">
          <CostBar label="⛽ Combustible" value={desglose.combustible} total={desglose.costoTotal} color="#f59e0b" />
          <CostBar label="🔩 Desgaste" value={desglose.desgaste} total={desglose.costoTotal} color="#b45309" />
          <CostBar label="🕐 Conductor" value={desglose.conductor} total={desglose.costoTotal} color="#3b82f6" />
          <CostBar label="🍽️ Almuerzo" value={desglose.almuerzo} total={desglose.costoTotal} color="#8b5cf6" />
          {desglose.peajes > 0 && (
            <CostBar label="🛣️ Peajes" value={desglose.peajes} total={desglose.costoTotal} color="#10b981" />
          )}
        </div>

        {/* Subtotales */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
          <div className="bg-amber-50 rounded-xl p-2.5">
            <p className="text-[9px] text-amber-600 font-bold uppercase">Vehículo</p>
            <p className="font-black text-amber-800">{formatCLP(desglose.costoVehiculo)}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-2.5">
            <p className="text-[9px] text-blue-600 font-bold uppercase">Operador</p>
            <p className="font-black text-blue-800">{formatCLP(desglose.costoHumano)}</p>
          </div>
        </div>
      </div>

      {/* Total premium */}
      <div className="rounded-2xl p-5 text-white shadow-xl" style={{ background: 'linear-gradient(135deg,#1c1917,#292524)' }}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-stone-400 text-sm font-bold">Costo total</span>
          <span className="text-white font-bold">{formatCLP(desglose.costoTotal)}</span>
        </div>
        {parseFloat(margen) > 0 && (
          <div className="flex justify-between items-center mb-4">
            <span className="text-stone-400 text-sm font-bold">Margen ({margen}%)</span>
            <span className="text-amber-300 font-bold">+{formatCLP(desglose.precioFinal - desglose.costoTotal)}</span>
          </div>
        )}
        <div className="border-t border-stone-700 pt-4">
          <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Precio final</p>
          <p className="font-black text-amber-300 leading-none" style={{ fontSize: '2rem' }}>
            <AnimatedPrice value={desglose.precioFinal} />
          </p>
          {precioPorKm > 0 && (
            <p className="text-stone-500 text-[10px] mt-1">{formatCLP(precioPorKm)}/km · {idaYVuelta ? `${distanciaKm * 2} km totales` : `${distanciaKm} km`}</p>
          )}
        </div>
      </div>

      {/* Acciones — grid 2×2 */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onGuardar} disabled={guardando}
          className="py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-60 flex flex-col items-center gap-1 shadow text-white"
          style={{ background: 'linear-gradient(135deg,#b45309,#92400e)' }}>
          <span className="text-lg">{guardando ? '⏳' : '💾'}</span>
          <span>Guardar</span>
        </button>
        <button onClick={onPdf}
          className="py-4 rounded-2xl font-bold text-sm bg-stone-700 hover:bg-stone-800 text-white transition-all flex flex-col items-center gap-1 shadow">
          <span className="text-lg">📄</span>
          <span>PDF</span>
        </button>
        <button onClick={onWhatsapp}
          className="py-4 rounded-2xl font-bold text-sm text-white transition-all flex flex-col items-center gap-1 shadow"
          style={{ background: '#25D366' }}>
          <span className="text-lg">💬</span>
          <span>WhatsApp</span>
        </button>
        <button onClick={handleCopiar}
          className={`py-4 rounded-2xl font-bold text-sm transition-all flex flex-col items-center gap-1 border-2 ${copiado ? 'bg-green-50 border-green-400 text-green-700' : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'}`}>
          <span className="text-lg">{copiado ? '✅' : '📋'}</span>
          <span>{copiado ? '¡Copiado!' : 'Copiar'}</span>
        </button>
      </div>
    </div>
  );
}
