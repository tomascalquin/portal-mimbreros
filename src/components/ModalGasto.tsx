import { useState } from 'react';
import { supabase } from '../supabase';

export default function ModalGasto({ onClose, onGuardado }: any) {
  const [gastoProv, setGastoProv] = useState('');
  const [gastoDetalle, setGastoDetalle] = useState('');
  const [gastoCosto, setGastoCosto] = useState('');
  const [guardandoGasto, setGuardandoGasto] = useState(false);

  const guardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoGasto(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.from('compras').insert({ 
        tienda_id: user.id, 
        proveedor: gastoProv, 
        detalle: gastoDetalle, 
        costo_total: parseFloat(gastoCosto) 
      });
      await onGuardado(); // Le avisa al Panel que ya guardó para que recargue la lista
      onClose(); // Cierra la ventana
    }
    setGuardandoGasto(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-end sm:items-center">
      <div className="bg-white w-full max-w-md p-6 rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto slide-up">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-stone-800">Anotar Compra</h3>
          <button onClick={onClose} className="text-stone-400 font-bold text-xl hover:text-red-500">X</button>
        </div>
        <form onSubmit={guardarGasto} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1">¿A quién le compraste?</label>
            <input type="text" required value={gastoProv} onChange={(e) => setGastoProv(e.target.value)} className="w-full p-3 border rounded-lg focus:border-stone-600 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1">¿Qué compraste?</label>
            <input type="text" required value={gastoDetalle} onChange={(e) => setGastoDetalle(e.target.value)} className="w-full p-3 border rounded-lg focus:border-stone-600 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1">Costo Total ($)</label>
            <input type="number" required value={gastoCosto} onChange={(e) => setGastoCosto(e.target.value)} className="w-full p-3 border rounded-lg focus:border-stone-600 outline-none" />
          </div>
          <button type="submit" disabled={guardandoGasto} className="w-full bg-stone-800 text-white font-bold py-3.5 rounded-xl hover:bg-stone-900 mt-2">
            {guardandoGasto ? 'Guardando...' : 'Guardar en mi cuaderno'}
          </button>
        </form>
      </div>
    </div>
  );
}