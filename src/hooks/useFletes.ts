import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import type {
  VehiculoFlete, PeajeChile, PeajeSeleccionado,
  CotizacionFlete, DesgloseCosto, TipoVehiculo,
} from '../types';
import { formatCLP } from '../utils/fecha';

// ── Ciudades disponibles (orden geográfico) ──
export const CIUDADES_CHILE = [
  'Santiago', 'Rancagua', 'San Fernando', 'Curicó', 'Talca',
  'Linares', 'Chillán', 'Los Ángeles', 'Collipulli', 'Temuco',
  'Freire', 'Valdivia', 'Osorno', 'Puerto Montt',
  'Casablanca', 'Valparaíso', 'Viña del Mar',
  'San Antonio',
  'Los Andes', 'La Ligua', 'Los Vilos', 'La Serena', 'Copiapó',
] as const;

// ── Matriz de distancias reales (km) entre ciudades ──
// Clave: "origen|destino" (alfabético), valor: km
const _D: Record<string, number> = {
  'Rancagua|Santiago': 87,
  'San Fernando|Santiago': 143, 'Rancagua|San Fernando': 58,
  'Curicó|Santiago': 191, 'Curicó|Rancagua': 106, 'Curicó|San Fernando': 50,
  'Santiago|Talca': 257, 'Rancagua|Talca': 172, 'San Fernando|Talca': 115, 'Curicó|Talca': 65,
  'Linares|Santiago': 305, 'Linares|Rancagua': 220, 'Linares|Talca': 50, 'Curicó|Linares': 115,
  'Chillán|Santiago': 400, 'Chillán|Rancagua': 315, 'Chillán|Talca': 145, 'Chillán|Linares': 95,
  'Los Ángeles|Santiago': 510, 'Los Ángeles|Chillán': 112, 'Los Ángeles|Talca': 255, 'Linares|Los Ángeles': 207,
  'Collipulli|Santiago': 585, 'Collipulli|Los Ángeles': 75, 'Chillán|Collipulli': 187,
  'Santiago|Temuco': 677, 'Collipulli|Temuco': 92, 'Los Ángeles|Temuco': 167, 'Chillán|Temuco': 279,
  'Freire|Santiago': 710, 'Freire|Temuco': 33, 'Collipulli|Freire': 125,
  'Santiago|Valdivia': 839, 'Temuco|Valdivia': 162, 'Freire|Valdivia': 129, 'Los Ángeles|Valdivia': 329,
  'Osorno|Santiago': 921, 'Osorno|Valdivia': 107, 'Osorno|Temuco': 269, 'Freire|Osorno': 236,
  'Puerto Montt|Santiago': 1016, 'Osorno|Puerto Montt': 95, 'Puerto Montt|Valdivia': 202, 'Puerto Montt|Temuco': 364,
  'Casablanca|Santiago': 80,
  'Santiago|Valparaíso': 120, 'Casablanca|Valparaíso': 42,
  'Santiago|Viña del Mar': 122, 'Valparaíso|Viña del Mar': 8, 'Casablanca|Viña del Mar': 44,
  'San Antonio|Santiago': 109, 'Casablanca|San Antonio': 55, 'San Antonio|Valparaíso': 94,
  'Los Andes|Santiago': 80,
  'La Ligua|Santiago': 154, 'La Ligua|Los Andes': 95,
  'Los Vilos|Santiago': 228, 'La Ligua|Los Vilos': 78, 'Los Andes|Los Vilos': 170,
  'La Serena|Santiago': 470, 'La Serena|Los Vilos': 242, 'La Ligua|La Serena': 320,
  'Copiapó|Santiago': 808, 'Copiapó|La Serena': 338, 'Copiapó|Los Vilos': 580,
};

/** Obtener distancia entre dos ciudades (null si no hay dato) */
export function getDistancia(origen: string, destino: string): number | null {
  if (origen === destino) return 0;
  const o = origen === 'Viña del Mar' ? 'Valparaíso' : origen;
  const d = destino === 'Viña del Mar' ? 'Valparaíso' : destino;
  if (o === d) return (origen === 'Viña del Mar' || destino === 'Viña del Mar') ? 8 : 0;
  // Buscar en ambas direcciones (la clave siempre es alfabética)
  const k1 = `${o}|${d}`;
  const k2 = `${d}|${o}`;
  return _D[k1] ?? _D[k2] ?? null;
}

// ── Templates por tipo de vehículo ──
export const VEHICLE_TEMPLATES: Record<TipoVehiculo, {
  label: string; emoji: string;
  rendimiento: number; desgaste: number; velocidad: number; precioLitro: number;
}> = {
  camioneta:     { label: 'Camioneta',     emoji: '🛻', rendimiento: 10, desgaste: 25, velocidad: 80, precioLitro: 1550 },
  furgon:        { label: 'Furgón',        emoji: '🚐', rendimiento: 8,  desgaste: 30, velocidad: 70, precioLitro: 1550 },
  camion_chico:  { label: 'Camión 3/4',    emoji: '🚛', rendimiento: 6,  desgaste: 40, velocidad: 60, precioLitro: 1550 },
  camion_grande: { label: 'Camión Grande', emoji: '🚚', rendimiento: 4,  desgaste: 55, velocidad: 55, precioLitro: 1550 },
};

// ── localStorage memory ──
const PREFS_KEY = 'fletes_prefs';
export interface FletesPrefs {
  margen: string;
  valorHora: string;
  valorAlmuerzo: string;
  ultimoOrigen: string;
  ultimoDestino: string;
}
const DEFAULT_PREFS: FletesPrefs = {
  margen: '20', valorHora: '5000', valorAlmuerzo: '4000',
  ultimoOrigen: 'Santiago', ultimoDestino: 'Rancagua',
};
export function cargarPrefs(): FletesPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_PREFS;
}
export function guardarPrefs(p: Partial<FletesPrefs>) {
  try {
    const prev = cargarPrefs();
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prev, ...p }));
  } catch { /* ignore */ }
}

// ── Función de cálculo pura ──
export function calcularDesglose(params: {
  distanciaKm: number;
  idaYVuelta: boolean;
  rendimiento: number;
  precioLitro: number;
  costoDesgasteKm: number;
  velocidadPromedio: number;
  peajesSeleccionados: PeajeSeleccionado[];
  horasConductor: number;
  valorHoraConductor: number;
  valorAlmuerzo: number;
  margenPct: number;
}): DesgloseCosto {
  const distReal = params.idaYVuelta ? params.distanciaKm * 2 : params.distanciaKm;
  const multiplicadorPeajes = params.idaYVuelta ? 2 : 1;

  const combustible = (distReal / Math.max(params.rendimiento, 0.1)) * params.precioLitro;
  const desgaste = distReal * params.costoDesgasteKm;
  const peajes = params.peajesSeleccionados
    .filter(p => p.seleccionado)
    .reduce((sum, p) => sum + p.tarifa, 0) * multiplicadorPeajes;
  const conductor = params.horasConductor * params.valorHoraConductor;
  const almuerzo = params.valorAlmuerzo;

  const costoVehiculo = combustible + desgaste;
  const costoHumano = conductor + almuerzo + peajes;
  const costoTotal = costoVehiculo + costoHumano;
  const precioFinal = costoTotal * (1 + params.margenPct / 100);

  // Tiempo estimado total en minutos
  const vel = Math.max(params.velocidadPromedio, 1);
  const tiempoEstimadoMin = Math.round((distReal / vel) * 60);

  return {
    combustible: Math.round(combustible),
    desgaste: Math.round(desgaste),
    peajes: Math.round(peajes),
    conductor: Math.round(conductor),
    almuerzo: Math.round(almuerzo),
    costoVehiculo: Math.round(costoVehiculo),
    costoHumano: Math.round(costoHumano),
    costoTotal: Math.round(costoTotal),
    precioFinal: Math.round(precioFinal),
    tiempoEstimadoMin,
  };
}

/** Formato legible de minutos → "2h 15min" */
export function formatTiempo(min: number): string {
  if (min <= 0) return '0 min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/** Auto-calcular horas conductor sugeridas */
export function calcularHorasSugeridas(distanciaKm: number, idaYVuelta: boolean, velocidad: number): number {
  const dist = idaYVuelta ? distanciaKm * 2 : distanciaKm;
  const horas = dist / Math.max(velocidad, 1);
  // Redondear a 0.5h más cercana hacia arriba
  return Math.ceil(horas * 2) / 2;
}

/** ¿Viaje lo suficientemente largo para almuerzo? (>4h) */
export function sugiereAlmuerzo(distanciaKm: number, idaYVuelta: boolean, velocidad: number): boolean {
  const dist = idaYVuelta ? distanciaKm * 2 : distanciaKm;
  return (dist / Math.max(velocidad, 1)) > 4;
}

// ── Función para encontrar peajes entre origen y destino ──
function encontrarPeajesRuta(
  peajes: PeajeChile[],
  origen: string,
  destino: string,
  tipoVehiculo: TipoVehiculo,
): PeajeSeleccionado[] {
  const normalizar = (c: string) => c === 'Viña del Mar' ? 'Valparaíso' : c;
  const origenN = normalizar(origen);
  const destinoN = normalizar(destino);

  if (origenN === destinoN) return [];

  const rutas: Record<string, PeajeChile[]> = {};
  peajes.forEach(p => {
    if (!rutas[p.ruta]) rutas[p.ruta] = [];
    rutas[p.ruta].push(p);
  });

  const resultado: PeajeSeleccionado[] = [];

  for (const [, plazas] of Object.entries(rutas)) {
    const ordenadas = [...plazas].sort((a, b) => a.orden - b.orden);

    let idxOrigen = -1;
    let idxDestino = -1;

    for (let i = 0; i < ordenadas.length; i++) {
      if (ordenadas[i].tramo_origen === origenN || ordenadas[i].tramo_destino === origenN) {
        if (idxOrigen === -1) idxOrigen = i;
      }
      if (ordenadas[i].tramo_origen === destinoN || ordenadas[i].tramo_destino === destinoN) {
        idxDestino = i;
      }
    }

    if (idxOrigen === -1 || idxDestino === -1) continue;

    const [desde, hasta] = idxOrigen <= idxDestino ? [idxOrigen, idxDestino] : [idxDestino, idxOrigen];

    for (let i = desde; i <= hasta; i++) {
      const p = ordenadas[i];
      const esCamion = tipoVehiculo === 'camion_chico' || tipoVehiculo === 'camion_grande';
      const tarifa = esCamion && p.tarifa_camion ? p.tarifa_camion : p.tarifa_liviano;

      resultado.push({
        peaje: p,
        seleccionado: true,
        tarifa,
      });
    }
  }

  return resultado;
}

/** Detectar rutas frecuentes del historial */
export function getRutasFrecuentes(cotizaciones: CotizacionFlete[], max = 3): {
  origen: string; destino: string; distancia: number; veces: number;
}[] {
  const conteo: Record<string, { origen: string; destino: string; distancia: number; veces: number }> = {};
  cotizaciones.forEach(c => {
    const key = `${c.origen}→${c.destino}`;
    if (!conteo[key]) conteo[key] = { origen: c.origen, destino: c.destino, distancia: c.distancia_km, veces: 0 };
    conteo[key].veces++;
  });
  return Object.values(conteo).sort((a, b) => b.veces - a.veces).slice(0, max);
}

/** Comparar costos entre vehículos para la misma ruta */
export function compararVehiculos(
  vehiculos: VehiculoFlete[],
  params: {
    distanciaKm: number; idaYVuelta: boolean;
    peajesSeleccionados: PeajeSeleccionado[];
    horasConductor: number; valorHoraConductor: number;
    valorAlmuerzo: number; margenPct: number;
  }
): { vehiculo: VehiculoFlete; desglose: DesgloseCosto }[] {
  return vehiculos.map(v => ({
    vehiculo: v,
    desglose: calcularDesglose({
      ...params,
      rendimiento: v.rendimiento_km_lt,
      precioLitro: v.precio_litro,
      costoDesgasteKm: v.costo_desgaste_km,
      velocidadPromedio: v.velocidad_promedio,
    }),
  })).sort((a, b) => a.desglose.precioFinal - b.desglose.precioFinal);
}

// ── Generar texto resumen de cotización (reutilizable para WhatsApp y clipboard) ──
export function generarTextoResumen(
  desglose: DesgloseCosto,
  params: {
    vehiculo: string;
    origen: string;
    destino: string;
    distanciaKm: number;
    idaYVuelta: boolean;
    clienteNombre: string;
    peajesSeleccionados: PeajeSeleccionado[];
    margenPct: number;
  }
): string {
  const peajesActivos = params.peajesSeleccionados.filter(p => p.seleccionado);
  let msg = `🚛 *COTIZACIÓN DE FLETE*\n`;
  if (params.clienteNombre) msg += `👤 Cliente: ${params.clienteNombre}\n`;
  msg += `\n📍 *Ruta:* ${params.origen} → ${params.destino}\n`;
  msg += `📏 Distancia: ${params.distanciaKm} km${params.idaYVuelta ? ' (ida y vuelta)' : ' (solo ida)'}\n`;
  msg += `🛻 Vehículo: ${params.vehiculo}\n`;
  msg += `⏱️ Tiempo estimado: ~${formatTiempo(desglose.tiempoEstimadoMin)}\n`;
  msg += `\n━━━━━━━━━━━━━━━\n`;
  msg += `🔧 *COSTOS VEHÍCULO*\n`;
  msg += `  ⛽ Combustible: ${formatCLP(desglose.combustible)}\n`;
  msg += `  🔩 Desgaste: ${formatCLP(desglose.desgaste)}\n`;
  msg += `\n👤 *COSTOS OPERADOR*\n`;
  msg += `  🕐 Conductor: ${formatCLP(desglose.conductor)}\n`;
  msg += `  🍽️ Almuerzo: ${formatCLP(desglose.almuerzo)}\n`;
  if (peajesActivos.length > 0) {
    msg += `  🛣️ Peajes: ${formatCLP(desglose.peajes)}\n`;
    peajesActivos.forEach(p => { msg += `    • ${p.peaje.nombre}: ${formatCLP(p.tarifa)}\n`; });
  }
  msg += `\n━━━━━━━━━━━━━━━\n`;
  msg += `💰 Costo total: ${formatCLP(desglose.costoTotal)}\n`;
  if (params.margenPct > 0) msg += `📊 Margen: ${params.margenPct}%\n`;
  msg += `\n✅ *PRECIO FINAL: ${formatCLP(desglose.precioFinal)}*\n`;
  return msg;
}

// ── Hook principal ──
export function useFletes(miId: string) {
  const [vehiculos, setVehiculos] = useState<VehiculoFlete[]>([]);
  const [peajes, setPeajes] = useState<PeajeChile[]>([]);
  const [cotizaciones, setCotizaciones] = useState<CotizacionFlete[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);

  // ── Cargar datos iniciales ──
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    const [vRes, pRes, cRes] = await Promise.all([
      supabase.from('vehiculos_flete').select('*').eq('tienda_id', miId).order('created_at'),
      supabase.from('peajes_chile').select('*').order('ruta').order('orden'),
      supabase.from('cotizaciones_flete').select('*').eq('tienda_id', miId).order('created_at', { ascending: false }).limit(50),
    ]);
    if (vRes.data) setVehiculos(vRes.data);
    if (pRes.data) setPeajes(pRes.data);
    if (cRes.data) setCotizaciones(cRes.data);
    setCargando(false);
  }, [miId]);

  useEffect(() => {
    if (miId) cargarDatos();
  }, [miId, cargarDatos]);

  // ── CRUD Vehículos ──
  const crearVehiculo = async (v: Omit<VehiculoFlete, 'id' | 'tienda_id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('vehiculos_flete')
      .insert({ ...v, tienda_id: miId })
      .select()
      .single();
    if (error) { alert('Error al crear vehículo: ' + error.message); return null; }
    setVehiculos(prev => [...prev, data]);
    return data;
  };

  const actualizarVehiculo = async (id: string, v: Partial<VehiculoFlete>) => {
    const { error } = await supabase
      .from('vehiculos_flete')
      .update(v)
      .eq('id', id);
    if (error) { alert('Error: ' + error.message); return; }
    setVehiculos(prev => prev.map(x => x.id === id ? { ...x, ...v } : x));
  };

  const eliminarVehiculo = async (id: string) => {
    const { error } = await supabase.from('vehiculos_flete').delete().eq('id', id);
    if (error) { alert('Error: ' + error.message); return; }
    setVehiculos(prev => prev.filter(x => x.id !== id));
  };

  // ── Buscar peajes automáticos ──
  const buscarPeajes = (origen: string, destino: string, tipoVehiculo: TipoVehiculo): PeajeSeleccionado[] => {
    return encontrarPeajesRuta(peajes, origen, destino, tipoVehiculo);
  };

  // ── Guardar cotización ──
  const guardarCotizacion = async (params: {
    vehiculo: VehiculoFlete;
    clienteNombre: string;
    origen: string;
    destino: string;
    distanciaKm: number;
    idaYVuelta: boolean;
    peajesSeleccionados: PeajeSeleccionado[];
    horasConductor: number;
    valorHoraConductor: number;
    valorAlmuerzo: number;
    margenPct: number;
    nota: string;
  }) => {
    setGuardando(true);
    const desglose = calcularDesglose({
      distanciaKm: params.distanciaKm,
      idaYVuelta: params.idaYVuelta,
      rendimiento: params.vehiculo.rendimiento_km_lt,
      precioLitro: params.vehiculo.precio_litro,
      costoDesgasteKm: params.vehiculo.costo_desgaste_km,
      velocidadPromedio: params.vehiculo.velocidad_promedio,
      peajesSeleccionados: params.peajesSeleccionados,
      horasConductor: params.horasConductor,
      valorHoraConductor: params.valorHoraConductor,
      valorAlmuerzo: params.valorAlmuerzo,
      margenPct: params.margenPct,
    });

    const peajesDetalle = params.peajesSeleccionados
      .filter(p => p.seleccionado)
      .map(p => ({ nombre: p.peaje.nombre, monto: p.tarifa }));

    // Guardar preferencias en localStorage
    guardarPrefs({
      margen: params.margenPct.toString(),
      valorHora: params.valorHoraConductor.toString(),
      valorAlmuerzo: params.valorAlmuerzo.toString(),
      ultimoOrigen: params.origen,
      ultimoDestino: params.destino,
    });

    const row = {
      tienda_id: miId,
      vehiculo_id: params.vehiculo.id,
      vehiculo_nombre: params.vehiculo.nombre,
      cliente_nombre: params.clienteNombre || null,
      origen: params.origen,
      destino: params.destino,
      distancia_km: params.distanciaKm,
      ida_y_vuelta: params.idaYVuelta,
      costo_combustible: desglose.combustible,
      costo_desgaste: desglose.desgaste,
      costo_peajes: desglose.peajes,
      costo_conductor: desglose.conductor,
      costo_almuerzo: desglose.almuerzo,
      horas_conductor: params.horasConductor,
      valor_hora_conductor: params.valorHoraConductor,
      valor_almuerzo: params.valorAlmuerzo,
      margen_pct: params.margenPct,
      costo_total: desglose.costoTotal,
      precio_final: desglose.precioFinal,
      nota: params.nota || null,
      peajes_detalle: peajesDetalle,
    };

    const { data, error } = await supabase
      .from('cotizaciones_flete')
      .insert(row)
      .select()
      .single();

    setGuardando(false);
    if (error) { alert('Error al guardar: ' + error.message); return null; }
    setCotizaciones(prev => [data, ...prev]);
    setExito(true);
    setTimeout(() => setExito(false), 2500);
    return data;
  };

  // ── Eliminar cotización ──
  const eliminarCotizacion = async (id: string) => {
    const { error } = await supabase.from('cotizaciones_flete').delete().eq('id', id);
    if (error) { alert('Error: ' + error.message); return; }
    setCotizaciones(prev => prev.filter(x => x.id !== id));
  };

  // ── Compartir por WhatsApp ──
  const compartirWhatsapp = (desglose: DesgloseCosto, params: {
    vehiculo: string;
    origen: string;
    destino: string;
    distanciaKm: number;
    idaYVuelta: boolean;
    clienteNombre: string;
    peajesSeleccionados: PeajeSeleccionado[];
    margenPct: number;
  }) => {
    const msg = generarTextoResumen(desglose, params);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return {
    vehiculos, peajes, cotizaciones,
    cargando, guardando, exito,
    crearVehiculo, actualizarVehiculo, eliminarVehiculo,
    buscarPeajes, guardarCotizacion, eliminarCotizacion,
    compartirWhatsapp, cargarDatos,
  };
}
