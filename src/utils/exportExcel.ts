import * as XLSX from 'xlsx';
import { formatCLP } from './fecha';
import type { Periodo } from '../hooks/useVentas';

export function exportarExcel(
  ventas: any[],
  bancos: any[],
  periodo: Periodo,
  label: string
) {
  if (ventas.length === 0) { alert('No hay ventas en este período para exportar.'); return; }

  const wb = XLSX.utils.book_new();

  // ── Hoja 1: Resumen General ──────────────────────────────────────────────
  const totalPeriodo = ventas.reduce((s: number, v: any) => s + v.total, 0);
  const totalEfectivo = ventas.filter((v: any) => v.metodo_pago === 'Efectivo').reduce((s: number, v: any) => s + v.total, 0);
  const totalTransferencia = ventas.filter((v: any) => v.metodo_pago === 'Transferencia').reduce((s: number, v: any) => s + v.total, 0);
  const numTx = ventas.length;
  const ticketProm = numTx > 0 ? Math.round(totalPeriodo / numTx) : 0;

  const resumenData = [
    ['RESUMEN DE VENTAS', label],
    [],
    ['Métrica', 'Valor'],
    ['Total del Período', totalPeriodo],
    ['Total Efectivo', totalEfectivo],
    ['Total Transferencia', totalTransferencia],
    ['N° de Transacciones', numTx],
    ['Ticket Promedio', ticketProm],
    ['% Efectivo', totalPeriodo > 0 ? `${((totalEfectivo / totalPeriodo) * 100).toFixed(1)}%` : '0%'],
    ['% Transferencia', totalPeriodo > 0 ? `${((totalTransferencia / totalPeriodo) * 100).toFixed(1)}%` : '0%'],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(resumenData);
  ws1['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

  // ── Hoja 2: Top Productos por Cantidad ──────────────────────────────────
  const porProducto: Record<string, { nombre: string; cantidad: number; total: number; txCount: number }> = {};
  ventas.forEach((v: any) => {
    const k = v.nombre_producto;
    if (!porProducto[k]) porProducto[k] = { nombre: k, cantidad: 0, total: 0, txCount: 0 };
    porProducto[k].cantidad += v.cantidad;
    porProducto[k].total += v.total;
    porProducto[k].txCount++;
  });
  const topRows = Object.values(porProducto).sort((a, b) => b.cantidad - a.cantidad);
  const topData = [
    ['PRODUCTOS MÁS VENDIDOS', label],
    [],
    ['Producto', 'Unidades Vendidas', 'Total Generado ($)', 'N° de Ventas', 'Precio Promedio ($)'],
    ...topRows.map(r => [
      r.nombre,
      r.cantidad,
      r.total,
      r.txCount,
      r.cantidad > 0 ? Math.round(r.total / r.cantidad) : 0,
    ]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(topData);
  ws2['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Top Productos');

  // ── Hoja 3: Ventas por Día ───────────────────────────────────────────────
  const porDia: Record<string, { fecha: string; efectivo: number; transferencia: number; total: number; tx: number }> = {};
  ventas.forEach((v: any) => {
    const fecha = v.created_at.split('T')[0];
    if (!porDia[fecha]) porDia[fecha] = { fecha, efectivo: 0, transferencia: 0, total: 0, tx: 0 };
    porDia[fecha].total += v.total;
    porDia[fecha].tx++;
    if (v.metodo_pago === 'Efectivo') porDia[fecha].efectivo += v.total;
    else porDia[fecha].transferencia += v.total;
  });
  const diasRows = Object.values(porDia).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const diasData = [
    ['VENTAS POR DÍA', label],
    [],
    ['Fecha', 'N° Transacciones', 'Efectivo ($)', 'Transferencia ($)', 'Total ($)'],
    ...diasRows.map(d => [d.fecha, d.tx, d.efectivo, d.transferencia, d.total]),
    [],
    ['TOTAL', diasRows.reduce((s, d) => s + d.tx, 0), totalEfectivo, totalTransferencia, totalPeriodo],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(diasData);
  ws3['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Por Día');

  // ── Hoja 4: Detalle Completo ─────────────────────────────────────────────
  const detalleData = [
    ['DETALLE DE VENTAS', label],
    [],
    ['Fecha', 'Producto', 'Cantidad', 'Precio Unit. ($)', 'Total ($)', 'Método de Pago', 'Banco'],
    ...ventas.map((v: any) => {
      const banco = v.banco_id ? (bancos.find((b: any) => b.id === v.banco_id)?.nombre || 'Sin banco') : '-';
      return [
        v.created_at.split('T')[0],
        v.nombre_producto,
        v.cantidad,
        v.precio_unitario,
        v.total,
        v.metodo_pago,
        banco,
      ];
    }),
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(detalleData);
  ws4['!cols'] = [{ wch: 14 }, { wch: 35 }, { wch: 10 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws4, 'Detalle');

  // ── Exportar ─────────────────────────────────────────────────────────────
  const nombreArchivo = `Ventas_${label.replace(/\s/g, '_')}.xlsx`;
  XLSX.writeFile(wb, nombreArchivo);
}
