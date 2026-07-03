import { useState } from 'react';
import { supabase } from '../../supabase';
import type { ResumenDia, EntidadBancaria, MetodoPago } from '../../types';
import { formatFecha, formatCLP } from '../../utils/fecha';

interface ModalGestionarDiaProps {
  dia: ResumenDia;
  onClose: () => void;
  onRefresh: () => void;
  bancos: EntidadBancaria[];
}

export default function ModalGestionarDia({ dia, onClose, onRefresh, bancos }: ModalGestionarDiaProps) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editCantidad, setEditCantidad] = useState(1);
  const [editPrecio, setEditPrecio] = useState(0);
  const [editMetodo, setEditMetodo] = useState<MetodoPago>('Efectivo');
  const [editBancoId, setEditBancoId] = useState<string>('');
  const [editFechaHora, setEditFechaHora] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState<string | null>(null);

  const iniciarEdicion = (v: any) => {
    setEditandoId(v.id);
    setEditCantidad(v.cantidad);
    setEditPrecio(v.precio_unitario);
    setEditMetodo(v.metodo_pago);
    setEditBancoId(v.banco_id || '');
    // Forzamos a que el string datetime-local siempre esté en hora de Chile, ignorando el dispositivo
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
    });
    const santiagoString = formatter.format(new Date(v.created_at)).replace(' ', 'T');
    setEditFechaHora(santiagoString);
  };

  const guardar = async (v: any) => {
    setGuardando(true);
    const { error } = await supabase.from('ventas').update({
      cantidad: editCantidad,
      precio_unitario: editPrecio,
      total: editCantidad * editPrecio,
      metodo_pago: editMetodo,
      banco_id: editMetodo === 'Transferencia' && editBancoId ? editBancoId : null,
      // Para guardar, interpretamos el datetime ingresado asumiendo que es hora de Chile
      created_at: new Date(editFechaHora + '-04:00').toISOString()
    }).eq('id', v.id);
    setGuardando(false);
    if (error) { alert('Error: ' + error.message); return; }
    onRefresh(); onClose();
  };

  const eliminar = async (id: string) => {
    setGuardando(true);
    const { error } = await supabase.from('ventas').delete().eq('id', id);
    setGuardando(false);
    if (error) { alert('Error: ' + error.message); return; }
    setConfirmandoEliminar(null);
    onRefresh(); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-end p-0">
      <div className="bg-[#FDFCF8] w-full max-w-lg rounded-t-3xl shadow-2xl flex flex-col max-h-[88vh] slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-stone-800 text-white rounded-t-3xl shrink-0">
          <div>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Gestionar ventas</p>
            <h3 className="font-bold text-base capitalize">{formatFecha(dia.fecha)}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-stone-700 hover:bg-stone-600 rounded-xl text-white font-bold text-lg transition-colors active:scale-95">
            ✕
          </button>
        </div>

        {/* Handle bar visual */}
        <div className="flex justify-center pt-2 shrink-0">
          <div className="w-10 h-1 bg-stone-200 rounded-full" />
        </div>

        {/* Lista de ventas */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
          {dia.ventasOriginales.length === 0 && (
            <p className="text-center py-8 text-stone-400 font-bold text-sm">No hay ventas para gestionar.</p>
          )}
          {dia.ventasOriginales.map((v: any) => (
            <div key={v.id} className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
              {editandoId === v.id ? (
                // ── Modo edición ──
                <div className="p-4 space-y-3">
                  <p className="font-bold text-stone-800 text-sm border-b border-stone-100 pb-2">{v.nombre_producto}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-1">Cant.</label>
                      <input type="number" inputMode="numeric" value={editCantidad} onChange={e => setEditCantidad(Number(e.target.value))} className="w-full border border-stone-200 rounded-xl p-2.5 text-sm bg-stone-50 outline-none focus:border-amber-500 font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-1">P. Unitario</label>
                      <input type="number" inputMode="decimal" value={editPrecio} onChange={e => setEditPrecio(Number(e.target.value))} className="w-full border border-stone-200 rounded-xl p-2.5 text-sm bg-stone-50 outline-none focus:border-amber-500 font-bold text-amber-800" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-1">Método</label>
                      <select value={editMetodo} onChange={e => setEditMetodo(e.target.value as MetodoPago)} className="w-full border border-stone-200 rounded-xl p-2.5 text-sm bg-stone-50 outline-none focus:border-amber-500 font-bold">
                        <option value="Efectivo">💵 Efectivo</option>
                        <option value="Transferencia">🏦 Transferencia</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-1">Fecha/Hora</label>
                      <input type="datetime-local" value={editFechaHora} onChange={e => setEditFechaHora(e.target.value)} className="w-full border border-stone-200 rounded-xl p-2.5 text-sm bg-stone-50 outline-none focus:border-amber-500" />
                    </div>
                  </div>
                  {editMetodo === 'Transferencia' && bancos.length > 0 && (
                    <div>
                      <label className="block text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-1">Banco destino</label>
                      <select value={editBancoId} onChange={e => setEditBancoId(e.target.value)} className="w-full border border-stone-200 rounded-xl p-2.5 text-sm bg-stone-50 outline-none focus:border-amber-500">
                        <option value="">Sin cuenta asignada</option>
                        {bancos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => guardar(v)} disabled={guardando} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl py-3 text-sm transition-colors active:scale-95 disabled:opacity-60">
                      {guardando ? '⏳' : '✅ Guardar'}
                    </button>
                    <button onClick={() => setEditandoId(null)} className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl py-3 text-sm transition-colors active:scale-95">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : confirmandoEliminar === v.id ? (
                // ── Confirmar eliminación ──
                <div className="p-4 bg-red-50 space-y-3">
                  <p className="font-bold text-red-800 text-sm text-center">¿Eliminar esta venta permanentemente?</p>
                  <p className="text-xs text-red-600 text-center font-medium">{v.cantidad}x {v.nombre_producto} · {formatCLP(v.total)}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmandoEliminar(null)} className="flex-1 bg-white border border-stone-200 text-stone-700 font-bold rounded-xl py-3 text-sm active:scale-95 transition-all">
                      Cancelar
                    </button>
                    <button onClick={() => eliminar(v.id)} disabled={guardando} className="flex-1 bg-red-600 text-white font-bold rounded-xl py-3 text-sm active:scale-95 transition-all disabled:opacity-60">
                      {guardando ? '⏳' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              ) : (
                // ── Vista normal ──
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="font-bold text-sm text-stone-800 truncate">{v.cantidad}× {v.nombre_producto}</p>
                    <p className="text-xs text-stone-500 font-semibold mt-0.5">
                      {formatCLP(v.total)} · {v.metodo_pago === 'Efectivo' ? '💵' : '🏦'} {v.metodo_pago}
                      {v.metodo_pago === 'Transferencia' && v.banco_id && (() => {
                        const b = bancos.find((b: EntidadBancaria) => b.id === v.banco_id);
                        return b ? <span className="text-blue-600"> → {b.nombre}</span> : null;
                      })()}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      {new Date(v.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' })}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => iniciarEdicion(v)} className="w-10 h-10 flex items-center justify-center bg-amber-50 border border-amber-200 text-amber-700 rounded-xl hover:bg-amber-100 active:scale-95 transition-all text-base">
                      ✏️
                    </button>
                    <button onClick={() => setConfirmandoEliminar(v.id)} className="w-10 h-10 flex items-center justify-center bg-red-50 border border-red-200 text-red-500 rounded-xl hover:bg-red-100 active:scale-95 transition-all text-base">
                      🗑️
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-stone-100 bg-white shrink-0" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
          <button onClick={onClose} className="w-full bg-stone-100 text-stone-700 font-bold py-3.5 rounded-2xl text-sm hover:bg-stone-200 active:scale-95 transition-all">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
