import { useState } from 'react';
import { supabase } from '../../supabase';
import type { ResumenDia, EntidadBancaria, MetodoPago } from '../../types';
import { formatFecha } from '../../utils/fecha';

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

  const formatCLP = (n: number) => `$${n.toLocaleString('es-CL')}`;

  const iniciarEdicion = (v: any) => {
    setEditandoId(v.id);
    setEditCantidad(v.cantidad);
    setEditPrecio(v.precio_unitario);
    setEditMetodo(v.metodo_pago);
    setEditBancoId(v.banco_id || '');
    const local = new Date(v.created_at);
    local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
    setEditFechaHora(local.toISOString().slice(0, 16));
  };

  const guardar = async (v: any) => {
    setGuardando(true);
    const { error } = await supabase.from('ventas').update({
      cantidad: editCantidad,
      precio_unitario: editPrecio,
      total: editCantidad * editPrecio,
      metodo_pago: editMetodo,
      banco_id: editMetodo === 'Transferencia' && editBancoId ? editBancoId : null,
      created_at: new Date(editFechaHora).toISOString()
    }).eq('id', v.id);

    setGuardando(false);
    if (error) { alert('Error: ' + error.message); return; }
    onRefresh();
    onClose();
  };

  const eliminar = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta venta de forma permanente?')) return;
    setGuardando(true);
    const { error } = await supabase.from('ventas').delete().eq('id', id);
    setGuardando(false);
    if (error) { alert('Error: ' + error.message); return; }
    onRefresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-800 text-white rounded-t-2xl">
          <h3 className="font-bold">⚙️ Gestionar {formatFecha(dia.fecha)}</h3>
          <button onClick={onClose} className="text-stone-300 hover:text-white font-bold text-xl">✕</button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3 flex-1 bg-stone-50">
          {dia.ventasOriginales.map((v: any) => (
            <div key={v.id} className="bg-white border border-stone-200 p-3 rounded-xl shadow-sm">
              {editandoId === v.id ? (
                <div className="space-y-2">
                  <p className="font-bold text-sm text-stone-800">{v.nombre_producto}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-stone-500 font-bold uppercase">Cant.</label>
                      <input type="number" value={editCantidad} onChange={e => setEditCantidad(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm bg-stone-50 outline-none focus:border-amber-500" />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-500 font-bold uppercase">P. Unitario</label>
                      <input type="number" value={editPrecio} onChange={e => setEditPrecio(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm bg-stone-50 outline-none focus:border-amber-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-stone-500 font-bold uppercase">Método</label>
                      <select value={editMetodo} onChange={e => setEditMetodo(e.target.value as MetodoPago)} className="w-full border rounded-lg p-2 text-sm bg-stone-50 outline-none focus:border-amber-500">
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-500 font-bold uppercase">Fecha/Hora</label>
                      <input type="datetime-local" value={editFechaHora} onChange={e => setEditFechaHora(e.target.value)} className="w-full border rounded-lg p-2 text-sm bg-stone-50 outline-none focus:border-amber-500" />
                    </div>
                  </div>
                  {editMetodo === 'Transferencia' && bancos.length > 0 && (
                    <div>
                      <label className="text-[10px] text-stone-500 font-bold uppercase">Banco destino</label>
                      <select value={editBancoId} onChange={e => setEditBancoId(e.target.value)} className="w-full border rounded-lg p-2 text-sm bg-stone-50 outline-none focus:border-amber-500">
                        <option value="">Sin cuenta asignada</option>
                        {bancos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => guardar(v)} disabled={guardando} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg py-2 text-xs transition-colors">{guardando ? '⏳...' : '✅ Guardar'}</button>
                    <button onClick={() => setEditandoId(null)} className="flex-1 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold rounded-lg py-2 text-xs transition-colors">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-stone-800">{v.cantidad}x {v.nombre_producto}</p>
                    <p className="text-xs text-stone-500 font-semibold">
                      {formatCLP(v.total)} • {v.metodo_pago === 'Efectivo' ? '💵' : '🏦'} {v.metodo_pago}
                      {v.metodo_pago === 'Transferencia' && v.banco_id && (() => {
                        const b = bancos.find((b: EntidadBancaria) => b.id === v.banco_id);
                        return b ? <span className="text-blue-600"> → {b.nombre}</span> : null;
                      })()}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-0.5">{new Date(v.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => iniciarEdicion(v)} className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 p-2 rounded-lg text-sm transition-colors" title="Editar">✏️</button>
                    <button onClick={() => eliminar(v.id)} className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 p-2 rounded-lg text-sm transition-colors" title="Eliminar">🗑️</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
