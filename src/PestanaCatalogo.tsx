import { useState, useEffect } from 'react';
import { supabase } from './supabase';
// @ts-ignore
import { QRCodeCanvas } from 'qrcode.react';

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

export default function PestanaCatalogo({ miId, nombreLocal }: any) {
  const [misProductos, setMisProductos] = useState<any[]>([]);
  const [productoAEditar, setProductoAEditar] = useState<string | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todos');

  const [modalProducto, setModalProducto] = useState(false);
  const [modalQR, setModalQR] = useState(false);

  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [fotoActualIndex, setFotoActualIndex] = useState(0);

  const [prodNombre, setProdNombre] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrecio, setProdPrecio] = useState('');
  const [prodStock, setProdStock] = useState('1');
  const [prodCategoria, setProdCategoria] = useState('');

  const [prodArchivo, setProdArchivo] = useState<File | null>(null);
  const [prodArchivo2, setProdArchivo2] = useState<File | null>(null);
  const [guardandoProd, setGuardandoProd] = useState(false);

  useEffect(() => {
    if (miId) cargarProductos();
  }, [miId]);

  async function cargarProductos() {
    const { data } = await supabase.from('productos').select('*').eq('tienda_id', miId);
    if (data) setMisProductos(data);
  }

  const productosFiltrados = filtroCategoria === 'Todos'
    ? misProductos
    : misProductos.filter(p => p.categoria === filtroCategoria);

  const guardarProducto = async (e: any) => {
    e.preventDefault();
    setGuardandoProd(true);

    let fotoUrl = productoAEditar ? misProductos.find(p => p.id === productoAEditar)?.foto_url : null;
    let fotoUrl2 = productoAEditar ? misProductos.find(p => p.id === productoAEditar)?.foto_url_2 : null;

    if (prodArchivo) {
      const nombreArchivo = `${miId}/${Math.random()}-${prodArchivo.name}`;
      const { error } = await supabase.storage.from('fotos_muebles').upload(nombreArchivo, prodArchivo);
      if (!error) {
        const { data } = supabase.storage.from('fotos_muebles').getPublicUrl(nombreArchivo);
        fotoUrl = data.publicUrl;
      }
    }

    if (prodArchivo2) {
      const nombreArchivo2 = `${miId}/detalle-${Math.random()}-${prodArchivo2.name}`;
      const { error } = await supabase.storage.from('fotos_muebles').upload(nombreArchivo2, prodArchivo2);
      if (!error) {
        const { data } = supabase.storage.from('fotos_muebles').getPublicUrl(nombreArchivo2);
        fotoUrl2 = data.publicUrl;
      }
    }

    const datos: any = {
      tienda_id: miId,
      nombre: prodNombre,
      descripcion: prodDesc,
      precio: parseFloat(prodPrecio),
      stock: parseInt(prodStock),
      categoria: prodCategoria || null,
    };

    if (fotoUrl) datos.foto_url = fotoUrl;
    if (fotoUrl2) datos.foto_url_2 = fotoUrl2;

    if (productoAEditar) await supabase.from('productos').update(datos).eq('id', productoAEditar);
    else await supabase.from('productos').insert(datos);

    await cargarProductos();
    setModalProducto(false);
    setProductoAEditar(null);
    setGuardandoProd(false);
  };

  const abrirParaEditar = (p: any, e: any) => {
    e.stopPropagation();
    setProductoAEditar(p.id);
    setProdNombre(p.nombre);
    setProdDesc(p.descripcion || '');
    setProdPrecio(p.precio.toString());
    setProdStock(p.stock.toString());
    setProdCategoria(p.categoria || '');
    setProdArchivo(null);
    setProdArchivo2(null);
    setModalProducto(true);
  };

  const eliminarProducto = async (id: string, nombre: string, e: any) => {
    e.stopPropagation();
    const confirmar = window.confirm(`¿Estás seguro de que deseas eliminar "${nombre}" de tu vitrina pública?`);
    if (!confirmar) return;
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) alert('Hubo un error al eliminar: ' + error.message);
    else await cargarProductos();
  };

  const abrirDetalle = (p: any) => {
    setFotoActualIndex(0);
    setProductoSeleccionado(p);
  };

  const enlaceUnico = `${window.location.origin}/catalogo/${miId}`;

  const compartirPorWhatsApp = () => {
    const mensaje = `¡Hola! Te invito a ver mi catálogo en línea aquí:\n\n👉 ${enlaceUnico}`;
    window.location.href = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  };

  const descargarQR = () => {
    const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
      let linkDescarga = document.createElement('a');
      linkDescarga.href = pngUrl;
      linkDescarga.download = `QR_${nombreLocal || 'Catalogo'}.png`;
      document.body.appendChild(linkDescarga);
      linkDescarga.click();
      document.body.removeChild(linkDescarga);
    }
  };

  return (
    <>
      {/* VISTA PARA IMPRESIÓN */}
      <div className="hidden print:block p-6 bg-white text-stone-900 w-full">
        <div className="text-center border-b-2 border-amber-900 pb-4 mb-6">
          <h1 className="text-3xl font-serif italic font-bold text-amber-950">{nombreLocal || 'Mi Taller'}</h1>
          <p className="text-sm uppercase tracking-widest text-stone-500 mt-1">Catálogo de Temporada</p>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {misProductos.map(p => (
            <div key={p.id} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }} className="border border-stone-200 rounded-xl overflow-hidden">
              <div className="h-40 bg-stone-100">
                {p.foto_url ? <img src={p.foto_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>}
              </div>
              <div className="p-4 text-center">
                <h3 className="text-sm font-bold text-stone-800 leading-tight">{p.nombre}</h3>
                {p.categoria && <p className="text-xs text-amber-700 mt-1">{p.categoria}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* VISTA EN PANTALLA */}
      <div className="space-y-6 fade-in print:hidden">
        <h2 className="text-2xl font-bold text-stone-800">Vitrina de Productos</h2>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button onClick={compartirPorWhatsApp} disabled={!miId} className="flex-1 bg-[#25D366] text-white py-3 rounded-xl font-bold text-sm shadow-sm flex justify-center items-center gap-2 hover:bg-green-600 transition-colors">
              <span className="text-xl">💬</span> WhatsApp
            </button>
            <button onClick={() => setModalQR(true)} disabled={!miId} className="flex-1 bg-stone-800 text-white py-3 rounded-xl font-bold text-sm shadow-sm flex justify-center items-center gap-2 hover:bg-stone-700 transition-colors">
              <span className="text-xl">📱</span> Código QR
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.open(enlaceUnico, '_blank')} className="flex-1 bg-white text-stone-700 border border-stone-200 py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 hover:bg-stone-50 transition-colors">
              <span className="text-lg">👁️</span> Ver en vivo
            </button>
            <button onClick={() => window.print()} disabled={misProductos.length === 0} className="flex-1 bg-white text-stone-700 border border-stone-200 py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 hover:bg-stone-50 transition-colors">
              <span className="text-lg">📄</span> Bajar PDF
            </button>
          </div>
        </div>

        <button
          onClick={() => { setProductoAEditar(null); setProdNombre(''); setProdDesc(''); setProdPrecio(''); setProdStock('1'); setProdCategoria(''); setProdArchivo(null); setProdArchivo2(null); setModalProducto(true); }}
          className="w-full bg-amber-600 text-white p-4 rounded-xl font-bold shadow-md flex justify-center items-center gap-2 hover:bg-amber-700 transition-colors"
        >
          <span className="text-xl leading-none">+</span> Nuevo Producto
        </button>

        {/* FILTROS POR CATEGORÍA */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltroCategoria('Todos')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${filtroCategoria === 'Todos' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
          >
            Todos ({misProductos.length})
          </button>
          {CATEGORIAS.map(cat => (
            <button
              key={cat}
              onClick={() => setFiltroCategoria(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${filtroCategoria === cat ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            >
              {cat} ({misProductos.filter(p => p.categoria === cat).length})
            </button>
          ))}
        </div>

        <div className="grid gap-3 pb-10">
          {productosFiltrados.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-4 bg-white rounded-xl border border-dashed border-stone-300">
              {misProductos.length === 0 ? 'Aún no tienes productos en la vitrina.' : 'No hay productos en esta categoría.'}
            </p>
          ) : (
            productosFiltrados.map(p => (
              <div key={p.id} className="bg-white p-3 rounded-xl shadow-sm border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center gap-4">

                <div
                  onClick={() => abrirDetalle(p)}
                  className="flex items-center gap-4 w-full sm:w-auto flex-1 cursor-pointer group hover:bg-stone-50 p-1 -m-1 rounded-lg transition-colors"
                  title="Ver vista previa de la vitrina"
                >
                  <div className="w-16 h-16 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-100 flex items-center justify-center relative">
                    {p.foto_url ? <img src={p.foto_url} className="w-full h-full object-cover" /> : <span className="text-2xl text-stone-300">📦</span>}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-stone-800 leading-tight group-hover:text-amber-700 transition-colors">{p.nombre}</h3>
                    {p.categoria && (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full mt-1">
                        {p.categoria}
                      </span>
                    )}
                    <p className="text-amber-700 font-bold text-sm mt-1">${p.precio.toLocaleString('es-CL')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 mt-1 sm:mt-0 border-stone-100">
                  <button onClick={(e) => abrirParaEditar(p, e)} className="px-4 py-2 bg-stone-100 rounded-lg text-stone-600 font-bold text-sm hover:bg-stone-200 transition-colors">
                    Editar
                  </button>
                  <button onClick={(e) => eliminarProducto(p.id, p.nombre, e)} className="px-4 py-2 bg-red-50 text-red-500 rounded-lg font-bold text-sm hover:bg-red-100 transition-colors">
                    Borrar
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

        {/* MODAL QR */}
        {modalQR && (
          <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
            <div className="bg-white w-full max-w-sm p-8 rounded-3xl slide-up text-center shadow-2xl relative">
              <button onClick={() => setModalQR(false)} className="absolute top-4 right-4 text-stone-400 font-bold text-2xl hover:text-red-500">✕</button>
              <h3 className="text-2xl font-bold text-stone-800 mb-2">Tu Código QR</h3>
              <p className="text-stone-500 text-sm mb-6 leading-tight">Imprime esta imagen y ponla en el mesón del local para que los clientes escaneen tu vitrina.</p>
              <div className="bg-white p-4 rounded-2xl inline-block border-2 border-dashed border-stone-300 shadow-sm mb-6">
                <QRCodeCanvas id="qr-canvas" value={enlaceUnico} size={200} level={"H"} fgColor={"#1c1917"} includeMargin={true} />
              </div>
              <button onClick={descargarQR} className="w-full bg-stone-800 text-white p-4 rounded-2xl font-bold shadow-md flex justify-center items-center gap-3 hover:bg-stone-900 transition-transform active:scale-95">
                <span className="text-xl">🖨️</span> Descargar Imagen QR
              </button>
            </div>
          </div>
        )}

        {/* MODAL NUEVO/EDITAR PRODUCTO */}
        {modalProducto && (
          <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-end sm:items-center p-0 sm:p-4">
            <div className="bg-white w-full max-w-md p-6 rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto slide-up">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-amber-900">{productoAEditar ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                <button onClick={() => setModalProducto(false)} className="text-stone-400 font-bold text-xl hover:text-red-500">✕</button>
              </div>
              <form onSubmit={guardarProducto} className="space-y-4">

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Foto Principal</label>
                    <input type="file" accept="image/*" onChange={e => setProdArchivo(e.target.files ? e.target.files[0] : null)} className="w-full text-[10px] text-stone-500 file:mr-2 file:py-1 file:px-2 file:rounded-xl file:border-0 file:bg-amber-50 file:text-amber-700 file:font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Foto Detalle (2)</label>
                    <input type="file" accept="image/*" onChange={e => setProdArchivo2(e.target.files ? e.target.files[0] : null)} className="w-full text-[10px] text-stone-500 file:mr-2 file:py-1 file:px-2 file:rounded-xl file:border-0 file:bg-stone-100 file:text-stone-700 file:font-bold" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1">Nombre</label>
                  <input type="text" required value={prodNombre} onChange={e => setProdNombre(e.target.value)} className="w-full p-3 border border-stone-300 rounded-lg" />
                </div>

                {/* SELECTOR DE CATEGORÍA */}
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1">Categoría</label>
                  <select
                    value={prodCategoria}
                    onChange={e => setProdCategoria(e.target.value)}
                    className="w-full p-3 border border-stone-300 rounded-lg bg-white text-stone-800"
                  >
                    <option value="">Sin categoría</option>
                    {CATEGORIAS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">Precio ($)</label>
                    <input type="number" required value={prodPrecio} onChange={e => setProdPrecio(e.target.value)} className="w-full p-3 border border-stone-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">Stock</label>
                    <input type="number" required value={prodStock} onChange={e => setProdStock(e.target.value)} className="w-full p-3 border border-stone-300 rounded-lg" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1">Descripción</label>
                  <textarea value={prodDesc} onChange={e => setProdDesc(e.target.value)} className="w-full p-3 border border-stone-300 rounded-lg h-20" />
                </div>

                <button type="submit" disabled={guardandoProd} className="w-full bg-amber-600 text-white py-3.5 rounded-xl font-bold shadow-md">
                  {guardandoProd ? 'Guardando...' : (productoAEditar ? '✓ Guardar Cambios' : 'Publicar')}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL VISTA PREVIA */}
        {productoSeleccionado && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center p-0 sm:p-6 animate-in fade-in transition-all duration-300">
            <div className="bg-[#FDFCF8] w-full max-w-4xl sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col sm:flex-row relative slide-up">

              <button onClick={() => setProductoSeleccionado(null)} className="absolute top-4 right-4 z-40 bg-white/50 hover:bg-white text-stone-900 w-10 h-10 rounded-full font-bold flex items-center justify-center transition-colors shadow-sm">✕</button>

              <div className="w-full sm:w-1/2 bg-stone-100 flex items-center justify-center overflow-hidden aspect-square sm:aspect-auto relative group">
                {(() => {
                  const fotos = [productoSeleccionado.foto_url, productoSeleccionado.foto_url_2].filter(Boolean);
                  if (fotos.length === 0) return <span className="text-7xl text-stone-300">📦</span>;
                  return (
                    <>
                      <img src={fotos[fotoActualIndex]} className="w-full h-full object-cover transition-opacity duration-300" alt="Producto" />
                      {fotos.length > 1 && (
                        <>
                          <button onClick={() => setFotoActualIndex(prev => prev === 0 ? fotos.length - 1 : prev - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-stone-900 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all z-10">
                            <span className="text-2xl font-bold leading-none mb-1">‹</span>
                          </button>
                          <button onClick={() => setFotoActualIndex(prev => prev === fotos.length - 1 ? 0 : prev + 1)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-stone-900 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all z-10">
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
                <button onClick={() => alert('¡Así lo verá tu cliente! Al tocar aquí se abrirá WhatsApp.')} className="w-full mt-4 bg-[#25D366] text-white py-3.5 rounded-xl font-bold shadow-md flex justify-center items-center gap-2 shrink-0 cursor-default opacity-90">
                  <span className="text-xl">💬</span> Consultar Precio y Stock
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </>
  );
}
