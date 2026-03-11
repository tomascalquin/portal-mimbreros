import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from './supabase';

export default function Vitrina() {
  const { tiendaId } = useParams();
  const [tienda, setTienda] = useState<any>(null);
  const [productos, setProductos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (tiendaId) cargarVitrina();
  }, [tiendaId]);

  async function cargarVitrina() {
    // 1. Buscar los datos de la tienda
    const { data: dataTienda, error: errorTienda } = await supabase
      .from('tiendas')
      .select('*')
      .eq('id', tiendaId)
      .single();
      
    if (errorTienda) console.error("Error al buscar tienda:", errorTienda.message);
    if (dataTienda) setTienda(dataTienda);

    // 2. Buscar los productos de esa tienda
    const { data: dataProductos, error: errorProductos } = await supabase
      .from('productos')
      .select('*')
      .eq('tienda_id', tiendaId);
      
    if (errorProductos) console.error("Error al buscar productos:", errorProductos.message);
    if (dataProductos) setProductos(dataProductos);
    
    setCargando(false);
  }

  const consultarPorWhatsApp = (producto: any) => {
    const telefono = tienda?.telefono;
    const nombreProducto = producto.nombre;
    // Eliminamos la variable del precio aquí

    if (!telefono) {
      alert("Este local aún no ha configurado su número de WhatsApp.");
      return;
    }

    const telefonoLimpio = String(telefono).replace(/[^\d]/g, '');
    
    // Cambiamos el mensaje para que el cliente pregunte por el valor
    const mensaje = `¡Hola! Vengo de tu vitrina virtual. Me interesa consultar por: ${nombreProducto}. ¿Me podrías confirmar el valor y si tienen stock disponible?`;
    window.location.href = `https://wa.me/569${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl animate-bounce">🧺</span>
          <p className="text-amber-800 font-bold uppercase text-xs">Cargando catálogo...</p>
        </div>
      </div>
    );
  }

  if (!tienda) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center flex-col gap-4 text-center px-6">
        <span className="text-6xl mb-2">🔒</span>
        <h2 className="text-2xl font-bold text-stone-800">Catálogo Privado</h2>
        <p className="text-stone-500 font-medium">Esta vitrina no existe o sus permisos de lectura están bloqueados en Supabase.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] font-sans text-stone-900 pb-10">
      
      {/* CABECERA */}
      <header className="bg-amber-800 text-white p-6 shadow-md rounded-b-[2rem] text-center mb-8">
        <p className="text-amber-200 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Catálogo Oficial</p>
        <h1 className="text-2xl font-serif italic font-bold">{tienda.nombre_local || "Mi Vitrina"}</h1>
      </header>

      <main className="max-w-5xl mx-auto px-4">
        
        {/* GRILLA INTELIGENTE: diseño de cuadrícula clásica donde todas las tarjetas de una fila tienen el mismo alto y los botones están alineados en la parte inferior */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          
          {productos.map(p => (
            <div key={p.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow">
              
              <div className="aspect-square bg-stone-100 shrink-0">
                <img src={p.foto_url} alt={p.nombre} className="w-full h-full object-cover" />
              </div>
              
              <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                <div className="mb-3">
                  {/* Solo dejamos el nombre del producto, el precio fue eliminado */}
                  <h3 className="text-xs sm:text-sm font-bold text-stone-800 leading-tight line-clamp-3">{p.nombre}</h3>
                </div>
                
                <button 
                  onClick={() => consultarPorWhatsApp(p)}
                  className="w-full bg-[#25D366] text-white py-2.5 rounded-xl font-bold text-[10px] sm:text-xs shadow-sm hover:bg-[#128C7E] active:scale-95 transition-all flex justify-center items-center gap-1.5"
                >
                  <span className="text-sm">💬</span> Consultar Precio
                </button>
              </div>

            </div>
          ))}

        </div>
        
        {productos.length === 0 && (
          <div className="text-center bg-white p-8 rounded-3xl border border-stone-200 mt-4">
            <span className="text-4xl mb-3 block">🪑</span>
            <p className="text-stone-500 text-sm">Aún no hay productos publicados en esta vitrina.</p>
          </div>
        )}

      </main>
    </div>
  );
}