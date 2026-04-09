import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

type MetodoPago = 'Efectivo' | 'Transferencia';
type OrigenProducto = 'vitrina' | 'compras';

interface ProductoUnificado {
  id: string;
  nombre: string;
  precio: number;
  foto_url?: string | null;
  stock?: number | null;
  origen: OrigenProducto;
}

interface LineaVenta {
  producto_id: string | null;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  foto_url?: string | null;
  origen: OrigenProducto | 'manual';
}

interface ResumenLinea {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
}

interface ResumenDia {
  fecha: string;
  efectivo: number;
  transferencia: number;
  total: number;
  ventas: number;
  lineasEfectivo: ResumenLinea[];
  lineasTransferencia: ResumenLinea[];
}

const formatCLP = (n: number) => `$${n.toLocaleString('es-CL')}`;

const semanaActual = () => {
  const hoy = new Date();
  const dia = hoy.getDay(); // 0=dom
  const diffLunes = dia === 0 ? -6 : 1 - dia;

  // Trabajamos con fechas locales (YYYY-MM-DD) para no depender de UTC
  const toLocalISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diffLunes);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  // El filtro en Supabase: desde inicio del lunes local hasta fin del domingo local
  // Usamos >= 'YYYY-MM-DD' y < 'YYYY-MM-DD' del lunes siguiente (más robusto que 23:59:59)
  const lunesStr = toLocalISO(lunes);
  const proximoLunes = new Date(domingo);
  proximoLunes.setDate(domingo.getDate() + 1);
  const proximoLunesStr = toLocalISO(proximoLunes);

  return { inicio: lunes, fin: domingo, lunesStr, proximoLunesStr };
};

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });

const BADGE: Record<OrigenProducto | 'manual', { label: string; cls: string }> = {
  vitrina: { label: 'Vitrina',  cls: 'bg-blue-50 text-blue-600' },
  compras: { label: 'Compras',  cls: 'bg-amber-50 text-amber-700' },
  manual:  { label: 'Manual',   cls: 'bg-stone-100 text-stone-500' },
};

// ─────────────────────────────────────────────
// SUB-COMPONENTE: Tarjeta de día expandible
// ─────────────────────────────────────────────
function TarjetaDia({ dia }: { dia: ResumenDia }) {
  const [expandido, setExpandido] = useState(false);
  const formatCLP = (n: number) => `$${n.toLocaleString('es-CL')}`;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      {/* CABECERA */}
      <button
        onClick={() => setExpandido(e => !e)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-stone-50 transition-colors"
      >
        <div>
          <p className="font-bold text-stone-800 capitalize text-sm">{formatFecha(dia.fecha)}</p>
          <p className="text-stone-400 text-xs mt-0.5">{dia.ventas} transacc. · toca para ver detalle</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-black text-stone-800 text-lg">{formatCLP(dia.total)}</span>
          <span className={`text-stone-400 font-bold text-lg transition-transform ${expandido ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>

      {/* RESUMEN CHIPS (siempre visible) */}
      <div className="grid grid-cols-2 gap-2 px-4 pb-3">
        {dia.efectivo > 0 && (
          <div className="bg-green-50 rounded-xl px-3 py-2 flex justify-between items-center">
            <span className="text-green-700 text-xs font-bold">💵 Efectivo</span>
            <span className="text-green-800 font-black text-xs">{formatCLP(dia.efectivo)}</span>
          </div>
        )}
        {dia.transferencia > 0 && (
          <div className="bg-blue-50 rounded-xl px-3 py-2 flex justify-between items-center">
            <span className="text-blue-700 text-xs font-bold">🏦 Transf.</span>
            <span className="text-blue-800 font-black text-xs">{formatCLP(dia.transferencia)}</span>
          </div>
        )}
      </div>

      {/* DESGLOSE EXPANDIBLE */}
      {expandido && (
        <div className="border-t border-stone-100 animate-in fade-in slide-in-from-top-1">

          {/* ── EFECTIVO ── */}
          {dia.lineasEfectivo.length > 0 && (
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest">💵 Efectivo</p>
              </div>
              <div className="space-y-1.5">
                {dia.lineasEfectivo.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 bg-green-50/60 rounded-lg px-3 py-2">
                    <span className="text-xs text-green-700 font-bold w-6 text-center shrink-0">{l.cantidad}x</span>
                    <span className="flex-1 text-xs font-semibold text-stone-700 truncate">{l.nombre}</span>
                    <span className="text-xs font-black text-green-800 shrink-0">{formatCLP(l.total)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-2 px-1">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Subtotal efectivo</span>
                <span className="text-sm font-black text-green-700">{formatCLP(dia.efectivo)}</span>
              </div>
            </div>
          )}

          {/* SEPARADOR */}
          {dia.lineasEfectivo.length > 0 && dia.lineasTransferencia.length > 0 && (
            <div className="mx-4 border-t border-stone-100 my-1"></div>
          )}

          {/* ── TRANSFERENCIA ── */}
          {dia.lineasTransferencia.length > 0 && (
            <div className="px-4 pt-2 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">🏦 Transferencia</p>
              </div>
              <div className="space-y-1.5">
                {dia.lineasTransferencia.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 bg-blue-50/60 rounded-lg px-3 py-2">
                    <span className="text-xs text-blue-700 font-bold w-6 text-center shrink-0">{l.cantidad}x</span>
                    <span className="flex-1 text-xs font-semibold text-stone-700 truncate">{l.nombre}</span>
                    <span className="text-xs font-black text-blue-800 shrink-0">{formatCLP(l.total)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-2 px-1">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Subtotal transf.</span>
                <span className="text-sm font-black text-blue-700">{formatCLP(dia.transferencia)}</span>
              </div>
            </div>
          )}

          {/* TOTAL DÍA */}
          <div className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex justify-between items-center">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Total del día</span>
            <span className="font-black text-amber-800 text-base">{formatCLP(dia.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PestanaVentas({ miId }: { miId: string }) {
  const [vista, setVista] = useState<'pos' | 'resumen'>('pos');
  const [catalogoUnificado, setCatalogoUnificado] = useState<ProductoUnificado[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroOrigen, setFiltroOrigen] = useState<'todos' | OrigenProducto>('todos');
  const [mostrarSelector, setMostrarSelector] = useState(false);
  const buscadorRef = useRef<HTMLInputElement>(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoUnificado | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [precioVenta, setPrecioVenta] = useState('');
  const [modoManual, setModoManual] = useState(false);
  const [manualNombre, setManualNombre] = useState('');
  const [manualCantidad, setManualCantidad] = useState(1);
  const [manualPrecio, setManualPrecio] = useState('');
  const [lineas, setLineas] = useState<LineaVenta[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('Efectivo');
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);
  const [ventas, setVentas] = useState<any[]>([]);
  const [cargandoResumen, setCargandoResumen] = useState(false);

  useEffect(() => { if (miId) cargarCatalogos(); }, [miId]);
  useEffect(() => { if (vista === 'resumen') cargarVentas(); }, [vista]);

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

  async function cargarVentas() {
    setCargandoResumen(true);
    const { lunesStr, proximoLunesStr } = semanaActual();
    // Filtramos por fecha local (cast a date): >= lunes y < próximo lunes
    // Supabase soporta comparar timestamptz con strings de fecha (usa la zona del servidor),
    // por eso usamos el cast ::date para comparar solo la parte de fecha en zona local del cliente
    const { data } = await supabase.from('ventas').select('*').eq('tienda_id', miId)
      .gte('created_at', `${lunesStr}T00:00:00`)
      .lt('created_at', `${proximoLunesStr}T00:00:00`)
      .order('created_at', { ascending: false });
    if (data) setVentas(data);
    setCargandoResumen(false);
  }

  const productosFiltrados = catalogoUnificado.filter(p => {
    const ok = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return ok && (filtroOrigen === 'todos' || p.origen === filtroOrigen);
  });

  const seleccionarProducto = (p: ProductoUnificado) => {
    setProductoSeleccionado(p);
    setPrecioVenta(p.precio.toString());
    setCantidad(1);
    setMostrarSelector(false);
    setBusqueda('');
  };

  const agregarDesdeCatalogo = () => {
    if (!productoSeleccionado) return;
    const precio = parseFloat(precioVenta) || 0;
    if (precio <= 0) return alert('Ingresa un precio válido.');
    setLineas(prev => [...prev, {
      producto_id: productoSeleccionado.id,
      nombre: productoSeleccionado.nombre,
      cantidad, precio_unitario: precio,
      foto_url: productoSeleccionado.foto_url,
      origen: productoSeleccionado.origen,
    }]);
    setProductoSeleccionado(null); setPrecioVenta(''); setCantidad(1);
  };

  const agregarManual = () => {
    if (!manualNombre.trim()) return alert('Escribe el nombre del producto.');
    const precio = parseFloat(manualPrecio) || 0;
    if (precio <= 0) return alert('Ingresa un precio válido.');
    setLineas(prev => [...prev, {
      producto_id: null, nombre: manualNombre.trim(),
      cantidad: manualCantidad, precio_unitario: precio,
      foto_url: null, origen: 'manual',
    }]);
    setManualNombre(''); setManualCantidad(1); setManualPrecio(''); setModoManual(false);
  };

  const eliminarLinea = (idx: number) => setLineas(prev => prev.filter((_, i) => i !== idx));
  const totalVenta = lineas.reduce((s, l) => s + l.cantidad * l.precio_unitario, 0);

  const registrarVenta = async () => {
    if (lineas.length === 0) return alert('Agrega al menos un producto.');
    setGuardando(true);
    for (const linea of lineas) {
      await supabase.from('ventas').insert({
        tienda_id: miId, producto_id: linea.producto_id,
        nombre_producto: linea.nombre, cantidad: linea.cantidad,
        precio_unitario: linea.precio_unitario,
        total: linea.cantidad * linea.precio_unitario,
        metodo_pago: metodoPago, origen: linea.origen,
      });
      if (linea.producto_id && linea.origen !== 'manual') {
        const tabla = linea.origen === 'vitrina' ? 'productos' : 'articulos_maestro';
        const prod = catalogoUnificado.find(p => p.id === linea.producto_id);
        if (prod && prod.stock != null)
          await supabase.from(tabla).update({ stock: Math.max(0, prod.stock - linea.cantidad) }).eq('id', linea.producto_id);
      }
    }
    await cargarCatalogos();
    await cargarVentas(); // refrescar resumen por si ya está abierto
    setLineas([]); setGuardando(false); setExito(true);
    setTimeout(() => setExito(false), 2500);
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
      const fecha = new Date(v.created_at).toISOString().split('T')[0];
      if (!map[fecha]) map[fecha] = { fecha, efectivo: 0, transferencia: 0, total: 0, ventas: 0, lineasEfectivo: [], lineasTransferencia: [] };
      map[fecha].ventas++;
      map[fecha].total += v.total;
      if (v.metodo_pago === 'Efectivo') {
        map[fecha].efectivo += v.total;
        agruparLinea(map[fecha].lineasEfectivo, v);
      } else {
        map[fecha].transferencia += v.total;
        agruparLinea(map[fecha].lineasTransferencia, v);
      }
    });
    return Object.values(map).sort((a, b) => b.fecha.localeCompare(a.fecha));
  };

  const totalSemana = ventas.reduce((s, v) => s + v.total, 0);
  const totalEfectivo = ventas.filter(v => v.metodo_pago === 'Efectivo').reduce((s, v) => s + v.total, 0);
  const totalTransferencia = ventas.filter(v => v.metodo_pago === 'Transferencia').reduce((s, v) => s + v.total, 0);

  const exportarPDF = () => {
    const dias = agrupadoPorDia();
    const { inicio, fin } = semanaActual();
    const w = window.open('', '_blank');
    if (!w) return;

    const bloqueProductos = (lineas: ResumenLinea[], color: string) => {
      if (lineas.length === 0) return '';
      return `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:6px">
        <thead><tr>
          <th style="text-align:left;padding:5px 8px;background:${color};color:#fff;font-size:10px;text-transform:uppercase">Producto</th>
          <th style="text-align:center;padding:5px 8px;background:${color};color:#fff;font-size:10px">Cant.</th>
          <th style="text-align:right;padding:5px 8px;background:${color};color:#fff;font-size:10px">P. Unit.</th>
          <th style="text-align:right;padding:5px 8px;background:${color};color:#fff;font-size:10px">Total</th>
        </tr></thead>
        <tbody>${lineas.map(l => `<tr>
          <td style="padding:5px 8px;border-bottom:1px solid #f0eeec">${l.nombre}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #f0eeec;text-align:center">${l.cantidad}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #f0eeec;text-align:right">${formatCLP(l.precio_unitario)}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #f0eeec;text-align:right;font-weight:bold">${formatCLP(l.total)}</td>
        </tr>`).join('')}</tbody>
      </table>`;
    };

    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Resumen Semanal</title>
      <style>
        body{font-family:Georgia,serif;max-width:680px;margin:40px auto;color:#1c1917}
        h1{font-size:22px;margin-bottom:4px}
        h2{font-size:15px;margin:20px 0 8px;padding-bottom:4px;border-bottom:2px solid #e7e5e4}
        .metodo{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:12px 0 4px}
        .subtotal{display:flex;justify-content:space-between;font-size:13px;font-weight:bold;padding:6px 8px;border-radius:6px;margin-top:6px}
        .sub-efe{background:#f0fdf4;color:#166534}
        .sub-tra{background:#eff6ff;color:#1e40af}
        .dia-total{display:flex;justify-content:space-between;font-size:16px;font-weight:bold;margin-top:12px;padding:10px 12px;background:#fef3c7;border-radius:8px}
        .box{margin-top:32px;background:#292524;color:white;border-radius:12px;padding:20px}
        .box-row{display:flex;justify-content:space-between;margin-bottom:10px;font-size:14px}
        .box-big{display:flex;justify-content:space-between;font-size:22px;font-weight:bold;border-top:1px solid #57534e;padding-top:12px;margin-top:8px}
        @media print{body{margin:20px}}
      </style></head><body>
      <h1>📊 Resumen Semanal de Ventas</h1>
      <p style="color:#78716c;font-size:12px;margin-bottom:24px">${inicio.toLocaleDateString('es-CL')} — ${fin.toLocaleDateString('es-CL')}</p>

      ${dias.map(d => `
        <h2>${formatFecha(d.fecha)} <span style="color:#78716c;font-size:12px;font-weight:normal">(${d.ventas} transaccion${d.ventas !== 1 ? 'es' : ''})</span></h2>

        ${d.lineasEfectivo.length > 0 ? `
          <div class="metodo" style="color:#166534">💵 Efectivo</div>
          ${bloqueProductos(d.lineasEfectivo, '#16a34a')}
          <div class="subtotal sub-efe"><span>Subtotal Efectivo</span><span>${formatCLP(d.efectivo)}</span></div>
        ` : ''}

        ${d.lineasTransferencia.length > 0 ? `
          <div class="metodo" style="color:#1e40af">🏦 Transferencia</div>
          ${bloqueProductos(d.lineasTransferencia, '#2563eb')}
          <div class="subtotal sub-tra"><span>Subtotal Transferencia</span><span>${formatCLP(d.transferencia)}</span></div>
        ` : ''}

        <div class="dia-total"><span>TOTAL DÍA</span><span>${formatCLP(d.total)}</span></div>
      `).join('')}

      <div class="box">
        <div class="box-row"><span>💵 Total Efectivo semana</span><strong>${formatCLP(totalEfectivo)}</strong></div>
        <div class="box-row"><span>🏦 Total Transferencia semana</span><strong>${formatCLP(totalTransferencia)}</strong></div>
        <div class="box-big"><span>TOTAL SEMANA</span><span>${formatCLP(totalSemana)}</span></div>
      </div>
      </body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 500);
  };

  const compartirWhatsapp = () => {
    const dias = agrupadoPorDia();
    const { inicio, fin } = semanaActual();
    let msg = `📊 *RESUMEN SEMANAL DE VENTAS*\n_${inicio.toLocaleDateString('es-CL')} — ${fin.toLocaleDateString('es-CL')}_\n\n`;
    dias.forEach(d => {
      msg += `📅 *${formatFecha(d.fecha).toUpperCase()}*\n`;
      if (d.lineasEfectivo.length > 0) {
        msg += `  💵 *Efectivo*\n`;
        d.lineasEfectivo.forEach(l => {
          msg += `    • ${l.cantidad}x ${l.nombre} → ${formatCLP(l.total)}\n`;
        });
        msg += `  _Subtotal efectivo: ${formatCLP(d.efectivo)}_\n`;
      }
      if (d.lineasTransferencia.length > 0) {
        msg += `  🏦 *Transferencia*\n`;
        d.lineasTransferencia.forEach(l => {
          msg += `    • ${l.cantidad}x ${l.nombre} → ${formatCLP(l.total)}\n`;
        });
        msg += `  _Subtotal transf.: ${formatCLP(d.transferencia)}_\n`;
      }
      msg += `  ✅ *Total día: ${formatCLP(d.total)}*\n\n`;
    });
    msg += `━━━━━━━━━━━━━━━\n💵 Efectivo semana: *${formatCLP(totalEfectivo)}*\n🏦 Transferencia semana: *${formatCLP(totalTransferencia)}*\n\n✅ *TOTAL SEMANA: ${formatCLP(totalSemana)}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fade-in space-y-4">

      <div className="flex bg-stone-200 p-1.5 rounded-xl">
        <button onClick={() => setVista('pos')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${vista === 'pos' ? 'bg-white shadow text-stone-900' : 'text-stone-500'}`}>
          Registrar Venta
        </button>
        <button onClick={() => setVista('resumen')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${vista === 'resumen' ? 'bg-white shadow text-stone-900' : 'text-stone-500'}`}>
          Resumen Semanal
        </button>
      </div>

      {vista === 'pos' && (
        <div className="space-y-3 pb-36">

          {/* BOTONES ACCIÓN */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setModoManual(false); setMostrarSelector(true); setTimeout(() => buscadorRef.current?.focus(), 100); }}
              className="bg-white border-2 border-amber-600 text-amber-700 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-50 transition-colors shadow-sm"
            >
              <span className="text-lg">🔍</span> Buscar Producto
            </button>
            <button
              onClick={() => { setModoManual(true); setProductoSeleccionado(null); }}
              className="bg-white border-2 border-stone-300 text-stone-700 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors shadow-sm"
            >
              <span className="text-lg">✍️</span> Ingresar Manual
            </button>
          </div>

          {/* MODAL SELECTOR */}
          {mostrarSelector && (
            <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-end sm:items-center p-0 sm:p-4">
              <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[88vh]">
                <div className="p-4 border-b border-stone-100 flex items-center gap-3">
                  <span className="text-xl">🔍</span>
                  <input
                    ref={buscadorRef}
                    type="text"
                    placeholder="Buscar en todos los catálogos..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="flex-1 font-bold text-stone-800 outline-none placeholder:text-stone-300 text-sm"
                  />
                  <button onClick={() => { setMostrarSelector(false); setBusqueda(''); }} className="text-stone-400 font-bold text-xl hover:text-red-500">✕</button>
                </div>

                {/* Filtros */}
                <div className="flex gap-2 px-4 py-2.5 border-b border-stone-100 items-center">
                  {(['todos', 'vitrina', 'compras'] as const).map(o => (
                    <button key={o} onClick={() => setFiltroOrigen(o)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${filtroOrigen === o ? 'bg-amber-700 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
                      {o === 'todos' ? 'Todos' : o === 'vitrina' ? '🏪 Vitrina' : '📦 Compras'}
                    </button>
                  ))}
                  <span className="ml-auto text-[10px] text-stone-400 font-bold">{productosFiltrados.length} productos</span>
                </div>

                <div className="overflow-y-auto flex-1 p-3 space-y-2">
                  {productosFiltrados.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-stone-400 font-bold text-sm mb-3">Sin resultados para "{busqueda}"</p>
                      <button
                        onClick={() => { setMostrarSelector(false); setBusqueda(''); setModoManual(true); }}
                        className="bg-stone-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm"
                      >✍️ Ingresar manualmente</button>
                    </div>
                  ) : productosFiltrados.map(p => {
                    const badge = BADGE[p.origen];
                    return (
                      <button key={`${p.origen}-${p.id}`} onClick={() => seleccionarProducto(p)}
                        className="w-full bg-stone-50 hover:bg-amber-50 border border-stone-200 hover:border-amber-300 p-3 rounded-xl flex items-center gap-3 transition-colors text-left">
                        <div className="w-11 h-11 rounded-lg bg-white border border-stone-200 overflow-hidden shrink-0">
                          {p.foto_url
                            ? <img src={p.foto_url} className="w-full h-full object-cover" />
                            : <span className="w-full h-full flex items-center justify-center text-stone-300 text-lg">📦</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-stone-800 text-sm leading-tight truncate">{p.nombre}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
                            {p.stock != null && <span className="text-[10px] text-stone-400 font-semibold">Stock: {p.stock}</span>}
                          </div>
                        </div>
                        <span className="font-black text-amber-700 text-sm shrink-0">{formatCLP(p.precio)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* FORMULARIO CATÁLOGO */}
          {productoSeleccionado && !modoManual && (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <div className="p-4 flex items-center gap-3 border-b border-stone-100">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                  {productoSeleccionado.foto_url
                    ? <img src={productoSeleccionado.foto_url} className="w-full h-full object-cover" />
                    : <span className="w-full h-full flex items-center justify-center text-stone-300 text-xl">📦</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-800 leading-tight truncate">{productoSeleccionado.nombre}</p>
                  <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${BADGE[productoSeleccionado.origen].cls}`}>
                    {BADGE[productoSeleccionado.origen].label}
                  </span>
                </div>
                <button onClick={() => setProductoSeleccionado(null)} className="text-stone-300 hover:text-red-500 font-bold text-xl">✕</button>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">Cantidad</label>
                    <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl overflow-hidden h-11">
                      <button onClick={() => setCantidad(c => Math.max(1, c - 1))} className="w-11 flex items-center justify-center text-stone-500 font-bold text-lg hover:bg-stone-100 h-full">−</button>
                      <span className="flex-1 text-center font-black text-stone-800 text-lg">{cantidad}</span>
                      <button onClick={() => setCantidad(c => c + 1)} className="w-11 flex items-center justify-center text-stone-500 font-bold text-lg hover:bg-stone-100 h-full">+</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">Precio Venta ($)</label>
                    <input type="number" value={precioVenta} onChange={e => setPrecioVenta(e.target.value)} placeholder="0"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 font-black text-amber-800 text-lg focus:outline-none focus:border-amber-500 h-11" />
                  </div>
                </div>
                <button onClick={agregarDesdeCatalogo} className="w-full bg-amber-700 hover:bg-amber-800 text-white py-3.5 rounded-xl font-bold text-sm transition-colors">
                  + Agregar al ticket
                </button>
              </div>
            </div>
          )}

          {/* FORMULARIO MANUAL */}
          {modoManual && (
            <div className="bg-white rounded-2xl border border-stone-300 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-stone-700 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2"><span>✍️</span><span className="font-bold text-sm">Producto Manual</span></div>
                <button onClick={() => setModoManual(false)} className="text-stone-400 hover:text-white font-bold">✕</button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">Nombre del Producto</label>
                  <input type="text" value={manualNombre} onChange={e => setManualNombre(e.target.value)}
                    placeholder="Ej: Canasto chico sin asas"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 font-bold text-stone-800 focus:outline-none focus:border-amber-500 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">Cantidad</label>
                    <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl overflow-hidden h-11">
                      <button onClick={() => setManualCantidad(c => Math.max(1, c - 1))} className="w-11 flex items-center justify-center text-stone-500 font-bold text-lg hover:bg-stone-100 h-full">−</button>
                      <span className="flex-1 text-center font-black text-stone-800 text-lg">{manualCantidad}</span>
                      <button onClick={() => setManualCantidad(c => c + 1)} className="w-11 flex items-center justify-center text-stone-500 font-bold text-lg hover:bg-stone-100 h-full">+</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">Precio Venta ($)</label>
                    <input type="number" value={manualPrecio} onChange={e => setManualPrecio(e.target.value)} placeholder="0"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 font-black text-amber-800 text-lg focus:outline-none focus:border-amber-500 h-11" />
                  </div>
                </div>
                <button onClick={agregarManual} className="w-full bg-stone-800 hover:bg-stone-900 text-white py-3.5 rounded-xl font-bold text-sm transition-colors">
                  + Agregar al ticket
                </button>
              </div>
            </div>
          )}

          {/* TICKET */}
          {lineas.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="bg-stone-800 text-white px-4 py-3 flex items-center gap-2">
                <span>🧾</span>
                <span className="font-bold text-sm">Ticket — {lineas.length} item{lineas.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-stone-100">
                {lineas.map((l, i) => {
                  const badge = BADGE[l.origen];
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="font-bold text-stone-800 text-sm leading-tight truncate">{l.nombre}</p>
                          <span className={`shrink-0 text-[9px] font-bold px-1 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
                        </div>
                        <p className="text-stone-400 text-xs">{l.cantidad}x {formatCLP(l.precio_unitario)}</p>
                      </div>
                      <span className="font-black text-stone-800 shrink-0">{formatCLP(l.cantidad * l.precio_unitario)}</span>
                      <button onClick={() => eliminarLinea(i)} className="text-stone-300 hover:text-red-500 ml-1 shrink-0">✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MÉTODO DE PAGO */}
          {lineas.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Método de Pago</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Efectivo', 'Transferencia'] as MetodoPago[]).map(m => (
                  <button key={m} onClick={() => setMetodoPago(m)}
                    className={`py-3.5 rounded-xl font-bold text-sm border-2 transition-all ${metodoPago === m
                      ? m === 'Efectivo' ? 'bg-green-600 border-green-600 text-white' : 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'}`}>
                    {m === 'Efectivo' ? '💵' : '🏦'} {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* BOTÓN FLOTANTE */}
          <div className="fixed bottom-20 left-0 w-full px-4 z-30">
            <div className="max-w-lg mx-auto">
              {lineas.length > 0 && (
                <div className="flex items-stretch gap-2 bg-stone-100 p-2 rounded-2xl border border-stone-300 shadow-xl">
                  <div className="flex-1 bg-white border border-stone-200 rounded-xl p-2 flex items-center px-3 shadow-inner">
                    <span className="text-stone-500 font-bold text-[10px] uppercase tracking-widest leading-none">Total<br />Venta</span>
                    <span className="font-black text-xl ml-auto text-stone-800">{formatCLP(totalVenta)}</span>
                  </div>
                  <button onClick={registrarVenta} disabled={guardando}
                    className="bg-amber-700 hover:bg-amber-800 text-white px-5 rounded-xl font-bold text-sm transition-colors disabled:opacity-60">
                    {guardando ? '⏳' : '✅ Registrar'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {exito && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-xl font-bold text-sm">
              ✅ ¡Venta registrada con éxito!
            </div>
          )}
        </div>
      )}

      {vista === 'resumen' && (
        <div className="space-y-4 pb-10">
          {(() => {
            const { inicio, fin } = semanaActual();
            return (
              <div className="bg-stone-800 text-white p-4 rounded-2xl">
                <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">Semana Actual</p>
                <p className="font-bold text-sm">{inicio.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })} — {fin.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            );
          })()}

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
              <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">💵 Efectivo</p>
              <p className="font-black text-green-800 text-base">{formatCLP(totalEfectivo)}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">🏦 Transf.</p>
              <p className="font-black text-blue-800 text-base">{formatCLP(totalTransferencia)}</p>
            </div>
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 text-center">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">✅ Total</p>
              <p className="font-black text-amber-800 text-base">{formatCLP(totalSemana)}</p>
            </div>
          </div>

          {cargandoResumen ? (
            <p className="text-center py-8 text-stone-400 font-bold text-sm">Cargando...</p>
          ) : agrupadoPorDia().length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-8 text-center">
              <span className="text-3xl block mb-2">📭</span>
              <p className="text-stone-400 font-bold text-sm">Sin ventas esta semana.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-bold text-stone-500 text-sm uppercase tracking-widest">Detalle por Día</h3>
              {agrupadoPorDia().map(d => (
                <TarjetaDia key={d.fecha} dia={d} />
              ))}
            </div>
          )}

          <div className="space-y-2 pt-2">
            <button onClick={exportarPDF} className="w-full bg-stone-800 hover:bg-stone-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors">
              <span>📄</span> Exportar a PDF
            </button>
            <button onClick={compartirWhatsapp} className="w-full bg-[#25D366] hover:bg-green-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors">
              <span>💬</span> Compartir por WhatsApp
            </button>
            <button onClick={cargarVentas} className="w-full bg-stone-100 text-stone-600 py-3.5 rounded-2xl font-bold text-sm hover:bg-stone-200">
              🔄 Actualizar datos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
