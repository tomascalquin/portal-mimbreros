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
