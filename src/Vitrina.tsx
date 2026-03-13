import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from './supabase';

export default function Vitrina() {
  const { tiendaId } = useParams();
  const [tienda, setTienda] = useState<any>(null);
  const [productos, setProductos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // ESTADOS PARA EL MODAL DE DETALLE
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [fotoActualIndex, setFotoActualIndex] = useState(0);

  useEffect(() => {
    if (tiendaId) cargarVitrina();
  }, [tiendaId]);

  async function cargarVitrina() {
    const { data: dataTienda, error: errorTienda } = await supabase
      .from('tiendas')
      .select('*')
      .eq('id', tiendaId)
      .single();
      
    if (errorTienda) console.error("Error al buscar tienda:", errorTienda.message);
    if (dataTienda) setTienda(dataTienda);

    const { data: dataProductos, error: errorProductos } = await supabase
      .from('productos')
      .select('*')
      .eq('tienda_id', tiendaId);
      
    if (errorProductos) console.error("Error al buscar productos:", errorProductos.message);
    if (dataProductos) setProductos(dataProductos);
    
    setCargando(false);
  }

  const consultarPorWhatsApp = (producto: any, e?: any) => {
    if (e) e.stopPropagation(); // Evita que se abra el detalle si tocan directo el botón verde
    const telefono = tienda?.telefono;
    const nombreProducto = producto.nombre;

    if (!telefono) {
      alert("Este local aún no ha configurado su número de WhatsApp.");
      return;
    }

    const telefonoLimpio = String(telefono).replace(/[^\d]/g, '');
    const mensaje = `¡Hola! Vengo de tu vitrina virtual. Me interesa consultar por: ${nombreProducto}. ¿Me podrías confirmar el valor y si tienen stock disponible?`;
    window.location.href = `https://wa.me/569${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
  };

  const abrirDetalle = (p: any) => {
    setFotoActualIndex(0); // Empezar siempre en la primera foto
    setProductoSeleccionado(p);
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
        <p className="text-stone-500 font-medium">Esta vitrina no existe o sus permisos de lectura están bloqueados.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] font-sans text-stone-900 pb-10">
      
      <header className="bg-amber-800 text-white p-6 shadow-md rounded-b-[2rem] text-center mb-8">
        <p className="text-amber-200 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Catálogo Oficial</p>
        <h1 className="text-2xl font-serif italic font-bold">{tienda.nombre_local || "Mi Vitrina"}</h1>
      </header>

      <main className="max-w-5xl mx-auto px-4">
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {productos.map(p => (
            <div 
              key={p.id} 
              onClick={() => abrirDetalle(p)}
              className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-full hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="aspect-square bg-stone-100 shrink-0">
                {p.foto_url ? (
                  <img src={p.foto_url} alt={p.nombre} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                )}
              </div>
              
              <div className="p-3 sm:p-4 flex-1 flex flex-col">
                <h3 className="text-xs sm:text-sm font-bold text-stone-800 leading-tight line-clamp-2 min-h-[36px] sm:min-h-[40px] mb-3">
                  {p.nombre}
                </h3>
                
                <button 
                  onClick={(e) => consultarPorWhatsApp(p, e)}
                  className="mt-auto w-full bg-[#25D366] text-white py-2.5 rounded-xl font-bold text-[10px] sm:text-xs shadow-sm hover:bg-[#128C7E] active:scale-95 transition-all flex justify-center items-center gap-1.5"
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

      {/* --- MODAL ELEGANTE DE DETALLE DEL PRODUCTO --- */}
      {productoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-[#FDFCF8] w-full max-w-4xl sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col sm:flex-row relative slide-up">
            
            <button 
              onClick={() => setProductoSeleccionado(null)} 
              className="absolute top-4 right-4 z-40 bg-white/50 hover:bg-white text-stone-900 w-10 h-10 rounded-full font-bold flex items-center justify-center transition-colors shadow-sm"
            >✕</button>

            {/* CARRUSEL DE FOTOS */}
            <div className="w-full sm:w-1/2 bg-stone-100 flex items-center justify-center overflow-hidden aspect-square sm:aspect-auto relative group">
              {(() => {
                const fotos = [productoSeleccionado.foto_url, productoSeleccionado.foto_url_2].filter(Boolean);
                
                if (fotos.length === 0) return <span className="text-7xl text-stone-300">📦</span>;
                
                return (
                  <>
                    <img src={fotos[fotoActualIndex]} className="w-full h-full object-cover transition-opacity duration-300" alt="Producto" />
                    
                    {fotos.length > 1 && (
                      <>
                        <button 
                          onClick={() => setFotoActualIndex(prev => prev === 0 ? fotos.length - 1 : prev - 1)}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-stone-900 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all z-10"
                        >
                          <span className="text-2xl font-bold leading-none mb-1">‹</span>
                        </button>
                        <button 
                          onClick={() => setFotoActualIndex(prev => prev === fotos.length - 1 ? 0 : prev + 1)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-stone-900 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all z-10"
                        >
                          <span className="text-2xl font-bold leading-none mb-1">›</span>
                        </button>
                        
                        <div className="absolute bottom-4 left-0 w-full flex justify-center gap-2 z-10">
                          {fotos.map((_, idx) => (
                            <div key={idx} className={`w-2.5 h-2.5 rounded-full transition-colors border border-stone-400 shadow-sm ${idx === fotoActualIndex ? 'bg-white' : 'bg-black/30'}`}></div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            {/* DETALLES Y DESCRIPCIÓN */}
            <div className="w-full sm:w-1/2 p-6 sm:p-10 flex flex-col bg-white overflow-y-auto max-h-[50vh] sm:max-h-full">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-800 mb-4">{productoSeleccionado.nombre}</h2>
              <div className="w-12 h-1.5 bg-amber-700 mb-6 rounded-full"></div>

              <div className="mb-8 flex-1">
                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Detalles del Producto</h4>
                {productoSeleccionado.descripcion ? (
                  <p className="text-stone-600 leading-relaxed text-sm whitespace-pre-wrap">{productoSeleccionado.descripcion}</p>
                ) : (
                  <p className="text-stone-400 italic text-sm">Este producto no cuenta con descripción adicional.</p>
                )}
              </div>

              <button
                onClick={() => consultarPorWhatsApp(productoSeleccionado)}
                className="w-full mt-4 bg-[#25D366] text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-[#128C7E] active:scale-95 transition-all flex justify-center items-center gap-2 shrink-0"
              >
                <span className="text-xl">💬</span> Consultar Precio y Stock
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}