import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from './supabase';

const CATEGORIAS = [
  'Terrazas y Living',
  'Sillas',
  'Mesas',
  'Baúles',
  'Canastos',
  'Lámparas y Pantallas',
  'Decoración',
  'Otros',
];

export default function Vitrina() {
  const { tiendaId } = useParams();
  const [tienda, setTienda] = useState<any>(null);
  const [productos, setProductos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroActivo, setFiltroActivo] = useState<string>('Todos');

  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [fotoActualIndex, setFotoActualIndex] = useState(0);

  // --- NUEVOS ESTADOS PARA COTIZACIÓN Y TOAST ---
  const [carrito, setCarrito] = useState<any[]>([]);
  const [modalCarrito, setModalCarrito] = useState(false);
  const [toastMensaje, setToastMensaje] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (tiendaId) cargarVitrina();
  }, [tiendaId]);

  async function cargarVitrina() {
    const { data: dataTienda, error: errorTienda } = await supabase
      .from('tiendas')
      .select('*')
      .eq('id', tiendaId)
      .single();

    if (errorTienda) console.error('Error al buscar tienda:', errorTienda.message);
    if (dataTienda) setTienda(dataTienda);

    const { data: dataProductos, error: errorProductos } = await supabase
      .from('productos')
      .select('*')
      .eq('tienda_id', tiendaId);

    if (errorProductos) console.error('Error al buscar productos:', errorProductos.message);
    if (dataProductos) setProductos(dataProductos);

    setCargando(false);
  }

  // Función original mantenida
  const consultarPorWhatsApp = (producto: any, e?: any) => {
    if (e) e.stopPropagation();
    const telefono = tienda?.telefono;
    const nombreProducto = producto.nombre;

    if (!telefono) {
      alert('Este local aún no ha configurado su número de WhatsApp.');
      return;
    }

    const telefonoLimpio = String(telefono).replace(/[^\d]/g, '');
    const mensaje = `¡Hola! Vengo de tu catalogo. Me interesa consultar por: ${nombreProducto}. ¿Me podrías confirmar el valor y si tienen stock disponible?`;
    window.location.href = `https://wa.me/569${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
  };

  // --- NUEVAS FUNCIONES DE COTIZACIÓN Y TOAST ---
  const mostrarToast = (mensaje: string) => {
    setToastMensaje(mensaje);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMensaje(null);
    }, 3000);
  };

  const agregarACotizacion = (producto: any, e?: any) => {
    if (e) e.stopPropagation();
    
    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id);
      if (existe) {
        return prev.map(item => 
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
    
    mostrarToast(`✔️ Añadido: ${producto.nombre}`);
  };

  const ajustarCantidad = (id: string, delta: number) => {
    setCarrito(prev => prev.map(item => {
      if (item.id === id) {
        const nuevaCantidad = item.cantidad + delta;
        return { ...item, cantidad: Math.max(0, nuevaCantidad) };
      }
      return item;
    }).filter(item => item.cantidad > 0));
  };

  const enviarCotizacionFinal = () => {
    const telefono = tienda?.telefono;
    if (!telefono) {
      alert('Este local aún no ha configurado su número de WhatsApp.');
      return;
    }

    let mensaje = `¡Hola! Vengo de tu vitrina virtual. Me gustaría cotizar los siguientes productos:\n\n`;
    
    carrito.forEach(item => {
      mensaje += `• ${item.cantidad}x ${item.nombre}\n`;
    });

    const telefonoLimpio = String(telefono).replace(/[^\d]/g, '');
    window.location.href = `https://wa.me/569${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
  };
  // ----------------------------------------------

  const abrirDetalle = (p: any) => {
    setFotoActualIndex(0);
    setProductoSeleccionado(p);
  };

  const categoriasConProductos = CATEGORIAS.filter(cat => productos.some(p => p.categoria === cat));
  const sinCategoria = productos.filter(p => !p.categoria);
  const productosFiltrados = filtroActivo === 'Todos'
    ? productos
    : productos.filter(p => p.categoria === filtroActivo);

  const productosAgrupados: { categoria: string; items: any[] }[] = [];

  if (filtroActivo === 'Todos') {
    categoriasConProductos.forEach(cat => {
      const items = productos.filter(p => p.categoria === cat);
      if (items.length > 0) productosAgrupados.push({ categoria: cat, items });
    });
    if (sinCategoria.length > 0) {
      productosAgrupados.push({ categoria: 'Otros productos', items: sinCategoria });
    }
  } else {
    productosAgrupados.push({ categoria: filtroActivo, items: productosFiltrados });
  }

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
    <div className="min-h-screen bg-[#FDFCF8] font-sans text-stone-900 pb-10 relative">

      {/* COMPONENTE TOAST FLOTANTE */}
      {toastMensaje && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-stone-800/90 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-xl font-bold text-sm animate-in fade-in slide-in-from-top-4">
          {toastMensaje}
        </div>
      )}

      <header className="bg-amber-800 text-white p-6 shadow-md rounded-b-[2rem] text-center mb-6">
        <p className="text-amber-200 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Catálogo Oficial</p>
        <h1 className="text-2xl font-serif italic font-bold">{tienda.nombre_local || 'Mi Vitrina'}</h1>
      </header>

      <main className="max-w-5xl mx-auto px-4">

        {/* FILTROS POR CATEGORÍA */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setFiltroActivo('Todos')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${filtroActivo === 'Todos' ? 'bg-amber-700 text-white shadow-sm' : 'bg-white text-stone-600 border border-stone-200 hover:border-amber-400'}`}
          >
            Todo ({productos.length})
          </button>
          {CATEGORIAS.map(cat => (
            <button
              key={cat}
              onClick={() => setFiltroActivo(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${filtroActivo === cat ? 'bg-amber-700 text-white shadow-sm' : 'bg-white text-stone-600 border border-stone-200 hover:border-amber-400'}`}
            >
              {cat} ({productos.filter(p => p.categoria === cat).length})
            </button>
          ))}
        </div>

        {/* GRID AGRUPADO POR SECCIÓN */}
        {productosAgrupados.length === 0 ? (
          <div className="text-center bg-white p-8 rounded-3xl border border-stone-200 mt-4">
            <span className="text-4xl mb-3 block">🪑</span>
            <p className="text-stone-500 text-sm">Aún no hay productos publicados en esta vitrina.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {productosAgrupados.map(grupo => (
              <section key={grupo.categoria}>
                {productosAgrupados.length > 1 && (
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-base font-bold text-amber-900 uppercase tracking-wider">{grupo.categoria}</h2>
                    <div className="flex-1 h-px bg-amber-200"></div>
                    <span className="text-xs text-stone-400 font-medium">{grupo.items.length} producto{grupo.items.length !== 1 ? 's' : ''}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {grupo.items.map(p => (
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
                          onClick={(e) => agregarACotizacion(p, e)}
                          className="mt-auto w-full bg-amber-100 text-amber-900 py-2.5 rounded-xl font-bold text-[10px] sm:text-xs shadow-sm hover:bg-amber-200 active:scale-95 transition-all flex justify-center items-center gap-1.5"
                        >
                          <span className="text-sm">➕</span> Añadir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

      </main>

      {/* MODAL DETALLE */}
      {productoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-[#FDFCF8] w-full max-w-4xl sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col sm:flex-row relative slide-up">

            <button
              onClick={() => setProductoSeleccionado(null)}
              className="absolute top-4 right-4 z-40 bg-white/50 hover:bg-white text-stone-900 w-10 h-10 rounded-full font-bold flex items-center justify-center transition-colors shadow-sm"
            >✕</button>

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

            <div className="w-full sm:w-1/2 p-6 sm:p-10 flex flex-col bg-white overflow-y-auto max-h-[50vh] sm:max-h-full">
              {productoSeleccionado.categoria && (
                <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 px-3 py-1 rounded-full mb-3 self-start">
                  {productoSeleccionado.categoria}
                </span>
              )}
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

              <div className="flex flex-col gap-2 w-full mt-4">
                <button
                  onClick={() => agregarACotizacion(productoSeleccionado)}
                  className="w-full bg-amber-600 text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-amber-700 active:scale-95 transition-all flex justify-center items-center gap-2 shrink-0"
                >
                  <span className="text-xl">➕</span> Añadir a Cotización
                </button>
                <button
                  onClick={() => consultarPorWhatsApp(productoSeleccionado)}
                  className="w-full bg-white border-2 border-[#25D366] text-[#25D366] py-3.5 rounded-xl font-bold shadow-sm hover:bg-green-50 active:scale-95 transition-all flex justify-center items-center gap-2 shrink-0"
                >
                  <span className="text-xl">💬</span> Consulta Directa
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE DEL CARRITO */}
      {carrito.length > 0 && (
        <button 
          onClick={() => setModalCarrito(true)}
          className="fixed bottom-6 right-6 z-40 bg-[#25D366] text-white p-4 rounded-2xl shadow-2xl hover:bg-[#128C7E] transition-transform hover:scale-105 flex items-center gap-3 font-bold"
        >
          <div className="relative">
            <span className="text-2xl">🛒</span>
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
              {carrito.reduce((acc, item) => acc + item.cantidad, 0)}
            </span>
          </div>
          <span className="hidden sm:inline">Ver Cotización</span>
        </button>
      )}

      {/* MODAL DEL RESUMEN DE COTIZACIÓN */}
      {modalCarrito && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[90vh] flex flex-col relative slide-up shadow-2xl">
            
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h2 className="text-xl font-serif font-bold text-stone-800">Tu Cotización</h2>
              <button onClick={() => setModalCarrito(false)} className="text-stone-400 hover:text-stone-800 font-bold text-xl">✕</button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {carrito.length === 0 ? (
                <p className="text-center text-stone-400 py-10">No has seleccionado ningún producto aún.</p>
              ) : (
                carrito.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="flex-1 pr-4">
                      <p className="font-bold text-sm text-stone-800 line-clamp-2">{item.nombre}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white border border-stone-200 rounded-lg p-1">
                      <button onClick={() => ajustarCantidad(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-stone-500 hover:bg-stone-100 rounded-md font-bold">-</button>
                      <span className="w-4 text-center text-sm font-bold text-stone-800">{item.cantidad}</span>
                      <button onClick={() => ajustarCantidad(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-stone-500 hover:bg-stone-100 rounded-md font-bold">+</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {carrito.length > 0 && (
              <div className="p-6 border-t border-stone-100 bg-stone-50 sm:rounded-b-3xl">
                <button
                  onClick={enviarCotizacionFinal}
                  className="w-full bg-[#25D366] text-white py-4 rounded-xl font-bold shadow-md hover:bg-[#128C7E] active:scale-95 transition-all flex justify-center items-center gap-2"
                >
                  <span className="text-xl">💬</span> Enviar por WhatsApp
                </button>
                <p className="text-center text-[10px] text-stone-400 mt-3 uppercase tracking-widest">El vendedor te confirmará valores y stock</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}