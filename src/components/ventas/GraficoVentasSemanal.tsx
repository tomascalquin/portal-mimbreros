import { formatCLP } from '../../utils/fecha';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const TZ = 'America/Santiago';

interface Props {
  ventas: any[];
  periodo: string;
}

export default function GraficoVentasSemanal({ ventas, periodo }: Props) {
  if (periodo !== 'semana' || ventas.length === 0) return null;

  // Agrupar ventas por día de la semana (usando timezone Santiago)
  const porDia: number[] = [0, 0, 0, 0, 0, 0, 0]; // Lun-Dom
  ventas.forEach(v => {
    // Formatear el día en Santiago timezone para obtener el día correcto
    const dayStr = new Date(v.created_at).toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ });
    const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    const idx = map[dayStr] ?? 0;
    porDia[idx] += v.total;
  });

  const max = Math.max(...porDia, 1);
  const totalSemana = porDia.reduce((a, b) => a + b, 0);

  // Detectar hoy (en Santiago)
  const hoyStr = new Date().toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ });
  const hoyMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const hoyIdx = hoyMap[hoyStr] ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">📊 Ventas de la semana</p>
        <span className="text-xs font-black text-amber-700">{formatCLP(totalSemana)}</span>
      </div>

      {/* Gráfico de barras */}
      <div className="flex items-end gap-[6px] h-28">
        {porDia.map((valor, i) => {
          const pct = max > 0 ? Math.max((valor / max) * 100, valor > 0 ? 4 : 0) : 0;
          const esHoy = i === hoyIdx;
          const tieneVenta = valor > 0;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              {/* Monto encima de la barra */}
              {tieneVenta && (
                <span className="text-[8px] font-black text-stone-500 leading-none whitespace-nowrap">
                  {valor >= 1000 ? `${Math.round(valor / 1000)}k` : formatCLP(valor)}
                </span>
              )}

              {/* Barra animada */}
              <div
                className="w-full rounded-t-lg transition-all duration-700 ease-out relative overflow-hidden"
                style={{
                  height: `${pct}%`,
                  minHeight: tieneVenta ? '4px' : '2px',
                  background: tieneVenta
                    ? esHoy
                      ? 'linear-gradient(180deg, #f59e0b, #d97706)'
                      : 'linear-gradient(180deg, #a8a29e, #78716c)'
                    : '#e7e5e4',
                  animation: `barGrow 0.6s ease-out ${i * 0.08}s both`,
                }}
              >
                {/* Shimmer en barra activa */}
                {tieneVenta && (
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
                      animation: 'shimmer 2s infinite',
                    }}
                  />
                )}
              </div>

              {/* Etiqueta día */}
              <span className={`text-[9px] font-bold mt-0.5 ${esHoy ? 'text-amber-700' : tieneVenta ? 'text-stone-600' : 'text-stone-300'}`}>
                {DIAS_SEMANA[i]}
              </span>

              {/* Indicador de hoy */}
              {esHoy && (
                <div className="w-1 h-1 rounded-full bg-amber-500" style={{ animation: 'pulse 2s infinite' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-stone-100">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(180deg, #f59e0b, #d97706)' }} />
          <span className="text-[9px] font-bold text-stone-400">Hoy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(180deg, #a8a29e, #78716c)' }} />
          <span className="text-[9px] font-bold text-stone-400">Otros días</span>
        </div>
      </div>
    </div>
  );
}
