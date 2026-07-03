import { useState } from 'react';
import type { ResumenDia } from '../../types';
import { formatFecha, formatCLP } from '../../utils/fecha';

interface TarjetaDiaProps {
  dia: ResumenDia;
  onGestionar: (d: ResumenDia) => void;
}

interface TicketAgrupado {
  ventaId: string;
  metodo: string;
  bancoId: string | null;
  items: any[];
  total: number;
  hora: string;
}

function agruparPorVentaId(ventasOriginales: any[]): TicketAgrupado[] {
  const map: Record<string, TicketAgrupado> = {};

  // Ordenar por fecha ascendente para que #1 sea el más antiguo del día
  const ordenadas = [...ventasOriginales].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  ordenadas.forEach(v => {
    const key = v.venta_id || v.id;
    if (!map[key]) {
      const d = new Date(v.created_at);
      const hora = d.toLocaleTimeString('es-CL', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago',
      });
      map[key] = {
        ventaId: key,
        metodo: v.metodo_pago,
        bancoId: v.banco_id,
        items: [],
        total: 0,
        hora,
      };
    }
    map[key].items.push(v);
    map[key].total += v.total;
  });

  return Object.values(map);
}

export default function TarjetaDia({ dia, onGestionar }: TarjetaDiaProps) {
  const [expandido, setExpandido] = useState(false);

  const tickets = agruparPorVentaId(dia.ventasOriginales);
  const ticketsEfectivo = tickets.filter(t => t.metodo === 'Efectivo');
  const ticketsTransferencia = tickets.filter(t => t.metodo === 'Transferencia');

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      {/* CABECERA */}
      <button
        onClick={() => setExpandido(e => !e)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-stone-50 transition-colors"
      >
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-stone-800 capitalize text-sm">{formatFecha(dia.fecha)}</p>
            <span
              onClick={(e) => { e.stopPropagation(); onGestionar(dia); }}
              className="text-[10px] bg-stone-200 hover:bg-stone-300 text-stone-700 px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              ⚙️ Gestionar
            </span>
          </div>
          <p className="text-stone-400 text-xs mt-0.5">
            {dia.ventas} venta{dia.ventas !== 1 ? 's' : ''} · toca para ver detalle
          </p>
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

      {/* DESGLOSE EXPANDIBLE — por ticket */}
      {expandido && (
        <div className="border-t border-stone-100 animate-in fade-in slide-in-from-top-1">

          {/* ── EFECTIVO ── */}
          {ticketsEfectivo.length > 0 && (
            <div className="px-4 pt-3 pb-2 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest">💵 Efectivo</p>
              </div>

              {ticketsEfectivo.map((ticket, idx) => (
                <div key={ticket.ventaId} className="bg-green-50/60 rounded-xl overflow-hidden border border-green-100">
                  {/* Cabecera del ticket */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-green-100/70">
                    <span className="text-[10px] font-black text-green-700 uppercase tracking-wider">
                      🧾 Venta #{idx + 1}
                    </span>
                    <span className="text-[10px] text-green-600 font-bold">{ticket.hora}</span>
                  </div>
                  {/* Líneas del ticket */}
                  <div className="px-3 py-2 space-y-1">
                    {ticket.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-green-700 font-bold w-5 text-center shrink-0">{item.cantidad}x</span>
                        <span className="flex-1 text-xs font-semibold text-stone-700 truncate">{item.nombre_producto}</span>
                        <span className="text-xs font-black text-green-800 shrink-0">{formatCLP(item.total)}</span>
                      </div>
                    ))}
                  </div>
                  {/* Total del ticket */}
                  {ticket.items.length > 1 && (
                    <div className="flex justify-between items-center px-3 py-1.5 bg-green-100/50 border-t border-green-100">
                      <span className="text-[10px] text-green-700 font-bold uppercase tracking-wider">Total</span>
                      <span className="text-sm font-black text-green-800">{formatCLP(ticket.total)}</span>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-between items-center mt-1 px-1">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Subtotal efectivo</span>
                <span className="text-sm font-black text-green-700">{formatCLP(dia.efectivo)}</span>
              </div>
            </div>
          )}

          {/* SEPARADOR */}
          {ticketsEfectivo.length > 0 && ticketsTransferencia.length > 0 && (
            <div className="mx-4 border-t border-stone-100 my-1" />
          )}

          {/* ── TRANSFERENCIA ── */}
          {ticketsTransferencia.length > 0 && (
            <div className="px-4 pt-2 pb-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">🏦 Transferencia</p>
              </div>

              {ticketsTransferencia.map((ticket, idx) => (
                <div key={ticket.ventaId} className="bg-blue-50/60 rounded-xl overflow-hidden border border-blue-100">
                  {/* Cabecera del ticket */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-blue-100/70">
                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">
                      🧾 Venta #{idx + 1}
                    </span>
                    <span className="text-[10px] text-blue-600 font-bold">{ticket.hora}</span>
                  </div>
                  {/* Líneas del ticket */}
                  <div className="px-3 py-2 space-y-1">
                    {ticket.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-blue-700 font-bold w-5 text-center shrink-0">{item.cantidad}x</span>
                        <span className="flex-1 text-xs font-semibold text-stone-700 truncate">{item.nombre_producto}</span>
                        <span className="text-xs font-black text-blue-800 shrink-0">{formatCLP(item.total)}</span>
                      </div>
                    ))}
                  </div>
                  {/* Total del ticket */}
                  {ticket.items.length > 1 && (
                    <div className="flex justify-between items-center px-3 py-1.5 bg-blue-100/50 border-t border-blue-100">
                      <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">Total</span>
                      <span className="text-sm font-black text-blue-800">{formatCLP(ticket.total)}</span>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-between items-center mt-1 px-1">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Subtotal transf.</span>
                <span className="text-sm font-black text-blue-700">{formatCLP(dia.transferencia)}</span>
              </div>

              {/* Mini desglose por banco */}
              {Object.keys(dia.desgloseBancos).length > 0 && (
                <div className="space-y-1.5 border-t border-blue-100 pt-3">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Desglose por cuenta</p>
                  {Object.entries(dia.desgloseBancos).map(([key, info]) => (
                    <div key={key} className="flex items-center justify-between bg-blue-100/60 border border-blue-200 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🏦</span>
                        <span className="text-xs font-bold text-blue-800">{info.nombre}</span>
                      </div>
                      <span className="text-xs font-black text-blue-900">{formatCLP(info.total)}</span>
                    </div>
                  ))}
                </div>
              )}
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
