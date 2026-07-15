import { useRef } from 'react';
import type { DesgloseCosto, PeajeSeleccionado } from '../../types';
import { formatCLP } from '../../utils/fecha';
import { formatTiempo } from '../../hooks/useFletes';
import { useToast } from '../../hooks/useToast';

interface Props {
  nombreLocal: string;
  clienteNombre: string;
  vehiculoNombre: string;
  origen: string;
  destino: string;
  distanciaKm: number;
  idaYVuelta: boolean;
  desglose: DesgloseCosto;
  peajesSeleccionados: PeajeSeleccionado[];
  margenPct: number;
  nota: string;
  onCerrar: () => void;
}

export default function PdfCotizacion(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { desglose } = props;
  const peajesActivos = props.peajesSeleccionados.filter(p => p.seleccionado);
  const fecha = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });

  const generarPDF = async () => {
    if (!ref.current) return;
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const nombre = `Cotizacion_${props.origen}_${props.destino}_${new Date().toISOString().slice(0, 10)}`;
      await html2pdf().set({
        margin: [10, 10, 10, 10],
        filename: `${nombre}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(ref.current).save();
    } catch (e) {
      toast('Error al generar PDF', 'error', '❌');
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden slide-up max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-stone-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <span className="font-bold flex items-center gap-2">📄 Vista previa PDF</span>
          <button onClick={props.onCerrar} className="text-stone-400 hover:text-white font-bold text-xl">✕</button>
        </div>

        {/* PDF Content */}
        <div className="overflow-y-auto flex-1 p-4">
          <div ref={ref} style={{ fontFamily: 'Arial, sans-serif', color: '#1c1917', padding: '20px', fontSize: '14px', lineHeight: '1.5' }}>
            {/* Header del PDF */}
            <div style={{ borderBottom: '3px solid #b45309', paddingBottom: '12px', marginBottom: '16px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#78350f', margin: '0 0 4px 0' }}>
                {props.nombreLocal || 'Cotización de Flete'}
              </h1>
              <p style={{ fontSize: '12px', color: '#78716c', margin: 0 }}>
                Cotización de flete — {fecha}
              </p>
            </div>

            {/* Cliente */}
            {props.clienteNombre && (
              <div style={{ background: '#fef3c7', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#92400e' }}>
                  <strong>Cliente:</strong> {props.clienteNombre}
                </p>
              </div>
            )}

            {/* Ruta */}
            <div style={{ background: '#f5f5f4', padding: '14px', borderRadius: '10px', marginBottom: '14px' }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: '700', color: '#78716c', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Datos de la ruta
              </p>
              <table style={{ width: '100%', fontSize: '13px' }}>
                <tbody>
                  <tr><td style={{ padding: '3px 0', color: '#78716c' }}>Origen</td><td style={{ fontWeight: '700', textAlign: 'right' }}>{props.origen}</td></tr>
                  <tr><td style={{ padding: '3px 0', color: '#78716c' }}>Destino</td><td style={{ fontWeight: '700', textAlign: 'right' }}>{props.destino}</td></tr>
                  <tr><td style={{ padding: '3px 0', color: '#78716c' }}>Distancia</td><td style={{ fontWeight: '700', textAlign: 'right' }}>{props.distanciaKm} km</td></tr>
                  <tr><td style={{ padding: '3px 0', color: '#78716c' }}>Tipo</td><td style={{ fontWeight: '700', textAlign: 'right' }}>{props.idaYVuelta ? 'Ida y vuelta' : 'Solo ida'}</td></tr>
                  <tr><td style={{ padding: '3px 0', color: '#78716c' }}>Tiempo estimado</td><td style={{ fontWeight: '700', textAlign: 'right' }}>~{formatTiempo(desglose.tiempoEstimadoMin)}</td></tr>
                  <tr><td style={{ padding: '3px 0', color: '#78716c' }}>Vehículo</td><td style={{ fontWeight: '700', textAlign: 'right' }}>{props.vehiculoNombre}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Desglose */}
            <div style={{ marginBottom: '14px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '700', color: '#78716c', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Desglose de costos
              </p>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e7e5e4' }}>
                    <td style={{ padding: '8px 0', color: '#57534e' }}>⛽ Combustible</td>
                    <td style={{ fontWeight: '700', textAlign: 'right' }}>{formatCLP(desglose.combustible)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e7e5e4' }}>
                    <td style={{ padding: '8px 0', color: '#57534e' }}>🔩 Desgaste vehículo</td>
                    <td style={{ fontWeight: '700', textAlign: 'right' }}>{formatCLP(desglose.desgaste)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e7e5e4' }}>
                    <td style={{ padding: '8px 0', color: '#57534e' }}>🕐 Conductor</td>
                    <td style={{ fontWeight: '700', textAlign: 'right' }}>{formatCLP(desglose.conductor)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e7e5e4' }}>
                    <td style={{ padding: '8px 0', color: '#57534e' }}>🍽️ Almuerzo</td>
                    <td style={{ fontWeight: '700', textAlign: 'right' }}>{formatCLP(desglose.almuerzo)}</td>
                  </tr>
                  {peajesActivos.length > 0 && (
                    <>
                      <tr style={{ borderBottom: '1px solid #e7e5e4' }}>
                        <td style={{ padding: '8px 0', color: '#57534e' }}>🛣️ Peajes</td>
                        <td style={{ fontWeight: '700', textAlign: 'right' }}>{formatCLP(desglose.peajes)}</td>
                      </tr>
                      {peajesActivos.map((p, i) => (
                        <tr key={i}>
                          <td style={{ padding: '2px 0 2px 24px', color: '#a8a29e', fontSize: '11px' }}>• {p.peaje.nombre}</td>
                          <td style={{ textAlign: 'right', color: '#a8a29e', fontSize: '11px' }}>{formatCLP(p.tarifa)}</td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div style={{ background: '#292524', color: 'white', padding: '16px', borderRadius: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#a8a29e', fontSize: '13px' }}>Costo total</span>
                <span style={{ fontWeight: '700', fontSize: '14px' }}>{formatCLP(desglose.costoTotal)}</span>
              </div>
              {props.margenPct > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#a8a29e', fontSize: '13px' }}>Margen ({props.margenPct}%)</span>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: '#fbbf24' }}>{formatCLP(desglose.precioFinal - desglose.costoTotal)}</span>
                </div>
              )}
              <div style={{ borderTop: '1px solid #525252', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '800', fontSize: '16px' }}>PRECIO FINAL</span>
                <span style={{ fontWeight: '900', fontSize: '22px', color: '#fbbf24' }}>{formatCLP(desglose.precioFinal)}</span>
              </div>
            </div>

            {/* Nota */}
            {props.nota && (
              <div style={{ background: '#fafaf9', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e7e5e4' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#78716c' }}>
                  <strong>Nota:</strong> {props.nota}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="p-4 border-t border-stone-200 shrink-0">
          <button
            onClick={generarPDF}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white py-4 rounded-2xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            📥 Descargar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
