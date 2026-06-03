import { formatCLP } from '../../utils/fecha';

interface Metricas {
  topCantidad: { nombre: string; cantidad: number; total: number }[];
  topMonto: { nombre: string; cantidad: number; total: number }[];
  mejorDia: { nombre: string; total: number; count: number } | null;
  totalPeriodo: number;
  numTransacciones: number;
  ticketPromedio: number;
  diasUnicos: number;
  ventasPorDia: number;
  pctEfectivo: number;
  pctTransferencia: number;
  totalEfectivo: number;
  totalTransferencia: number;
}

export default function SeccionMetricas({ m }: { m: Metricas }) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-stone-500 text-xs uppercase tracking-widest">📊 Métricas del Período</h3>

      {/* Fila KPIs */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white border border-stone-200 rounded-2xl p-3.5 text-center">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">🎫 Ticket Promedio</p>
          <p className="font-black text-stone-800 text-lg leading-tight">{formatCLP(Math.round(m.ticketPromedio))}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-3.5 text-center">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">📋 Transacciones</p>
          <p className="font-black text-stone-800 text-lg leading-tight">{m.numTransacciones}</p>
          <p className="text-[10px] text-stone-400">{m.ventasPorDia.toFixed(1)}/día</p>
        </div>
      </div>

      {/* Mix de pago */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3">💳 Mix de Pago</p>
        <div className="flex rounded-full overflow-hidden h-4 mb-2">
          <div
            className="bg-green-500 transition-all"
            style={{ width: `${m.pctEfectivo}%` }}
          />
          <div
            className="bg-blue-500 transition-all"
            style={{ width: `${m.pctTransferencia}%` }}
          />
        </div>
        <div className="flex justify-between text-xs font-bold">
          <span className="text-green-700">💵 Efectivo {m.pctEfectivo.toFixed(0)}%</span>
          <span className="text-blue-700">🏦 Transf. {m.pctTransferencia.toFixed(0)}%</span>
        </div>
        <div className="flex justify-between text-xs text-stone-500 mt-1">
          <span>{formatCLP(m.totalEfectivo)}</span>
          <span>{formatCLP(m.totalTransferencia)}</span>
        </div>
      </div>

      {/* Mejor día */}
      {m.mejorDia && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl shrink-0">🏆</span>
          <div>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Mejor día de la semana</p>
            <p className="font-black text-amber-900 text-base">{m.mejorDia.nombre}</p>
            <p className="text-xs text-amber-700">{formatCLP(m.mejorDia.total)} · {m.mejorDia.count} ventas</p>
          </div>
        </div>
      )}

      {/* Top 5 más vendidos por cantidad */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3">🏅 Top 5 Más Vendidos (unidades)</p>
        <div className="space-y-2">
          {m.topCantidad.map((p, i) => {
            const maxQty = m.topCantidad[0].cantidad;
            return (
              <div key={i}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs font-bold text-stone-700 truncate max-w-[70%]">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {p.nombre}
                  </span>
                  <span className="text-xs font-black text-amber-700 shrink-0">{p.cantidad} ud.</span>
                </div>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${(p.cantidad / maxQty) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 5 más rentables por monto */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3">💰 Top 5 Más Rentables (monto)</p>
        <div className="space-y-2">
          {m.topMonto.map((p, i) => {
            const maxTotal = m.topMonto[0].total;
            return (
              <div key={i}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs font-bold text-stone-700 truncate max-w-[65%]">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {p.nombre}
                  </span>
                  <span className="text-xs font-black text-green-700 shrink-0">{formatCLP(p.total)}</span>
                </div>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${(p.total / maxTotal) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
