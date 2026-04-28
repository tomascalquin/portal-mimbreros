import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { EntidadBancaria, ProductoUnificado, LineaVenta, ResumenDia, ResumenLinea, MetodoPago } from '../types';
import { esDeSemana, fechaEnSantiago } from '../utils/fecha';

export function useVentas(miId: string) {
  const [catalogoUnificado, setCatalogoUnificado] = useState<ProductoUnificado[]>([]);
  const [bancos, setBancos] = useState<EntidadBancaria[]>([]);
  const [ventas, setVentas] = useState<any[]>([]);
  const [todasLasVentas, setTodasLasVentas] = useState<any[]>([]);
  const [offsetSemana, setOffsetSemana] = useState(0);
  const [cargandoResumen, setCargandoResumen] = useState(false);
  const [errorVentas, setErrorVentas] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    if (miId) {
      cargarCatalogos();
      cargarBancos();
    }
  }, [miId]);

  async function cargarBancos() {
    const { data } = await supabase.from('entidades_bancarias').select('*').eq('tienda_id', miId).order('nombre');
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

  async function cargarVentas(offset = 0) {
    setCargandoResumen(true);
    setErrorVentas(null);
    const { data, error } = await supabase.from('ventas').select('*')
      .eq('tienda_id', miId)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) {
      console.error('Error cargarVentas:', error);
      setErrorVentas(error.message);
    }
    if (data) {
      setTodasLasVentas(data);
      setVentas(data.filter(v => esDeSemana(v.created_at, offset)));
    }
    setCargandoResumen(false);
  }

  const cambiarSemana = (nuevoOffset: number) => {
    setOffsetSemana(nuevoOffset);
    setVentas(todasLasVentas.filter(v => esDeSemana(v.created_at, nuevoOffset)));
  };

  const registrarVenta = async (
    lineas: LineaVenta[],
    metodoPago: MetodoPago,
    entidadBancariaId: string,
    fechaVenta: string,
    onSuccess: () => void
  ) => {
    if (lineas.length === 0) return alert('Agrega al menos un producto.');
    setGuardando(true);

    const dateObj = new Date(`${fechaVenta}T12:00:00`);

    for (const linea of lineas) {
      const esUuid = linea.origen === 'vitrina' && linea.producto_id != null;
      const { error: insertError } = await supabase.from('ventas').insert({
        tienda_id: miId,
        producto_id: esUuid ? linea.producto_id : null,
        nombre_producto: linea.nombre, cantidad: linea.cantidad,
        precio_unitario: linea.precio_unitario,
        total: linea.cantidad * linea.precio_unitario,
        metodo_pago: metodoPago,
        banco_id: metodoPago === 'Transferencia' && entidadBancariaId ? entidadBancariaId : null,
        created_at: dateObj.toISOString()
      });
      if (insertError) {
        console.error('Error registrando venta:', insertError);
        setGuardando(false);
        alert(`❌ Error al registrar la venta: ${insertError.message}`);
        return;
      }
      if (linea.producto_id && linea.origen !== 'manual') {
        const tabla = linea.origen === 'vitrina' ? 'productos' : 'articulos_maestro';
        const prod = catalogoUnificado.find(p => p.id === linea.producto_id);
        if (prod && prod.stock != null)
          await supabase.from(tabla).update({ stock: Math.max(0, prod.stock - linea.cantidad) }).eq('id', linea.producto_id);
      }
    }

    await cargarCatalogos();
    await cargarVentas(offsetSemana);
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
    ventas.forEach(v => {
      const fecha = fechaEnSantiago(v.created_at);
      if (!map[fecha]) map[fecha] = { fecha, efectivo: 0, transferencia: 0, total: 0, ventas: 0, lineasEfectivo: [], lineasTransferencia: [], desgloseBancos: {}, ventasOriginales: [] };
      map[fecha].ventas++;
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

  const totalSemana = ventas.reduce((s, v) => s + v.total, 0);
  const totalEfectivo = ventas.filter(v => v.metodo_pago === 'Efectivo').reduce((s, v) => s + v.total, 0);
  const totalTransferencia = ventas.filter(v => v.metodo_pago === 'Transferencia').reduce((s, v) => s + v.total, 0);

  return {
    catalogoUnificado,
    bancos,
    ventas,
    offsetSemana,
    cargandoResumen,
    errorVentas,
    guardando,
    exito,
    cargarVentas,
    cambiarSemana,
    registrarVenta,
    agrupadoPorDia,
    totalSemana,
    totalEfectivo,
    totalTransferencia,
  };
}