import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { EntidadBancaria, ProductoUnificado, LineaVenta, ResumenDia, ResumenLinea, MetodoPago } from '../types';
import { fechaEnSantiago } from '../utils/fecha';

export type Periodo = 'semana' | 'mes' | 'anio';

export function useVentas(miId: string) {
  const [catalogoUnificado, setCatalogoUnificado] = useState<ProductoUnificado[]>([]);
  const [bancos, setBancos] = useState<EntidadBancaria[]>([]);
  const [ventas, setVentas] = useState<any[]>([]);

  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [offsetPeriodo, setOffsetPeriodo] = useState(0);
  const [cargandoResumen, setCargandoResumen] = useState(false);
  const [errorVentas, setErrorVentas] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);

  // offsetSemana kept for backward compat (used in export functions)
  const offsetSemana = periodo === 'semana' ? offsetPeriodo : 0;

  useEffect(() => {
    if (miId) {
      cargarCatalogos();
      cargarBancos();
    }
  }, [miId]);

  async function cargarBancos() {
    const { data } = await supabase.from('entidades_bancarias').select('id, nombre, numero_cuenta').eq('tienda_id', miId).order('nombre');
    if (data) { setBancos(data); }
  }

  async function cargarCatalogos() {
    const [{ data: vitrina }, { data: compras }] = await Promise.all([
      supabase.from('productos').select('id, nombre, precio, foto_url, stock').eq('tienda_id', miId).eq('visible', true).order('nombre'),
      supabase.from('articulos_maestro').select('id, nombre, precio_costo, precio_venta, foto_url, stock').eq('tienda_id', miId).order('nombre'),
    ]);
    const vitrinaMapped: ProductoUnificado[] = (vitrina || []).map(p => ({ ...p, origen: 'vitrina' as const }));
    const comprasMapped: ProductoUnificado[] = (compras || []).map(p => ({
      id: p.id, nombre: p.nombre,
      precio: p.precio_venta > 0 ? p.precio_venta : p.precio_costo,
      foto_url: p.foto_url, stock: p.stock, origen: 'compras' as const,
    }));
    setCatalogoUnificado([...vitrinaMapped, ...comprasMapped]);
  }

  const TZ = 'America/Santiago';

  function rangoSemana(offset: number): { inicio: string; fin: string; label: string } {
    const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
    const dia = ahora.getDay();
    const diffLunes = (dia === 0 ? -6 : 1 - dia) + offset * 7;
    const lunes = new Date(ahora);
    lunes.setDate(ahora.getDate() + diffLunes);
    lunes.setHours(0, 0, 0, 0);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    domingo.setHours(23, 59, 59, 999);
    const label = offset === 0 ? 'Semana actual' : offset === -1 ? 'Semana pasada' : `Hace ${Math.abs(offset)} semanas`;
    return { inicio: lunes.toISOString(), fin: domingo.toISOString(), label };
  }

  function rangoMes(offset: number): { inicio: string; fin: string; label: string } {
    const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
    const año = ahora.getFullYear();
    const mes = ahora.getMonth() + offset; // puede ser negativo, Date lo maneja
    const primerDia = new Date(año, mes, 1, 0, 0, 0, 0);
    const ultimoDia = new Date(año, mes + 1, 0, 23, 59, 59, 999);
    const label = primerDia.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    const labelCap = label.charAt(0).toUpperCase() + label.slice(1);
    return { inicio: primerDia.toISOString(), fin: ultimoDia.toISOString(), label: labelCap };
  }

  function rangoAnio(offset: number): { inicio: string; fin: string; label: string } {
    const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
    const año = ahora.getFullYear() + offset;
    const inicio = new Date(año, 0, 1, 0, 0, 0, 0);
    const fin = new Date(año, 11, 31, 23, 59, 59, 999);
    return { inicio: inicio.toISOString(), fin: fin.toISOString(), label: String(año) };
  }

  function getRango(p: Periodo, offset: number) {
    if (p === 'semana') return rangoSemana(offset);
    if (p === 'mes') return rangoMes(offset);
    return rangoAnio(offset);
  }

  // ─── 1 sola query por carga ──────────────────────────────────────────────
  async function cargarVentas(offset = 0, p: Periodo = periodo) {
    setCargandoResumen(true);
    setErrorVentas(null);
    const { inicio, fin } = getRango(p, offset);
    const { data, error } = await supabase
      .from('ventas')
      .select('id, venta_id, created_at, nombre_producto, cantidad, precio_unitario, total, metodo_pago, banco_id, producto_id')
      .eq('tienda_id', miId)
      .gte('created_at', inicio)
      .lte('created_at', fin)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error cargarVentas:', error);
      setErrorVentas(error.message);
    }
    if (data) setVentas(data);
    setCargandoResumen(false);
  }

  const cambiarSemana = (nuevoOffset: number) => {
    setOffsetPeriodo(nuevoOffset);
    cargarVentas(nuevoOffset, 'semana');
  };

  const cambiarPeriodo = (nuevoPeriodo: Periodo) => {
    setPeriodo(nuevoPeriodo);
    setOffsetPeriodo(0);
    cargarVentas(0, nuevoPeriodo);
  };

  const cambiarOffset = (nuevoOffset: number) => {
    setOffsetPeriodo(nuevoOffset);
    cargarVentas(nuevoOffset, periodo);
  };

  // Etiqueta del período actual
  const labelPeriodoActual = getRango(periodo, offsetPeriodo).label;

  const registrarVenta = async (
    lineas: LineaVenta[],
    metodoPago: MetodoPago,
    entidadBancariaId: string,
    fechaVenta: string,
    onSuccess: () => void
  ) => {
    if (lineas.length === 0) return alert('Agrega al menos un producto.');
    setGuardando(true);

    const hoyStr = fechaEnSantiago(new Date());
    let isoDate: string;
    if (fechaVenta === hoyStr) {
      // Si la venta es de hoy, usamos la hora exacta actual
      isoDate = new Date().toISOString();
    } else {
      // Si es de otro día (retroactiva), la dejamos al mediodía local de Chile
      isoDate = new Date(`${fechaVenta}T12:00:00`).toISOString();
    }
    
    // Un único UUID agrupa todas las líneas de esta compra como una sola transacción
    const ventaId = crypto.randomUUID();

    const registros = lineas.map(linea => ({
      tienda_id: miId,
      venta_id: ventaId,
      producto_id: linea.origen === 'vitrina' && linea.producto_id != null ? linea.producto_id : null,
      nombre_producto: linea.nombre,
      cantidad: linea.cantidad,
      precio_unitario: linea.precio_unitario,
      total: linea.cantidad * linea.precio_unitario,
      metodo_pago: metodoPago,
      banco_id: metodoPago === 'Transferencia' && entidadBancariaId ? entidadBancariaId : null,
      created_at: isoDate,
    }));

    const { error: insertError } = await supabase.from('ventas').insert(registros);
    if (insertError) {
      console.error('Error registrando venta:', insertError);
      setGuardando(false);
      alert(`❌ Error al registrar la venta: ${insertError.message}`);
      return;
    }

    const lineasConStock = lineas.filter(l => l.producto_id && l.origen !== 'manual');
    if (lineasConStock.length > 0) {
      await Promise.all(lineasConStock.map(linea => {
        const tabla = linea.origen === 'vitrina' ? 'productos' : 'articulos_maestro';
        const prod = catalogoUnificado.find(p => p.id === linea.producto_id);
        if (!prod || prod.stock == null) return Promise.resolve();
        return supabase.from(tabla).update({ stock: Math.max(0, prod.stock - linea.cantidad) }).eq('id', linea.producto_id);
      }));
    }

    setCatalogoUnificado(prev => prev.map(p => {
      const linea = lineas.find(l => l.producto_id === p.id && l.origen !== 'manual');
      if (linea && p.stock != null) return { ...p, stock: Math.max(0, p.stock - linea.cantidad) };
      return p;
    }));

    const nuevasVentas = lineas.map(linea => ({
      id: crypto.randomUUID(),
      venta_id: ventaId,
      created_at: isoDate,
      nombre_producto: linea.nombre,
      cantidad: linea.cantidad,
      precio_unitario: linea.precio_unitario,
      total: linea.cantidad * linea.precio_unitario,
      metodo_pago: metodoPago,
      banco_id: metodoPago === 'Transferencia' && entidadBancariaId ? entidadBancariaId : null,
      producto_id: linea.origen === 'vitrina' ? linea.producto_id : null,
    }));
    setVentas(prev => [...nuevasVentas, ...prev]);
    setGuardando(false);
    setExito(true);
    setTimeout(() => setExito(false), 2500);
    onSuccess();
  };

  const agruparLinea = (lista: ResumenLinea[], v: any) => {
    const existente = lista.find(l => l.nombre === v.nombre_producto && l.precio_unitario === v.precio_unitario);
    if (existente) {
      existente.cantidad += v.cantidad;
      existente.total += v.total;
    } else {
      lista.push({ nombre: v.nombre_producto, cantidad: v.cantidad, precio_unitario: v.precio_unitario, total: v.total });
    }
  };

  const agrupadoPorDia = (): ResumenDia[] => {
    const map: Record<string, ResumenDia> = {};
    // Rastreamos venta_ids únicos por día para contar transacciones reales
    const ventasUnicasPorDia: Record<string, Set<string>> = {};
    ventas.forEach(v => {
      const fecha = fechaEnSantiago(v.created_at);
      if (!map[fecha]) {
        map[fecha] = { fecha, efectivo: 0, transferencia: 0, total: 0, ventas: 0, lineasEfectivo: [], lineasTransferencia: [], desgloseBancos: {}, ventasOriginales: [] };
        ventasUnicasPorDia[fecha] = new Set();
      }
      // Contar la transacción solo una vez por venta_id (o por id si no hay venta_id)
      const keyVenta = v.venta_id || v.id;
      ventasUnicasPorDia[fecha].add(keyVenta);
      map[fecha].ventas = ventasUnicasPorDia[fecha].size;
      map[fecha].total += v.total;
      map[fecha].ventasOriginales.push(v);
      if (v.metodo_pago === 'Efectivo') {
        map[fecha].efectivo += v.total;
        agruparLinea(map[fecha].lineasEfectivo, v);
      } else {
        map[fecha].transferencia += v.total;
        agruparLinea(map[fecha].lineasTransferencia, v);
        if (v.banco_id) {
          const banco = bancos.find(b => b.id === v.banco_id);
          const nombreBanco = banco?.nombre || 'Sin banco';
          if (!map[fecha].desgloseBancos[v.banco_id]) {
            map[fecha].desgloseBancos[v.banco_id] = { nombre: nombreBanco, total: 0 };
          }
          map[fecha].desgloseBancos[v.banco_id].total += v.total;
        } else {
          const key = '__sin_banco__';
          if (!map[fecha].desgloseBancos[key]) {
            map[fecha].desgloseBancos[key] = { nombre: 'Sin cuenta asignada', total: 0 };
          }
          map[fecha].desgloseBancos[key].total += v.total;
        }
      }
    });
    return Object.values(map).sort((a, b) => b.fecha.localeCompare(a.fecha));
  };

  // ─── Métricas (calculadas en frontend, 0 queries extra) ─────────────────
  const calcularMetricas = () => {
    if (ventas.length === 0) return null;

    // Top productos por cantidad
    const porCantidad: Record<string, { nombre: string; cantidad: number; total: number }> = {};
    ventas.forEach(v => {
      const k = v.nombre_producto;
      if (!porCantidad[k]) porCantidad[k] = { nombre: k, cantidad: 0, total: 0 };
      porCantidad[k].cantidad += v.cantidad;
      porCantidad[k].total += v.total;
    });
    const topCantidad = Object.values(porCantidad).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);
    const topMonto = Object.values(porCantidad).sort((a, b) => b.total - a.total).slice(0, 5);

    // Mejor día de la semana
    const porDiaSemana: Record<number, { nombre: string; total: number; count: number }> = {};
    const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    ventas.forEach(v => {
      const d = new Date(v.created_at).getDay();
      if (!porDiaSemana[d]) porDiaSemana[d] = { nombre: DIAS[d], total: 0, count: 0 };
      porDiaSemana[d].total += v.total;
      porDiaSemana[d].count++;
    });
    const mejorDia = Object.values(porDiaSemana).sort((a, b) => b.total - a.total)[0] || null;

    // Totales
    const totalPeriodo = ventas.reduce((s, v) => s + v.total, 0);
    const totalEfectivo = ventas.filter(v => v.metodo_pago === 'Efectivo').reduce((s, v) => s + v.total, 0);
    const totalTransferencia = ventas.filter(v => v.metodo_pago === 'Transferencia').reduce((s, v) => s + v.total, 0);
    // Contar transacciones únicas (un cliente puede comprar varios productos en una sola venta)
    const ventasUnicas = new Set(ventas.map(v => v.venta_id || v.id));
    const numTransacciones = ventasUnicas.size;
    const ticketPromedio = numTransacciones > 0 ? totalPeriodo / numTransacciones : 0;

    // Días únicos con ventas
    const diasUnicos = new Set(ventas.map(v => fechaEnSantiago(v.created_at))).size;
    const ventasPorDia = diasUnicos > 0 ? numTransacciones / diasUnicos : 0;

    const pctEfectivo = totalPeriodo > 0 ? (totalEfectivo / totalPeriodo) * 100 : 0;
    const pctTransferencia = totalPeriodo > 0 ? (totalTransferencia / totalPeriodo) * 100 : 0;

    return {
      topCantidad,
      topMonto,
      mejorDia,
      totalPeriodo,
      totalEfectivo,
      totalTransferencia,
      numTransacciones,
      ticketPromedio,
      diasUnicos,
      ventasPorDia,
      pctEfectivo,
      pctTransferencia,
    };
  };

  const totalSemana = ventas.reduce((s, v) => s + v.total, 0);
  const totalEfectivo = ventas.filter(v => v.metodo_pago === 'Efectivo').reduce((s, v) => s + v.total, 0);
  const totalTransferencia = ventas.filter(v => v.metodo_pago === 'Transferencia').reduce((s, v) => s + v.total, 0);

  return {
    catalogoUnificado,
    bancos,
    ventas,
    periodo,
    offsetPeriodo,
    offsetSemana,
    labelPeriodoActual,
    cargandoResumen,
    errorVentas,
    guardando,
    exito,
    cargarVentas,
    cambiarSemana,
    cambiarPeriodo,
    cambiarOffset,
    registrarVenta,
    agrupadoPorDia,
    calcularMetricas,
    totalSemana,
    totalEfectivo,
    totalTransferencia,
  };
}