import { useState, useEffect, useCallback } from 'react';
import type { VehiculoFlete, PeajeSeleccionado, TipoVehiculo, CotizacionFlete } from './types';
import {
  useFletes, calcularDesglose, VEHICLE_TEMPLATES, CIUDADES_CHILE,
  getDistancia, calcularHorasSugeridas, sugiereAlmuerzo,
  cargarPrefs, guardarPrefs, getRutasFrecuentes, formatTiempo,
} from './hooks/useFletes';
import { formatCLP } from './utils/fecha';
import ModalVehiculo from './components/fletes/ModalVehiculo';
import HistorialFletes from './components/fletes/HistorialFletes';
import DesgloseCotizacion from './components/fletes/DesgloseCotizacion';
import PdfCotizacion from './components/fletes/PdfCotizacion';
import MapaPicker from './components/fletes/MapaPicker';

// Keyframe para toast slide-in
const toastStyle = `
@keyframes slideDown {
  from { opacity: 0; transform: translate(-50%, -20px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}
.toast-slide { animation: slideDown 0.3s ease-out forwards; }
`;

export default function PestanaFletes({ miId, nombreLocal }: { miId: string; nombreLocal?: string }) {
  const {
    vehiculos, cargando, guardando, exito,
    crearVehiculo, actualizarVehiculo, eliminarVehiculo,
    buscarPeajes, guardarCotizacion, eliminarCotizacion,
    cotizaciones, compartirWhatsapp,
  } = useFletes(miId);

  const [vista, setVista] = useState<'cotizar' | 'historial'>('cotizar');
  const [modalVehiculo, setModalVehiculo] = useState<VehiculoFlete | null | 'nuevo'>(null);
  const [mostrarPdf, setMostrarPdf] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [origenLibre, setOrigenLibre] = useState(false); // true cuando viene del mapa

  // Cargar preferencias guardadas
  const prefs = cargarPrefs();

  // ── Formulario cotización ──
  const [vehiculoId, setVehiculoId] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [origen, setOrigen] = useState(prefs.ultimoOrigen);
  const [destino, setDestino] = useState(prefs.ultimoDestino);
  const [distanciaKm, setDistanciaKm] = useState('');
  const [distManual, setDistManual] = useState(false);
  const [idaYVuelta, setIdaYVuelta] = useState(true);
  const [peajesActivos, setPeajesActivos] = useState<PeajeSeleccionado[]>([]);
  const [horasConductor, setHorasConductor] = useState('');
  const [horasManual, setHorasManual] = useState(false);
  const [valorHora, setValorHora] = useState(prefs.valorHora);
  const [valorAlmuerzo, setValorAlmuerzo] = useState(prefs.valorAlmuerzo);
  const [margen, setMargen] = useState(prefs.margen);
  const [nota, setNota] = useState('');

  const vehiculo = vehiculos.find(v => v.id === vehiculoId) ?? null;

  // Autoseleccionar primer vehículo
  useEffect(() => {
    if (vehiculos.length > 0 && !vehiculoId) setVehiculoId(vehiculos[0].id);
  }, [vehiculos]);

  // Auto-distancia al cambiar ruta
  const autoDistancia = useCallback(() => {
    if (distManual) return;
    const d = getDistancia(origen, destino);
    if (d !== null) setDistanciaKm(d.toString());
    else setDistanciaKm('');
  }, [origen, destino, distManual]);

  useEffect(() => { autoDistancia(); }, [autoDistancia]);

  // Auto-peajes + auto-horas al cambiar ruta/vehículo
  useEffect(() => {
    if (!vehiculo) { setPeajesActivos([]); return; }
    const ps = buscarPeajes(origen, destino, vehiculo.tipo as TipoVehiculo);
    setPeajesActivos(ps);
    // Auto-horas sólo si no fue editado manualmente
    if (!horasManual) {
      const dist = parseFloat(distanciaKm) || 0;
      if (dist > 0) {
        const h = calcularHorasSugeridas(dist, idaYVuelta, vehiculo.velocidad_promedio);
        setHorasConductor(h.toString());
        // Auto-almuerzo
        const conAlmuerzo = sugiereAlmuerzo(dist, idaYVuelta, vehiculo.velocidad_promedio);
        if (!horasManual) setValorAlmuerzo(conAlmuerzo ? prefs.valorAlmuerzo : '0');
      }
    }
  }, [origen, destino, vehiculoId, vehiculos.length, distanciaKm, idaYVuelta]);

  // Recalcular auto-horas cuando cambia la distancia
  useEffect(() => {
    if (horasManual || !vehiculo) return;
    const dist = parseFloat(distanciaKm) || 0;
    if (dist > 0) {
      const h = calcularHorasSugeridas(dist, idaYVuelta, vehiculo.velocidad_promedio);
      setHorasConductor(h.toString());
      const conAlmuerzo = sugiereAlmuerzo(dist, idaYVuelta, vehiculo.velocidad_promedio);
      setValorAlmuerzo(conAlmuerzo ? prefs.valorAlmuerzo : '0');
    }
  }, [distanciaKm, idaYVuelta]);

  const togglePeaje = (idx: number) => {
    setPeajesActivos(prev => prev.map((p, i) => i === idx ? { ...p, seleccionado: !p.seleccionado } : p));
  };

  const swapRuta = () => {
    const tmp = origen;
    setOrigen(destino);
    setDestino(tmp);
    setDistManual(false);
  };

  const desglose = vehiculo ? calcularDesglose({
    distanciaKm: parseFloat(distanciaKm) || 0,
    idaYVuelta,
    rendimiento: vehiculo.rendimiento_km_lt,
    precioLitro: vehiculo.precio_litro,
    costoDesgasteKm: vehiculo.costo_desgaste_km,
    velocidadPromedio: vehiculo.velocidad_promedio,
    peajesSeleccionados: peajesActivos,
    horasConductor: parseFloat(horasConductor) || 0,
    valorHoraConductor: parseFloat(valorHora) || 0,
    valorAlmuerzo: parseFloat(valorAlmuerzo) || 0,
    margenPct: parseFloat(margen) || 0,
  }) : null;

  const handleGuardar = async () => {
    if (!vehiculo) return alert('Selecciona un vehículo');
    if (!(parseFloat(distanciaKm) > 0)) return alert('Ingresa la distancia');
    await guardarCotizacion({
      vehiculo, clienteNombre, origen, destino,
      distanciaKm: parseFloat(distanciaKm),
      idaYVuelta, peajesSeleccionados: peajesActivos,
      horasConductor: parseFloat(horasConductor) || 0,
      valorHoraConductor: parseFloat(valorHora) || 0,
      valorAlmuerzo: parseFloat(valorAlmuerzo) || 0,
      margenPct: parseFloat(margen) || 0, nota,
    });
    guardarPrefs({ ultimoOrigen: origen, ultimoDestino: destino });
  };

  // Confirmar ruta desde el mapa
  const handleConfirmarMapa = (origenNombre: string, destinoNombre: string, km: number, duracionMin: number) => {
    setOrigen(origenNombre);
    setDestino(destinoNombre);
    setDistanciaKm(km.toString());
    setDistManual(true);
    setOrigenLibre(true);
    setMostrarMapa(false);
    // Auto-llenar horas conductor con el tiempo real de ruta (en horas, redondeado a 0.5)
    const horas = Math.ceil((duracionMin / 60) * 2) / 2;
    setHorasConductor(horas.toString());
    setHorasManual(false); // marcamos como "auto" (viene de dato real)
  };

  const handleRecotizar = (c: CotizacionFlete) => {
    setOrigen(c.origen);
    setDestino(c.destino);
    setDistanciaKm(c.distancia_km.toString());
    setDistManual(true);
    setIdaYVuelta(c.ida_y_vuelta);
    setClienteNombre(c.cliente_nombre ?? '');
    setHorasConductor(c.horas_conductor?.toString() ?? '');
    setHorasManual(true);
    setValorHora(c.valor_hora_conductor?.toString() ?? prefs.valorHora);
    setValorAlmuerzo(c.valor_almuerzo?.toString() ?? prefs.valorAlmuerzo);
    setMargen(c.margen_pct?.toString() ?? prefs.margen);
    setNota(c.nota ?? '');
    if (c.vehiculo_id) setVehiculoId(c.vehiculo_id);
    setVista('cotizar');
  };

  // Rutas frecuentes
  const rutasFrecuentes = getRutasFrecuentes(cotizaciones, 3);

  if (cargando) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center space-y-2">
        <span className="text-3xl block animate-pulse">🚛</span>
        <p className="text-stone-400 font-bold text-sm">Cargando fletes...</p>
      </div>
    </div>
  );

  return (
    <div className="fade-in space-y-4 pb-10">
      {/* Modales */}
      {modalVehiculo !== null && (
        <ModalVehiculo
          vehiculo={modalVehiculo === 'nuevo' ? null : modalVehiculo}
          onGuardar={crearVehiculo}
          onActualizar={actualizarVehiculo}
          onEliminar={eliminarVehiculo}
          onCerrar={() => setModalVehiculo(null)}
        />
      )}
      {mostrarPdf && desglose && vehiculo && (
        <PdfCotizacion
          nombreLocal={nombreLocal ?? ''}
          clienteNombre={clienteNombre}
          vehiculoNombre={vehiculo.nombre}
          origen={origen}
          destino={destino}
          distanciaKm={parseFloat(distanciaKm) || 0}
          idaYVuelta={idaYVuelta}
          desglose={desglose}
          peajesSeleccionados={peajesActivos}
          margenPct={parseFloat(margen) || 0}
          nota={nota}
          onCerrar={() => setMostrarPdf(false)}
        />
      )}
      {mostrarMapa && (
        <MapaPicker
          onConfirmar={handleConfirmarMapa}
          onCerrar={() => setMostrarMapa(false)}
        />
      )}

      {/* Keyframes inyectados */}
      <style>{toastStyle}</style>

      {/* Toast éxito mejorado */}
      {exito && (
        <div className="toast-slide fixed top-6 left-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3" style={{ transform: 'translateX(-50%)' }}>
          <span className="text-xl">✅</span>
          <div>
            <p className="font-black text-sm">¡Cotización guardada!</p>
            <p className="text-green-200 text-[11px] font-normal">Disponible en el historial</p>
          </div>
        </div>
      )}

      {/* Toggle vista */}
      <div className="flex bg-stone-200 p-1.5 rounded-xl">
        <button onClick={() => setVista('cotizar')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${vista === 'cotizar' ? 'bg-white shadow text-stone-900' : 'text-stone-500'}`}>🚛 Cotizar</button>
        <button onClick={() => setVista('historial')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${vista === 'historial' ? 'bg-white shadow text-stone-900' : 'text-stone-500'}`}>📋 Historial ({cotizaciones.length})</button>
      </div>

      {/* ══ VISTA COTIZAR ══ */}
      {vista === 'cotizar' && (
        <div className="space-y-4">

          {/* Rutas frecuentes */}
          {rutasFrecuentes.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">⚡ Acceso rápido</p>
              <div className="flex gap-2 flex-wrap">
                {rutasFrecuentes.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setOrigen(r.origen);
                      setDestino(r.destino);
                      setDistanciaKm(r.distancia.toString());
                      setDistManual(false);
                    }}
                    className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-3 py-2 rounded-xl hover:bg-amber-100 transition-all active:scale-95"
                  >
                    {r.origen} → {r.destino}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Vehículos */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">🛻 Vehículo</p>
              <button onClick={() => setModalVehiculo('nuevo')} className="text-amber-700 text-xs font-bold hover:text-amber-900">+ Nuevo</button>
            </div>
            {vehiculos.length === 0 ? (
              <div className="px-4 pb-4">
                <button onClick={() => setModalVehiculo('nuevo')} className="w-full border-2 border-dashed border-amber-300 rounded-xl py-5 text-amber-700 font-bold text-sm hover:bg-amber-50">
                  + Agregar primer vehículo
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2 px-4 overflow-x-auto">
                  {vehiculos.map(v => {
                    const tpl = VEHICLE_TEMPLATES[v.tipo as TipoVehiculo];
                    const activo = v.id === vehiculoId;
                    return (
                      <div key={v.id} className="shrink-0 flex flex-col items-center gap-1 w-24">
                        <button
                          onClick={() => setVehiculoId(v.id)}
                          className={`w-full flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${activo ? 'bg-amber-700 border-amber-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-600'}`}
                        >
                          <span className="text-2xl">{tpl?.emoji ?? '🛻'}</span>
                          <span className="text-[10px] font-bold leading-tight text-center">{v.nombre}</span>
                          <span className={`text-[9px] ${activo ? 'text-amber-200' : 'text-stone-400'}`}>{v.rendimiento_km_lt} km/lt</span>
                        </button>
                        <button onClick={() => setModalVehiculo(v)} className="text-[9px] text-stone-400 hover:text-amber-700 font-bold">✏️ Editar</button>
                      </div>
                    );
                  })}
                </div>
                {/* Badge parámetros vehículo activo */}
                {vehiculo && (
                  <div className="mx-4 mb-3 mt-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] font-bold text-amber-700">🚀 {vehiculo.velocidad_promedio} km/h</span>
                    <span className="text-stone-300">·</span>
                    <span className="text-[10px] font-bold text-amber-700">⛽ {vehiculo.rendimiento_km_lt} km/lt</span>
                    <span className="text-stone-300">·</span>
                    <span className="text-[10px] font-bold text-amber-700">💰 {formatCLP(vehiculo.costo_desgaste_km)}/km</span>
                    <span className="text-stone-300">·</span>
                    <span className="text-[10px] font-bold text-amber-700">⛽ {formatCLP(vehiculo.precio_litro)}/lt</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Ruta */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">📍 Ruta</p>
              <button
                onClick={() => setMostrarMapa(true)}
                className="flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95"
              >
                <span>🗺️</span> Usar mapa
              </button>
            </div>

            {origenLibre && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2">
                <span className="text-green-600 text-xs">🗺️</span>
                <p className="text-green-700 text-[11px] font-bold">Ruta obtenida del mapa — distancia real por carretera</p>
                <button
                  onClick={() => { setOrigenLibre(false); setDistManual(false); }}
                  className="ml-auto text-green-600 hover:text-green-800 text-[10px] font-bold underline shrink-0"
                >Cambiar a lista</button>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-stone-400 mb-1">Cliente (opcional)</label>
              <input type="text" value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} placeholder="Nombre del cliente..." className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 font-bold text-stone-800 focus:outline-none focus:border-amber-500 text-sm" />
            </div>

            {/* Origen / Destino con swap */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-stone-400 mb-1">Origen</label>
                {origenLibre ? (
                  <input
                    type="text"
                    value={origen}
                    onChange={e => setOrigen(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 font-bold text-stone-800 focus:outline-none focus:border-amber-500 text-sm"
                  />
                ) : (
                  <select value={origen} onChange={e => { setOrigen(e.target.value); setDistManual(false); }} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 font-bold text-stone-800 focus:outline-none focus:border-amber-500 text-sm">
                    {CIUDADES_CHILE.map(c => <option key={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <button
                onClick={swapRuta}
                className="mb-0.5 w-10 h-10 shrink-0 flex items-center justify-center bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl text-amber-700 font-bold text-lg transition-all active:scale-90"
                title="Invertir ruta"
              >⇄</button>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-stone-400 mb-1">Destino</label>
                {origenLibre ? (
                  <input
                    type="text"
                    value={destino}
                    onChange={e => setDestino(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 font-bold text-stone-800 focus:outline-none focus:border-amber-500 text-sm"
                  />
                ) : (
                  <select value={destino} onChange={e => { setDestino(e.target.value); setDistManual(false); }} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 font-bold text-stone-800 focus:outline-none focus:border-amber-500 text-sm">
                    {CIUDADES_CHILE.map(c => <option key={c}>{c}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* Distancia con indicador auto/manual */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold text-stone-400">Distancia (km)</label>
                <div className="flex items-center gap-1.5">
                  {distManual && (
                    <button
                      onClick={() => { setDistManual(false); }}
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-all"
                      title="Volver al cálculo automático"
                    >↩ Auto</button>
                  )}
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${distManual ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                    {distManual ? '✏️ Manual' : '🤖 Auto'}
                  </span>
                </div>
              </div>
              <input
                type="number"
                inputMode="numeric"
                value={distanciaKm}
                onChange={e => { setDistanciaKm(e.target.value); setDistManual(true); }}
                placeholder="km..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 font-black text-amber-700 text-xl focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Ida y vuelta */}
            <div className="grid grid-cols-2 gap-2">
              {[false, true].map(val => (
                <button key={String(val)} onClick={() => setIdaYVuelta(val)} className={`py-3 rounded-xl font-bold text-sm border-2 transition-all ${idaYVuelta === val ? 'bg-amber-700 border-amber-700 text-white' : 'bg-white border-stone-200 text-stone-600'}`}>
                  {val ? '🔄 Ida y vuelta' : '➡️ Solo ida'}
                </button>
              ))}
            </div>

            {/* Badge duración estimada */}
            {vehiculo && parseFloat(distanciaKm) > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                <span className="text-blue-500">⏱️</span>
                <span className="text-blue-700 text-xs font-bold">
                  ~{formatTiempo(Math.round(((idaYVuelta ? parseFloat(distanciaKm) * 2 : parseFloat(distanciaKm)) / vehiculo.velocidad_promedio) * 60))}
                </span>
                <span className="text-blue-400 text-[10px]">de viaje</span>
              </div>
            )}
          </div>

          {/* Peajes */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">🛣️ Peajes detectados</p>
              <span className="text-[10px] font-bold text-amber-700">{formatCLP(peajesActivos.filter(p => p.seleccionado).reduce((s, p) => s + p.tarifa, 0) * (idaYVuelta ? 2 : 1))}</span>
            </div>
            {peajesActivos.length === 0 ? (
              <p className="text-stone-400 text-xs font-bold py-2">Sin peajes para esta ruta</p>
            ) : (
              <div className="space-y-1.5">
                {peajesActivos.map((p, i) => (
                  <button key={i} onClick={() => togglePeaje(i)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${p.seleccionado ? 'bg-amber-50 border-amber-200' : 'bg-stone-50 border-stone-100 opacity-50'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[10px] font-black ${p.seleccionado ? 'bg-amber-700 border-amber-700 text-white' : 'border-stone-300'}`}>{p.seleccionado ? '✓' : ''}</span>
                      <span className="text-sm font-bold text-stone-700">{p.peaje.nombre}</span>
                    </div>
                    <span className="text-sm font-black text-amber-700">{formatCLP(p.tarifa)}</span>
                  </button>
                ))}
                {idaYVuelta && <p className="text-[9px] text-stone-400 text-right">× 2 (ida y vuelta)</p>}
              </div>
            )}
          </div>

          {/* Recurso humano */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 space-y-3">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">👤 Recurso Humano</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-stone-400">Horas conductor</label>
                  <div className="flex items-center gap-1">
                    {horasManual && (
                      <button
                        onClick={() => setHorasManual(false)}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-all"
                        title="Volver al cálculo automático"
                      >↩</button>
                    )}
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${horasManual ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                      {horasManual ? '✏️' : '🤖'}
                    </span>
                  </div>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  value={horasConductor}
                  onChange={e => { setHorasConductor(e.target.value); setHorasManual(true); }}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 font-black text-stone-800 text-lg focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 mb-1">Valor hora ($)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={valorHora}
                  onChange={e => setValorHora(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 font-black text-stone-800 text-lg focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-stone-400">🍽️ Almuerzo ($)</label>
                {parseFloat(distanciaKm) > 0 && vehiculo && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${parseFloat(valorAlmuerzo) > 0 ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-400'}`}>
                    {parseFloat(valorAlmuerzo) > 0 ? '🤖 sugerido' : '🤖 no aplica'}
                  </span>
                )}
              </div>
              <input
                type="number"
                inputMode="numeric"
                value={valorAlmuerzo}
                onChange={e => setValorAlmuerzo(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 font-black text-stone-800 text-lg focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Margen */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">📊 Margen de ganancia</p>
              <span className="font-black text-amber-700 text-lg">{margen}%</span>
            </div>
            <input
              type="range" min="0" max="100"
              value={margen}
              onChange={e => { setMargen(e.target.value); guardarPrefs({ margen: e.target.value }); }}
              className="w-full accent-amber-700"
            />
            <div className="flex justify-between text-[9px] text-stone-400 mt-1">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          {/* Nota */}
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">📝 Nota (opcional)</label>
            <textarea value={nota} onChange={e => setNota(e.target.value)} rows={2} placeholder="Observaciones del flete..." className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 font-bold text-stone-800 focus:outline-none focus:border-amber-500 text-sm resize-none" />
          </div>

          {/* Desglose y acciones */}
          {desglose && (
            <DesgloseCotizacion
              desglose={desglose}
              vehiculos={vehiculos}
              vehiculoActualId={vehiculoId}
              margen={margen}
              peajesActivos={peajesActivos}
              distanciaKm={parseFloat(distanciaKm) || 0}
              idaYVuelta={idaYVuelta}
              horasConductor={horasConductor}
              valorHora={valorHora}
              valorAlmuerzo={valorAlmuerzo}
              guardando={guardando}
              vehiculoNombre={vehiculo?.nombre ?? ''}
              origen={origen}
              destino={destino}
              clienteNombre={clienteNombre}
              onGuardar={handleGuardar}
              onWhatsapp={() => vehiculo && desglose && compartirWhatsapp(desglose, {
                vehiculo: vehiculo.nombre, origen, destino,
                distanciaKm: parseFloat(distanciaKm) || 0,
                idaYVuelta, clienteNombre, peajesSeleccionados: peajesActivos,
                margenPct: parseFloat(margen) || 0,
              })}
              onPdf={() => setMostrarPdf(true)}
              onSeleccionarVehiculo={setVehiculoId}
            />
          )}
        </div>
      )}

      {/* ══ VISTA HISTORIAL ══ */}
      {vista === 'historial' && (
        <HistorialFletes
          cotizaciones={cotizaciones}
          onEliminar={eliminarCotizacion}
          onRecotizar={handleRecotizar}
        />
      )}
    </div>
  );
}
