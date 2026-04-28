import { useState } from 'react';
import type { ResumenDia } from '../../types';
import { formatFecha, formatCLP } from '../../utils/fecha';

interface TarjetaDiaProps {
  dia: ResumenDia;
  onGestionar: (d: ResumenDia) => void;
}

export default function TarjetaDia({ dia, onGestionar }: TarjetaDiaProps) {
  const [expandido, setExpandido] = useState(false);

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

              {/* Mini desglose por banco */}
              {Object.keys(dia.desgloseBancos).length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-blue-100 pt-3">
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
