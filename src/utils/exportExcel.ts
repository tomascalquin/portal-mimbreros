import * as XLSX from 'xlsx';
import type { Periodo } from '../hooks/useVentas';

const TZ = 'America/Santiago';

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}
function fmtCLP(n: number): string {
  return `$${n.toLocaleString('es-CL')}`;
}
function barra(valor: number, max: number, ancho = 18): string {
  if (max <= 0) return '';
  const llenas = Math.round((valor / max) * ancho);
  return '█'.repeat(llenas) + '░'.repeat(ancho - llenas);
}

export function exportarExcel(
  ventas: any[],
  bancos: any[],
  _periodo: Periodo,
  label: string
) {
  if (ventas.length === 0) {
    alert('No hay ventas en este período para exportar.');
    return;
  }

  const wb = XLSX.utils.book_new();

  // ══════════════════════════════════════════════════════════════════
  // HOJA 1 — DETALLE COMPLETO (todas las ventas, línea por línea)
  // ══════════════════════════════════════════════════════════════════
  const ventasOrdenadas = [...ventas].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const detalleRows: any[][] = [
    [`DETALLE COMPLETO DE VENTAS — ${label}`],
    [],
    [
      'Fecha',
      'Hora',
      'Producto',
      'Cant.',
      'Precio Unit. ($)',
      'Total ($)',
      'Método de Pago',
      'Banco / Cuenta',
      '💵 Efectivo ($)',
      '🏦 Transferencia ($)',
    ],
  ];

  let acumEfectivo = 0;
  let acumTransferencia = 0;
  let txCount = 0;

  ventasOrdenadas.forEach(v => {
    const banco = v.banco_id
      ? (bancos.find((b: any) => b.id === v.banco_id)?.nombre || 'Sin banco')
      : (v.metodo_pago === 'Transferencia' ? 'Sin cuenta asignada' : '-');

    const esEfectivo = v.metodo_pago === 'Efectivo';
    if (esEfectivo) acumEfectivo += v.total; else acumTransferencia += v.total;
    txCount++;

    detalleRows.push([
      fmtFecha(v.created_at),
      fmtHora(v.created_at),
      v.nombre_producto,
      v.cantidad,
      v.precio_unitario,
      v.total,
      v.metodo_pago,
      banco,
      esEfectivo ? v.total : '',
      esEfectivo ? '' : v.total,
    ]);
  });

  // Fila de totales
  detalleRows.push([]);
  detalleRows.push([
    'TOTALES', '', '',
    ventasOrdenadas.reduce((s, v) => s + v.cantidad, 0),
    '',
    acumEfectivo + acumTransferencia,
    `${txCount} transacciones`,
    '',
    acumEfectivo,
    acumTransferencia,
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet(detalleRows);
  ws1['!cols'] = [
    { wch: 12 }, { wch: 8 }, { wch: 35 }, { wch: 6 },
    { wch: 17 }, { wch: 14 }, { wch: 18 }, { wch: 22 },
    { wch: 16 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, '📋 Detalle Completo');

  // ══════════════════════════════════════════════════════════════════
  // HOJA 2 — VENTAS POR DÍA + GRÁFICO DE BARRAS
  // ══════════════════════════════════════════════════════════════════
  const porDia: Record<string, { fecha: string; efe: number; tra: number; total: number; tx: number }> = {};
  ventasOrdenadas.forEach(v => {
    const fecha = fmtFecha(v.created_at);
    if (!porDia[fecha]) porDia[fecha] = { fecha, efe: 0, tra: 0, total: 0, tx: 0 };
    porDia[fecha].total += v.total;
    porDia[fecha].tx++;
    if (v.metodo_pago === 'Efectivo') porDia[fecha].efe += v.total;
    else porDia[fecha].tra += v.total;
  });

  const diasArr = Object.values(porDia).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const maxDia = Math.max(...diasArr.map(d => d.total), 1);

  const diasRows: any[][] = [
    [`VENTAS POR DÍA — ${label}`],
    [],
    ['Fecha', 'N° Ventas', '💵 Efectivo', '🏦 Transf.', '✅ Total', 'Gráfico (Total)'],
    ...diasArr.map(d => [
      d.fecha,
      d.tx,
      fmtCLP(d.efe),
      fmtCLP(d.tra),
      fmtCLP(d.total),
      barra(d.total, maxDia),
    ]),
    [],
    [
      'TOTAL',
      diasArr.reduce((s, d) => s + d.tx, 0),
      fmtCLP(diasArr.reduce((s, d) => s + d.efe, 0)),
      fmtCLP(diasArr.reduce((s, d) => s + d.tra, 0)),
      fmtCLP(diasArr.reduce((s, d) => s + d.total, 0)),
      '',
    ],
    [],
    ['Nota: █ = valor máximo del período, ░ = sin ventas'],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(diasRows);
  ws2['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws2, '📊 Por Día');

  // ══════════════════════════════════════════════════════════════════
  // HOJA 3 — EFECTIVO VS TRANSFERENCIA POR DÍA
  // ══════════════════════════════════════════════════════════════════
  const maxEfe = Math.max(...diasArr.map(d => d.efe), 1);
  const maxTra = Math.max(...diasArr.map(d => d.tra), 1);

  const mixRows: any[][] = [
    [`EFECTIVO vs TRANSFERENCIA — ${label}`],
    [],
    ['Fecha', '💵 Efectivo', 'Gráfico Efectivo', '🏦 Transf.', 'Gráfico Transf.', '% Efectivo', '% Transf.'],
    ...diasArr.map(d => {
      const pctEfe = d.total > 0 ? ((d.efe / d.total) * 100).toFixed(0) + '%' : '0%';
      const pctTra = d.total > 0 ? ((d.tra / d.total) * 100).toFixed(0) + '%' : '0%';
      return [
        d.fecha,
        fmtCLP(d.efe),
        barra(d.efe, maxEfe, 14),
        fmtCLP(d.tra),
        barra(d.tra, maxTra, 14),
        pctEfe,
        pctTra,
      ];
    }),
    [],
    [
      'TOTAL',
      fmtCLP(diasArr.reduce((s, d) => s + d.efe, 0)),
      '',
      fmtCLP(diasArr.reduce((s, d) => s + d.tra, 0)),
      '',
      acumEfectivo + acumTransferencia > 0
        ? ((acumEfectivo / (acumEfectivo + acumTransferencia)) * 100).toFixed(0) + '%'
        : '0%',
      acumEfectivo + acumTransferencia > 0
        ? ((acumTransferencia / (acumEfectivo + acumTransferencia)) * 100).toFixed(0) + '%'
        : '0%',
    ],
  ];

  const ws3 = XLSX.utils.aoa_to_sheet(mixRows);
  ws3['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 10 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws3, '💳 Efectivo vs Transf.');

  // ══════════════════════════════════════════════════════════════════
  // HOJA 4 — TOP PRODUCTOS (cantidad + monto)
  // ══════════════════════════════════════════════════════════════════
  const porProducto: Record<string, { nombre: string; cantidad: number; total: number; tx: number }> = {};
  ventasOrdenadas.forEach(v => {
    const k = v.nombre_producto;
    if (!porProducto[k]) porProducto[k] = { nombre: k, cantidad: 0, total: 0, tx: 0 };
    porProducto[k].cantidad += v.cantidad;
    porProducto[k].total += v.total;
    porProducto[k].tx++;
  });

  const topCant = Object.values(porProducto).sort((a, b) => b.cantidad - a.cantidad);
  const topMonto = Object.values(porProducto).sort((a, b) => b.total - a.total);
  const maxCant = Math.max(...topCant.map(p => p.cantidad), 1);
  const maxMonto = Math.max(...topMonto.map(p => p.total), 1);

  const topRows: any[][] = [
    [`TOP PRODUCTOS — ${label}`],
    [],
    ['🏅 POR UNIDADES VENDIDAS'],
    ['#', 'Producto', 'Unidades', 'Gráfico', 'Total ($)', 'Precio Prom.'],
    ...topCant.map((p, i) => [
      i + 1,
      p.nombre,
      p.cantidad,
      barra(p.cantidad, maxCant, 16),
      fmtCLP(p.total),
      fmtCLP(p.cantidad > 0 ? Math.round(p.total / p.cantidad) : 0),
    ]),
    [],
    ['💰 POR MONTO GENERADO'],
    ['#', 'Producto', 'Total ($)', 'Gráfico', 'Unidades', 'N° Ventas'],
    ...topMonto.map((p, i) => [
      i + 1,
      p.nombre,
      fmtCLP(p.total),
      barra(p.total, maxMonto, 16),
      p.cantidad,
      p.tx,
    ]),
  ];

  const ws4 = XLSX.utils.aoa_to_sheet(topRows);
  ws4['!cols'] = [{ wch: 4 }, { wch: 35 }, { wch: 12 }, { wch: 20 }, { wch: 16 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws4, '🏆 Top Productos');

  // ══════════════════════════════════════════════════════════════════
  // HOJA 5 — RESUMEN EJECUTIVO
  // ══════════════════════════════════════════════════════════════════
  const totalPeriodo = acumEfectivo + acumTransferencia;
  const diasConVentas = diasArr.length;
  const ticketProm = txCount > 0 ? Math.round(totalPeriodo / txCount) : 0;

  const resumenRows: any[][] = [
    [`RESUMEN EJECUTIVO — ${label}`],
    [],
    ['MÉTRICA', 'VALOR'],
    ['Total del Período', fmtCLP(totalPeriodo)],
    ['Total Efectivo', fmtCLP(acumEfectivo)],
    ['Total Transferencia', fmtCLP(acumTransferencia)],
    ['% Efectivo', totalPeriodo > 0 ? ((acumEfectivo / totalPeriodo) * 100).toFixed(1) + '%' : '0%'],
    ['% Transferencia', totalPeriodo > 0 ? ((acumTransferencia / totalPeriodo) * 100).toFixed(1) + '%' : '0%'],
    [],
    ['N° de Transacciones', txCount],
    ['Días con Ventas', diasConVentas],
    ['Promedio de Ventas/Día', diasConVentas > 0 ? (txCount / diasConVentas).toFixed(1) : '0'],
    ['Ticket Promedio', fmtCLP(ticketProm)],
    ['Productos Distintos', Object.keys(porProducto).length],
    [],
    ['PRODUCTO MÁS VENDIDO (unid.)', topCant[0]?.nombre || '-'],
    ['PRODUCTO MÁS RENTABLE ($)', topMonto[0]?.nombre || '-'],
    [],
    ['Exportado el', new Date().toLocaleDateString('es-CL', { timeZone: TZ, dateStyle: 'full' })],
  ];

  const ws5 = XLSX.utils.aoa_to_sheet(resumenRows);
  ws5['!cols'] = [{ wch: 32 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, ws5, '📈 Resumen Ejecutivo');

  // ── Exportar ──────────────────────────────────────────────────────
  const nombreArchivo = `Ventas_${label.replace(/[\s/\\:*?"<>|]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, nombreArchivo);
}
