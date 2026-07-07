import type { DesgloseCosto, PeajeSeleccionado, VehiculoFlete } from '../../types';
import { formatCLP } from '../../utils/fecha';
import { formatTiempo, compararVehiculos } from '../../hooks/useFletes';

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
  onGuardar: () => void;
  onWhatsapp: () => void;
  onPdf: () => void;
  onSeleccionarVehiculo: (id: string) => void;
}

export default function DesgloseCotizacion({
  desglose, vehiculos, vehiculoActualId, margen, peajesActivos,
  distanciaKm, idaYVuelta, horasConductor, valorHora, valorAlmuerzo,
  guardando, onGuardar, onWhatsapp, onPdf, onSeleccionarVehiculo,
}: Props) {
  // Comparador multi-vehículo
  const comparacion = vehiculos.length > 1 ? compararVehiculos(vehiculos, {
    distanciaKm,
    idaYVuelta,
    peajesSeleccionados: peajesActivos,
    horasConductor: parseFloat(horasConductor) || 0,
    valorHoraConductor: parseFloat(valorHora) || 0,
    valorAlmuerzo: parseFloat(valorAlmuerzo) || 0,
    margenPct: parseFloat(margen) || 0,
  }) : [];

  return (
    <div className="space-y-3 fade-in">
      {/* Badge tiempo estimado */}
      {desglose.tiempoEstimadoMin > 0 && (
        <div className="flex items-center justify-center gap-2 bg-blue-50 border border-blue-200 rounded-xl py-2">
          <span className="text-blue-600 text-sm">⏱️</span>
          <span className="text-blue-700 font-bold text-sm">
            Tiempo estimado: ~{formatTiempo(desglose.tiempoEstimadoMin)}
            {idaYVuelta ? ' (ida y vuelta)' : ''}
          </span>
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
                <button
                  key={vehiculo.id}
                  onClick={() => onSeleccionarVehiculo(vehiculo.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all ${
                    activo ? 'bg-amber-700 border-amber-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-amber-300'
                  }`}
                >
                  <span className={`text-sm font-bold ${activo ? 'text-white' : 'text-stone-700'}`}>{vehiculo.nombre}</span>
                  <span className={`font-black text-base ${activo ? 'text-amber-200' : 'text-amber-700'}`}>{formatCLP(d.precioFinal)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Costos vehículo */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">🔧 Costos del vehículo</p>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm"><span className="text-stone-600">⛽ Combustible</span><span className="font-bold text-stone-800">{formatCLP(desglose.combustible)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-stone-600">🔩 Desgaste</span><span className="font-bold text-stone-800">{formatCLP(desglose.desgaste)}</span></div>
        </div>
        <div className="flex justify-between pt-2 border-t border-amber-200">
          <span className="text-xs font-bold text-amber-700">Subtotal vehículo</span>
          <span className="font-black text-amber-800">{formatCLP(desglose.costoVehiculo)}</span>
        </div>
      </div>

      {/* Costos humano */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">👤 Costos operador</p>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm"><span className="text-stone-600">🕐 Conductor</span><span className="font-bold text-stone-800">{formatCLP(desglose.conductor)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-stone-600">🍽️ Almuerzo</span><span className="font-bold text-stone-800">{formatCLP(desglose.almuerzo)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-stone-600">🛣️ Peajes</span><span className="font-bold text-stone-800">{formatCLP(desglose.peajes)}</span></div>
        </div>
        <div className="flex justify-between pt-2 border-t border-blue-200">
          <span className="text-xs font-bold text-blue-700">Subtotal operador</span>
          <span className="font-black text-blue-800">{formatCLP(desglose.costoHumano)}</span>
        </div>
      </div>

      {/* Total */}
      <div className="bg-stone-800 rounded-2xl p-4 text-white">
        <div className="flex justify-between items-center mb-2">
          <span className="text-stone-400 text-sm font-bold">Costo total</span>
          <span className="text-white font-bold">{formatCLP(desglose.costoTotal)}</span>
        </div>
        {parseFloat(margen) > 0 && (
          <div className="flex justify-between items-center mb-3">
            <span className="text-stone-400 text-sm font-bold">Margen ({margen}%)</span>
            <span className="text-amber-300 font-bold">{formatCLP(desglose.precioFinal - desglose.costoTotal)}</span>
          </div>
        )}
        <div className="flex justify-between items-center border-t border-stone-600 pt-3">
          <span className="font-bold text-lg">PRECIO FINAL</span>
          <span className="font-black text-2xl text-amber-300">{formatCLP(desglose.precioFinal)}</span>
        </div>
      </div>

      {/* Acciones */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onGuardar}
          disabled={guardando}
          className="bg-amber-700 hover:bg-amber-800 text-white py-4 rounded-2xl font-bold text-xs transition-colors disabled:opacity-60 flex flex-col items-center justify-center gap-1"
        >
          <span>{guardando ? '⏳' : '💾'}</span>
          <span>Guardar</span>
        </button>
        <button
          onClick={onPdf}
          className="bg-stone-700 hover:bg-stone-800 text-white py-4 rounded-2xl font-bold text-xs transition-colors flex flex-col items-center justify-center gap-1"
        >
          <span>📄</span>
          <span>PDF</span>
        </button>
        <button
          onClick={onWhatsapp}
          className="bg-[#25D366] hover:bg-green-600 text-white py-4 rounded-2xl font-bold text-xs transition-colors flex flex-col items-center justify-center gap-1"
        >
          <span>💬</span>
          <span>WhatsApp</span>
        </button>
      </div>
    </div>
  );
}
