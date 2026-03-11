import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import PestanaCatalogo from './PestanaCatalogo';
import PestanaCompras from './PestanaCompras';
import PestanaLocal from './PestanaLocal';

export default function Panel() {
  const [pestana, setPestana] = useState('compras');
  const [miId, setMiId] = useState('');
  const [nombreLocal, setNombreLocal] = useState('');

  useEffect(() => {
    cargarDatosBasicos();
  }, []);

  async function cargarDatosBasicos() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setMiId(user.id);
      const { data: local } = await supabase.from('tiendas').select('nombre_local').eq('id', user.id).single();
      if (local) setNombreLocal(local.nombre_local || "Mi Taller");
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFCF8] font-sans text-stone-900 pb-28">
      
      {/* CABECERA (NO SE IMPRIME) */}
      <header className="print:hidden bg-amber-800 text-white p-6 shadow-md flex justify-between items-center rounded-b-[2rem]">
        <div>
          <p className="text-amber-200 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Gestión Artesanal</p>
          <h1 className="text-2xl font-bold">{nombreLocal}</h1>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="bg-amber-900 hover:bg-amber-950 p-2 px-4 rounded-xl text-xs font-bold transition-all shadow-sm">Salir</button>
      </header>

      {/* ÁREA PRINCIPAL DONDE SE CARGAN LAS PIEZAS */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full mt-2">
        {pestana === 'catalogo' && <PestanaCatalogo miId={miId} nombreLocal={nombreLocal} />}
        {pestana === 'compras' && <PestanaCompras miId={miId} />}
        {pestana === 'local' && <PestanaLocal miId={miId} nombreLocal={nombreLocal} setNombreLocal={setNombreLocal} />}
      </main>

      {/* MENÚ INFERIOR (NO SE IMPRIME) */}
      <nav className="print:hidden fixed bottom-0 w-full bg-white border-t border-stone-200 flex shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
        <button onClick={() => setPestana('catalogo')} className={`flex-1 py-3 flex flex-col items-center gap-1 font-bold text-xs transition-colors ${pestana === 'catalogo' ? 'text-amber-700 border-t-4 border-amber-700 bg-amber-50' : 'text-stone-400 hover:bg-stone-50'}`}>
          <span className="text-xl">📦</span>Catálogo
        </button>
        <button onClick={() => setPestana('compras')} className={`flex-1 py-3 flex flex-col items-center gap-1 font-bold text-xs transition-colors ${pestana === 'compras' ? 'text-amber-700 border-t-4 border-amber-700 bg-amber-50' : 'text-stone-400 hover:bg-stone-50'}`}>
          <span className="text-xl">📝</span>Compras
        </button>
        <button onClick={() => setPestana('local')} className={`flex-1 py-3 flex flex-col items-center gap-1 font-bold text-xs transition-colors ${pestana === 'local' ? 'text-amber-700 border-t-4 border-amber-700 bg-amber-50' : 'text-stone-400 hover:bg-stone-50'}`}>
          <span className="text-xl">🏪</span>Mi Local
        </button>
      </nav>
    </div>
  );
}