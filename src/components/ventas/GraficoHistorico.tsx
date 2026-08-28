import { useMemo, useState } from 'react';
import { formatCLP } from '../../utils/fecha';

const TZ = 'America/Santiago';

type Periodo = 'semana' | 'mes' | 'anio';

interface Props {
  ventas: any[];
  periodo: Periodo;
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type ModoVista = 'total' | 'efectivo' | 'transferencia';
type ModoEje  = 'monto' | 'cantidad';

export default function GraficoHistorico({ ventas, periodo }: Props) {
  const [modoVista, setModoVista] = useState<ModoVista>('total');
  const [modoEje,   setModoEje]   = useState<ModoEje>('monto');
  const [tooltipIdx, setTooltipIdx] = useState<number | null>(null);

  // Calcular el índice "actual" (hoy / mes actual / año actual) para resaltar
  const idxActual = useMemo(() => {
    const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
    if (periodo === 'semana') {
      const dayStr = ahora.toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ });
      const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
      return map[dayStr] ?? 0;
    }
    if (periodo === 'mes') return ahora.getDate() - 1; // 0-indexed
    return ahora.getMonth(); // 0-indexed
  }, [periodo]);

  const puntos = useMemo(() => {
    if (periodo === 'semana') {
      const buckets = Array.from({ length: 7 }, (_, i) => ({ label: DIAS_SEMANA[i], total: 0, efectivo: 0, transferencia: 0, txns: 0, txnsEfectivo: 0, txnsTransferencia: 0 }));
      const ventasUnicas: Set<string> = new Set();
      ventas.forEach(v => {
        const dayStr = new Date(v.created_at).toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ });
        const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
        const i = map[dayStr] ?? 0;
        buckets[i].total += v.total;
        if (v.metodo_pago === 'Efectivo') { buckets[i].efectivo += v.total; }
        else { buckets[i].transferencia += v.total; }
        const key = `${i}-${v.venta_id || v.id}`;
        if (!ventasUnicas.has(key)) {
          ventasUnicas.add(key);
          buckets[i].txns++;
          if (v.metodo_pago === 'Efectivo') buckets[i].txnsEfectivo++;
          else buckets[i].txnsTransferencia++;
        }
      });
      return buckets;
    }

    if (periodo === 'mes') {
      const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
      const diasEnMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate();
      const buckets = Array.from({ length: diasEnMes }, (_, i) => ({ label: String(i + 1), total: 0, efectivo: 0, transferencia: 0, txns: 0, txnsEfectivo: 0, txnsTransferencia: 0 }));
      const ventasUnicas: Set<string> = new Set();
      ventas.forEach(v => {
        const d = new Date(v.created_at).toLocaleDateString('en-US', { timeZone: TZ, day: 'numeric' });
        const i = parseInt(d, 10) - 1;
        if (i >= 0 && i < buckets.length) {
          buckets[i].total += v.total;
          if (v.metodo_pago === 'Efectivo') { buckets[i].efectivo += v.total; }
          else { buckets[i].transferencia += v.total; }
          const key = `${i}-${v.venta_id || v.id}`;
          if (!ventasUnicas.has(key)) {
            ventasUnicas.add(key);
            buckets[i].txns++;
            if (v.metodo_pago === 'Efectivo') buckets[i].txnsEfectivo++;
            else buckets[i].txnsTransferencia++;
          }
        }
      });
      return buckets;
    }

    // anio
    const buckets = Array.from({ length: 12 }, (_, i) => ({ label: MESES[i], total: 0, efectivo: 0, transferencia: 0, txns: 0, txnsEfectivo: 0, txnsTransferencia: 0 }));
    const ventasUnicas: Set<string> = new Set();
    ventas.forEach(v => {
      const mesStr = new Date(v.created_at).toLocaleDateString('en-US', { timeZone: TZ, month: 'numeric' });
      const i = parseInt(mesStr, 10) - 1;
      if (i >= 0 && i < 12) {
        buckets[i].total += v.total;
        if (v.metodo_pago === 'Efectivo') { buckets[i].efectivo += v.total; }
        else { buckets[i].transferencia += v.total; }
        const key = `${i}-${v.venta_id || v.id}`;
        if (!ventasUnicas.has(key)) {
          ventasUnicas.add(key);
          buckets[i].txns++;
          if (v.metodo_pago === 'Efectivo') buckets[i].txnsEfectivo++;
          else buckets[i].txnsTransferencia++;
        }
      }
    });
    return buckets;
  }, [ventas, periodo]);

  // Seleccionar la clave correcta según modo eje + modo vista
  const getValor = (p: typeof puntos[0]) => {
    if (modoEje === 'cantidad') {
      if (modoVista === 'efectivo')      return p.txnsEfectivo;
      if (modoVista === 'transferencia') return p.txnsTransferencia;
      return p.txns;
    }
    return p[modoVista];
  };

  const valores = puntos.map(p => getValor(p));
  const max = Math.max(...valores, 1);
  const totalGeneral  = puntos.reduce((s, p) => s + p.total, 0);
  const totalEfectivo = puntos.reduce((s, p) => s + p.efectivo, 0);
  const totalTransf   = puntos.reduce((s, p) => s + p.transferencia, 0);
  const totalTxns     = puntos.reduce((s, p) => s + p.txns, 0);

  if (ventas.length === 0) return null;

  const colores: Record<ModoVista, { bar: string; active: string }> = {
    total:        { bar: '#92400e', active: '#b45309' },
    efectivo:     { bar: '#15803d', active: '#16a34a' },
    transferencia:{ bar: '#1d4ed8', active: '#2563eb' },
  };
  const col = colores[modoVista];

  // Para modo mes, mostrar solo cada N etiquetas para no colapsar
  const mostrarLabel = (i: number) => {
    if (periodo === 'semana') return true;
    if (periodo === 'mes') return i === 0 || (i + 1) % 5 === 0;
    return true;
  };

  const tooltip = tooltipIdx !== null ? puntos[tooltipIdx] : null;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-stone-100">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
              📊 Gráfico de Ventas
            </p>
            {modoEje === 'monto' ? (
              <p className="font-black text-stone-800 text-xl mt-0.5">{formatCLP(totalGeneral)}</p>
            ) : (
              <p className="font-black text-stone-800 text-xl mt-0.5">
                {totalTxns} <span className="text-sm font-semibold text-stone-400">ventas</span>
              </p>
            )}
          </div>
          <div className="text-right text-[10px] text-stone-400 space-y-0.5">
            {modoEje === 'monto' ? (
              <>
                <div className="flex items-center gap-1 justify-end">
                  <span className="w-2 h-2 rounded-sm bg-green-500 inline-block" />
                  <span className="font-bold text-green-700">{formatCLP(totalEfectivo)}</span>
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" />
                  <span className="font-bold text-blue-700">{formatCLP(totalTransf)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 justify-end">
                  <span className="w-2 h-2 rounded-sm bg-green-500 inline-block" />
                  <span className="font-bold text-green-700">{puntos.reduce((s, p) => s + p.txnsEfectivo, 0)} efectivo</span>
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" />
                  <span className="font-bold text-blue-700">{puntos.reduce((s, p) => s + p.txnsTransferencia, 0)} transf.</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Toggle Monto / Cantidad */}
        <div className="flex gap-1 mb-2 bg-stone-100 p-0.5 rounded-lg">
          <button
            onClick={() => setModoEje('monto')}
            className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${
              modoEje === 'monto'
                ? 'bg-white text-stone-700 shadow-sm'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            💰 Monto
          </button>
          <button
            onClick={() => setModoEje('cantidad')}
            className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${
              modoEje === 'cantidad'
                ? 'bg-white text-stone-700 shadow-sm'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            🔢 Cantidad
          </button>
        </div>

        {/* Filtros de método de pago */}
        <div className="flex gap-1.5">
          {([
            { k: 'total',        label: 'Total',         emoji: '📊' },
            { k: 'efectivo',     label: 'Efectivo',      emoji: '💵' },
            { k: 'transferencia',label: 'Transferencia', emoji: '🏦' },
          ] as { k: ModoVista; label: string; emoji: string }[]).map(({ k, label, emoji }) => (
            <button
              key={k}
              onClick={() => setModoVista(k)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                modoVista === k
                  ? k === 'total'
                    ? 'bg-amber-700 border-amber-700 text-white'
                    : k === 'efectivo'
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'
              }`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tooltip flotante */}
      <div className="px-4 pt-3 pb-0 min-h-[42px]">
        {tooltip ? (
          <div className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                {periodo === 'semana' ? DIAS_SEMANA[tooltipIdx!] :
                 periodo === 'mes' ? `Día ${puntos[tooltipIdx!].label}` :
                 MESES[tooltipIdx!]}
              </p>
              {modoEje === 'monto' ? (
                <p className="font-black text-stone-800 text-sm">{formatCLP(tooltip[modoVista])}</p>
              ) : (
                <p className="font-black text-stone-800 text-sm">
                  {getValor(tooltip)}{' '}
                  <span className="text-[10px] font-semibold text-stone-400">venta{getValor(tooltip) !== 1 ? 's' : ''}</span>
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-stone-400">
                {tooltip.txns} venta{tooltip.txns !== 1 ? 's' : ''}
              </p>
              {modoEje === 'monto' && modoVista === 'total' && tooltip.total > 0 && (
                <p className="text-[10px] font-bold">
                  <span className="text-green-600">{formatCLP(tooltip.efectivo)}</span>
                  <span className="text-stone-300 mx-1">·</span>
                  <span className="text-blue-600">{formatCLP(tooltip.transferencia)}</span>
                </p>
              )}
              {modoEje === 'cantidad' && modoVista === 'total' && tooltip.txns > 0 && (
                <p className="text-[10px] font-bold">
                  <span className="text-green-600">{tooltip.txnsEfectivo} ef.</span>
                  <span className="text-stone-300 mx-1">·</span>
                  <span className="text-blue-600">{tooltip.txnsTransferencia} tr.</span>
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-stone-300 font-bold text-center py-1">
            Toca una barra para ver el detalle
          </p>
        )}
      </div>

      {/* Gráfico de barras */}
      <div className="px-4 pb-4 pt-3">
        <div
          className={`flex items-end gap-[3px] h-36 ${periodo === 'mes' ? 'overflow-x-auto' : ''}`}
          style={periodo === 'mes' ? { minWidth: 'max-content', width: '100%' } : {}}
        >
          {puntos.map((p, i) => {
            const val = getValor(p);
            const pct = max > 0 ? Math.max((val / max) * 100, val > 0 ? 5 : 0) : 0;
            const esActual = i === idxActual;
            const activo = tooltipIdx === i;
            const tieneVenta = val > 0;

            const barColor = esActual && periodo === 'semana'
              ? '#f59e0b'
              : activo
                ? col.active
                : tieneVenta
                  ? col.bar
                  : '#e7e5e4';

            const minW = periodo === 'mes' ? '10px' : undefined;

            return (
              <div
                key={i}
                className="flex flex-col items-center gap-0.5 h-full justify-end cursor-pointer group"
                style={{ flex: periodo === 'mes' ? 'none' : 1, minWidth: minW, width: periodo === 'mes' ? '10px' : undefined }}
                onClick={() => setTooltipIdx(prev => prev === i ? null : i)}
              >
                {/* Valor encima */}
                {tieneVenta && periodo !== 'mes' && (
                  <span className="text-[8px] font-black text-stone-400 leading-none whitespace-nowrap">
                    {modoEje === 'cantidad'
                      ? val
                      : val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${Math.round(val / 1000)}k` : formatCLP(val)
                    }
                  </span>
                )}

                {/* Barra */}
                <div
                  className="w-full rounded-t-md transition-all duration-500 ease-out relative overflow-hidden"
                  style={{
                    height: `${pct}%`,
                    minHeight: tieneVenta ? '4px' : '2px',
                    background: barColor,
                    boxShadow: activo ? `0 0 0 2px ${col.active}40` : undefined,
                    animation: `barGrow 0.6s ease-out ${i * 0.04}s both`,
                  }}
                >
                  {tieneVenta && (
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
                        animation: 'shimmer 2.5s infinite',
                      }}
                    />
                  )}
                </div>

                {/* Etiqueta */}
                {mostrarLabel(i) && (
                  <span
                    className={`text-[8px] font-bold mt-0.5 leading-none ${
                      esActual && periodo === 'semana'
                        ? 'text-amber-600'
                        : tieneVenta
                          ? 'text-stone-500'
                          : 'text-stone-300'
                    }`}
                  >
                    {p.label}
                  </span>
                )}

                {/* Punto "hoy" */}
                {esActual && periodo === 'semana' && (
                  <div className="w-1 h-1 rounded-full bg-amber-500 mt-0.5" style={{ animation: 'pulse 2s infinite' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda bottom */}
      <div className="flex items-center justify-center gap-4 px-4 pb-3 border-t border-stone-100 pt-2.5">
        {periodo === 'semana' && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
            <span className="text-[9px] font-bold text-stone-400">Hoy</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: col.bar }} />
          <span className="text-[9px] font-bold text-stone-400">
            {modoVista === 'total' ? (modoEje === 'monto' ? 'Ventas totales' : 'N° ventas') : modoVista === 'efectivo' ? 'Efectivo' : 'Transferencia'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-stone-200" />
          <span className="text-[9px] font-bold text-stone-400">Sin ventas</span>
        </div>
      </div>
    </div>
  );
}
