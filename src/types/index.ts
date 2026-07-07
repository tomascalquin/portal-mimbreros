// ─── Tipos compartidos de la aplicación ─────────────────────────────────────

export type MetodoPago = 'Efectivo' | 'Transferencia';
export type OrigenProducto = 'vitrina' | 'compras';

export interface EntidadBancaria {
  id: string;
  nombre: string;
  numero_cuenta?: string;
  titular?: string;
}

export interface ProductoUnificado {
  id: string;
  nombre: string;
  precio: number;
  foto_url?: string | null;
  stock?: number | null;
  origen: OrigenProducto;
}

export interface LineaVenta {
  producto_id: string | null;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  foto_url?: string | null;
  origen: OrigenProducto | 'manual';
}

export interface ResumenLinea {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
}

export interface ResumenDia {
  fecha: string;
  efectivo: number;
  transferencia: number;
  total: number;
  ventas: number;
  lineasEfectivo: ResumenLinea[];
  lineasTransferencia: ResumenLinea[];
  desgloseBancos: Record<string, { nombre: string; total: number }>;
  ventasOriginales: any[];
}

// ─── Tipos del Cotizador de Fletes ──────────────────────────────────────────

export type TipoVehiculo = 'camioneta' | 'furgon' | 'camion_chico' | 'camion_grande';

export interface VehiculoFlete {
  id: string;
  tienda_id: string;
  nombre: string;
  tipo: TipoVehiculo;
  rendimiento_km_lt: number;
  precio_litro: number;
  costo_desgaste_km: number;
  velocidad_promedio: number;
  created_at?: string;
}

export interface PeajeChile {
  id: string;
  nombre: string;
  ruta: string;
  tramo_origen: string;
  tramo_destino: string;
  tarifa_liviano: number;
  tarifa_camion: number | null;
  orden: number;
}

export interface PeajeSeleccionado {
  peaje: PeajeChile;
  seleccionado: boolean;
  tarifa: number; // tarifa según tipo de vehículo
}

export interface CotizacionFlete {
  id: string;
  tienda_id: string;
  vehiculo_id: string | null;
  vehiculo_nombre: string | null;
  cliente_nombre: string | null;
  origen: string;
  destino: string;
  distancia_km: number;
  ida_y_vuelta: boolean;
  costo_combustible: number;
  costo_desgaste: number;
  costo_peajes: number;
  costo_conductor: number;
  costo_almuerzo: number;
  horas_conductor: number;
  valor_hora_conductor: number;
  valor_almuerzo: number;
  margen_pct: number;
  costo_total: number;
  precio_final: number;
  nota: string | null;
  peajes_detalle: { nombre: string; monto: number }[];
  created_at?: string;
}

export interface DesgloseCosto {
  combustible: number;
  desgaste: number;
  peajes: number;
  conductor: number;
  almuerzo: number;
  costoVehiculo: number;
  costoHumano: number;
  costoTotal: number;
  precioFinal: number;
  tiempoEstimadoMin: number; // Tiempo total estimado del viaje en minutos
}
