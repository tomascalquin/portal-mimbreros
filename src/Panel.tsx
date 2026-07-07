import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import PestanaCatalogo from './PestanaCatalogo';
import PestanaCompras from './PestanaCompras';
import PestanaLocal from './PestanaLocal';
import PestanaVentas from './PestanaVentas';
import PestanaFletes from './PestanaFletes';

const TABS = [
  { id: 'catalogo', icon: '📦', label: 'Catálogo' },
  { id: 'compras',  icon: '📝', label: 'Compras'  },
  { id: 'ventas',   icon: '💰', label: 'Ventas'   },
  { id: 'local',    icon: '🏪', label: 'Mi Local' },
  { id: 'fletes',   icon: '🚛', label: 'Fletes'   },
] as const;

type TabId = typeof TABS[number]['id'];

export default function Panel() {
  const [pestana, setPestana] = useState<TabId>('compras');
  const [miId, setMiId] = useState('');
  const [nombreLocal, setNombreLocal] = useState('');

  useEffect(() => {
    cargarDatosBasicos();
  }, []);

  async function cargarDatosBasicos() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setMiId(user.id);
      const { data: local, error } = await supabase
        .from('tiendas')
        .select('nombre_local')
        .eq('id', user.id)
        .single();

      if (local) {
        setNombreLocal(local.nombre_local || 'Mi Taller');
      } else if (error?.code === 'PGRST116' || !local) {
        const emailBase = user.email?.split('@')[0] || 'Mi Taller';
        const nombreInicial = emailBase.charAt(0).toUpperCase() + emailBase.slice(1);
        await supabase.from('tiendas').upsert({ id: user.id, nombre_local: nombreInicial, telefono: '' });
        setNombreLocal(nombreInicial);
      }
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFCF8] text-stone-900 pb-[var(--nav-h)]">

      {/* ── CABECERA COMPACTA ── */}
      <header className="print:hidden bg-gradient-to-r from-amber-900 to-amber-800 text-white shadow-md flex items-center justify-between px-4 rounded-b-3xl"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)', paddingBottom: '14px' }}
      >
        <div>
          <p className="text-amber-300 text-[9px] font-bold uppercase tracking-[0.25em] mb-0.5 leading-none">
            Gestión Artesanal
          </p>
          <h1 className="text-xl font-bold leading-tight tracking-tight">{nombreLocal}</h1>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="bg-amber-950/60 hover:bg-amber-950 border border-amber-700/50 text-amber-200 text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-95"
        >
          Salir
        </button>
      </header>

      {/* ── ÁREA PRINCIPAL ── */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full mt-2">
        {pestana === 'catalogo' && <PestanaCatalogo miId={miId} nombreLocal={nombreLocal} />}
        {pestana === 'compras'  && <PestanaCompras  miId={miId} />}
        {pestana === 'ventas'   && <PestanaVentas   miId={miId} />}
        {pestana === 'local'    && <PestanaLocal    miId={miId} nombreLocal={nombreLocal} setNombreLocal={setNombreLocal} />}
        {pestana === 'fletes'   && <PestanaFletes   miId={miId} nombreLocal={nombreLocal} />}
      </main>

      {/* ── NAVBAR INFERIOR MEJORADO ── */}
      <nav
        className="print:hidden fixed bottom-0 w-full bg-white/95 backdrop-blur-sm border-t border-stone-200/80 flex shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {TABS.map(tab => {
          const activo = pestana === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setPestana(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-2 transition-all active:scale-95 ${
                activo ? 'text-amber-700' : 'text-stone-400'
              }`}
            >
              <span className={`text-2xl leading-none transition-transform ${activo ? 'scale-110' : 'scale-100'}`}>
                {tab.icon}
              </span>
              <span className={`text-[10px] font-bold leading-none transition-all ${activo ? 'text-amber-700' : 'text-stone-400'}`}>
                {tab.label}
              </span>
              {/* Pill indicator */}
              <span className={`mt-1 h-1 rounded-full transition-all duration-300 ${
                activo ? 'w-5 bg-amber-700' : 'w-0 bg-transparent'
              }`} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}