import { useState, useEffect } from 'react';
import type { VehiculoFlete, TipoVehiculo } from '../../types';
import { VEHICLE_TEMPLATES } from '../../hooks/useFletes';

interface Props {
  vehiculo: VehiculoFlete | null; // null = crear nuevo
  onGuardar: (v: Omit<VehiculoFlete, 'id' | 'tienda_id' | 'created_at'>) => Promise<any>;
  onActualizar?: (id: string, v: Partial<VehiculoFlete>) => Promise<void>;
  onEliminar?: (id: string) => Promise<void>;
  onCerrar: () => void;
}

export default function ModalVehiculo({ vehiculo, onGuardar, onActualizar, onEliminar, onCerrar }: Props) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoVehiculo>('camioneta');
  const [rendimiento, setRendimiento] = useState('10');
  const [precioLitro, setPrecioLitro] = useState('1550');
  const [desgaste, setDesgaste] = useState('25');
  const [velocidad, setVelocidad] = useState('80');
  const [guardando, setGuardando] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);

  useEffect(() => {
    if (vehiculo) {
      setNombre(vehiculo.nombre);
      setTipo(vehiculo.tipo);
      setRendimiento(vehiculo.rendimiento_km_lt.toString());
      setPrecioLitro(vehiculo.precio_litro.toString());
      setDesgaste(vehiculo.costo_desgaste_km.toString());
      setVelocidad(vehiculo.velocidad_promedio.toString());
    }
  }, [vehiculo]);

  const aplicarTemplate = (t: TipoVehiculo) => {
    setTipo(t);
    const tpl = VEHICLE_TEMPLATES[t];
    setRendimiento(tpl.rendimiento.toString());
    setDesgaste(tpl.desgaste.toString());
    setVelocidad(tpl.velocidad.toString());
    setPrecioLitro(tpl.precioLitro.toString());
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) return alert('Ingresa el nombre del vehículo');
    setGuardando(true);
    const data = {
      nombre: nombre.trim(),
      tipo,
      rendimiento_km_lt: parseFloat(rendimiento) || 10,
      precio_litro: parseFloat(precioLitro) || 1550,
      costo_desgaste_km: parseFloat(desgaste) || 25,
      velocidad_promedio: parseFloat(velocidad) || 80,
    };

    if (vehiculo && onActualizar) {
      await onActualizar(vehiculo.id, data);
    } else {
      await onGuardar(data);
    }
    setGuardando(false);
    onCerrar();
  };

  const handleEliminar = async () => {
    if (!vehiculo || !onEliminar) return;
    setGuardando(true);
    await onEliminar(vehiculo.id);
    setGuardando(false);
    onCerrar();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden slide-up max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-stone-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{vehiculo ? '✏️' : '🛻'}</span>
            <span className="font-bold">{vehiculo ? 'Editar Vehículo' : 'Nuevo Vehículo'}</span>
          </div>
          <button onClick={onCerrar} className="text-stone-400 hover:text-white font-bold text-xl">✕</button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1">

          {/* Nombre */}
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">
              Nombre del vehículo
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Ford Ranger 2024"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 font-bold text-stone-800 focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>

          {/* Tipo con templates */}
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
              Tipo de vehículo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(VEHICLE_TEMPLATES) as [TipoVehiculo, typeof VEHICLE_TEMPLATES[TipoVehiculo]][]).map(([key, tpl]) => (
                <button
                  key={key}
                  onClick={() => aplicarTemplate(key)}
                  className={`py-3 px-3 rounded-xl font-bold text-sm border-2 transition-all flex items-center gap-2 ${
                    tipo === key
                      ? 'bg-amber-700 border-amber-700 text-white'
                      : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <span className="text-lg">{tpl.emoji}</span>
                  <span className="text-xs">{tpl.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Combustible */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
              ⛽ Combustible
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 mb-1">Rendimiento (km/lt)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={rendimiento}
                  onChange={e => setRendimiento(e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2.5 font-black text-amber-800 text-lg focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 mb-1">Precio litro ($)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={precioLitro}
                  onChange={e => setPrecioLitro(e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2.5 font-black text-amber-800 text-lg focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Desgaste */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2">
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
              🔩 Desgaste (aceite + neumáticos + motor + frenos)
            </p>
            <div>
              <label className="block text-[10px] font-bold text-stone-500 mb-1">Costo por km ($)</label>
              <input
                type="number"
                inputMode="decimal"
                value={desgaste}
                onChange={e => setDesgaste(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2.5 font-black text-stone-800 text-lg focus:outline-none focus:border-amber-500"
              />
              <p className="text-[9px] text-stone-400 mt-1.5 leading-tight">
                Incluye aceite (~$3.5/km) + neumáticos (~$8/km) + motor (~$10/km) + frenos (~$4.5/km).
                Valor por defecto basado en uso moderado-intensivo.
              </p>
            </div>
          </div>

          {/* Velocidad */}
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">
              🏎️ Velocidad promedio (km/h)
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={velocidad}
              onChange={e => setVelocidad(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 font-black text-stone-800 text-lg focus:outline-none focus:border-amber-500"
            />
            <p className="text-[9px] text-stone-400 mt-1">
              Para estimar duración del viaje. Considera paradas, tráfico, etc.
            </p>
          </div>

          {/* Botón guardar */}
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white py-4 rounded-2xl font-bold text-base transition-colors disabled:opacity-60"
          >
            {guardando ? '⏳ Guardando...' : vehiculo ? '✓ Actualizar vehículo' : '✓ Crear vehículo'}
          </button>

          {/* Botón eliminar (solo en edición) */}
          {vehiculo && onEliminar && (
            <div>
              {!confirmEliminar ? (
                <button
                  onClick={() => setConfirmEliminar(true)}
                  className="w-full py-3 rounded-2xl font-bold text-sm text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
                >
                  🗑️ Eliminar vehículo
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3 fade-in">
                  <p className="text-sm font-bold text-red-700 text-center">
                    ¿Seguro que quieres eliminar "{vehiculo.nombre}"?
                  </p>
                  <p className="text-xs text-red-500 text-center">
                    Las cotizaciones asociadas se conservarán.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setConfirmEliminar(false)}
                      className="py-3 rounded-xl font-bold text-sm bg-white border border-stone-200 text-stone-600"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleEliminar}
                      disabled={guardando}
                      className="py-3 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {guardando ? '⏳' : '🗑️'} Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
