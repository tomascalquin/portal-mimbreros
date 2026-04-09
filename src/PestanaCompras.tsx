import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function PestanaCompras({ miId }: any) {
  const [subPestanaCompras, setSubPestanaCompras] = useState('pedido');
  const [artesanos, setArtesanos] = useState<any[]>([]);
  const [articulosMaestro, setArticulosMaestro] = useState<any[]>([]);
  const [artesanoSeleccionadoRut, setArtesanoSeleccionadoRut] = useState<string>('');
  const [carrito, setCarrito] = useState<{ [key: string]: number }>({});
  
  const [ordenProductos, setOrdenProductos] = useState('alfabetico_asc');
  // --- NUEVO ESTADO PARA EL BUSCADOR ---
  const [terminoBusqueda, setTerminoBusqueda] = useState(''); 
  
  const [historialCompras, setHistorialCompras] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);

  const [modalEnvio, setModalEnvio] = useState(false);
  const [datosEnvio, setDatosEnvio] = useState<{texto: string, telefono: string, correo: string, nombre: string} | null>(null);

  const [modalGestor, setModalGestor] = useState(false);
  const [mostrandoFormularioGestor, setMostrandoFormularioGestor] = useState(false);
  const [artEditandoId, setArtEditandoId] = useState<string | null>(null);
  
  const [formArtNombre, setFormArtNombre] = useState('');
  const [formArtCosto, setFormArtCosto] = useState('');
  const [formArtDesc, setFormArtDesc] = useState('');
  const [formArtStock, setFormArtStock] = useState('1');
  const [formArtCategoriaId, setFormArtCategoriaId] = useState('');
  
  const [formArtArchivo, setFormArtArchivo] = useState<File | null>(null);
  const [formArtArchivo2, setFormArtArchivo2] = useState<File | null>(null);
  const [prevFoto1, setPrevFoto1] = useState<string | null>(null);
  const [prevFoto2, setPrevFoto2] = useState<string | null>(null);
  const [procesandoArt, setProcesandoArt] = useState(false);

  const [modalArtesano, setModalArtesano] = useState(false);
  const [formProvRut, setFormProvRut] = useState('');
  const [formProvNombre, setFormProvNombre] = useState('');
  const [formProvDir, setFormProvDir] = useState('');
  const [formProvTel, setFormProvTel] = useState('');
  const [formProvCorreo, setFormProvCorreo] = useState('');
  const [formProvPago, setFormProvPago] = useState('Efectivo');
  const [guardandoProv, setGuardandoProv] = useState(false);

  useEffect(() => {
    if (miId) {
      cargarDatos();
      cargarCategorias();
    }
  }, [miId]);

  async function cargarCategorias() {
    const { data } = await supabase.from('categorias').select('*').eq('tienda_id', miId).order('nombre');
    if (data) setCategorias(data);
  }

  async function cargarDatos() {
    const { data: listaArtesanos } = await supabase.from('artesanos').select('*').eq('tienda_id', miId);
    if (listaArtesanos) setArtesanos(listaArtesanos);

    const { data: listaArticulos } = await supabase.from('articulos_maestro').select('*').eq('tienda_id', miId);
    if (listaArticulos) setArticulosMaestro(listaArticulos);

    const { data: comprasMercaderia } = await supabase.from('registro_compras')
      .select('*')
      .eq('tienda_id', miId)
      .order('fecha', { ascending: false });
      
    if (comprasMercaderia) setHistorialCompras(comprasMercaderia);
  }

  const artesanoActual = artesanos.find(a => String(a.rut) === String(artesanoSeleccionadoRut));
  
  // 1. Primero separamos TODOS los artículos del artesano seleccionado
  const articulosDelArtesano = articulosMaestro.filter(a => String(a.rut_artesano) === String(artesanoSeleccionadoRut));

  // 2. Luego aplicamos el filtro de búsqueda y el orden
  const articulosFiltrados = articulosDelArtesano
    .filter(a => a.nombre.toLowerCase().includes(terminoBusqueda.toLowerCase()))
    .sort((a, b) => {
      if (ordenProductos === 'alfabetico_asc') return a.nombre.localeCompare(b.nombre);
      if (ordenProductos === 'alfabetico_desc') return b.nombre.localeCompare(a.nombre);
      if (ordenProductos === 'precio_asc') return a.precio_costo - b.precio_costo;
      if (ordenProductos === 'precio_desc') return b.precio_costo - a.precio_costo;
      return 0;
    });

  const montoTotalCompra = articulosFiltrados.reduce((total, art) => total + ((carrito[art.id] || 0) * art.precio_costo), 0);

  const cambiarCantidad = (articuloId: string, cantidad: number) => {
    setCarrito((prev: any) => ({ ...prev, [articuloId]: Math.max(0, (prev[articuloId] || 0) + cantidad) }));
  };

  const procesarPedido = async () => {
    if (montoTotalCompra === 0) return alert("Debes seleccionar al menos un producto.");
    if (!artesanoActual) return;
    
    const confirmar = window.confirm(`¿Estás seguro de registrar este pedido a ${artesanoActual.nombre} por un total de $${montoTotalCompra.toLocaleString('es-CL')}?`);
    if (!confirmar) return; 

    const items = articulosFiltrados.filter(a => (carrito[a.id] || 0) > 0);
    
    for (const item of items) {
      await supabase.from('registro_compras').insert({
        rut_artesano: artesanoSeleccionadoRut, 
        articulo_id: item.id, 
        nombre_articulo: item.nombre,
        precio_costo: item.precio_costo, 
        cantidad: carrito[item.id], 
        total: item.precio_costo * carrito[item.id], 
        tienda_id: miId
      });
    }

    let mensajeTexto = `¡Hola ${artesanoActual.nombre}! Te escribo para hacerte un nuevo pedido para el local:\n\n`;
    items.forEach(item => {
      mensajeTexto += `▪ ${carrito[item.id]} unidades de ${item.nombre} ($${item.precio_costo.toLocaleString('es-CL')} c/u)\n`;
    });
    mensajeTexto += `\n*TOTAL DEL PEDIDO: $${montoTotalCompra.toLocaleString('es-CL')}*\n\nPor favor confírmame cuando puedas. ¡Saludos!`;

    setDatosEnvio({
      texto: mensajeTexto,
      telefono: artesanoActual.telefono ? String(artesanoActual.telefono).replace(/[^\d+]/g, '') : '',
      correo: artesanoActual.correo || '',
      nombre: artesanoActual.nombre
    });
    
    await cargarDatos();
    setModalEnvio(true);
  };

  const cerrarYLimpiar = () => {
    setModalEnvio(false);
    setCarrito({});
    setArtesanoSeleccionadoRut('');
    setSubPestanaCompras('historial');
  };

  const guardarArtesanoManual = async (e: any) => {
    e.preventDefault();
    setGuardandoProv(true);

    const nuevoArtesano = {
      rut: formProvRut,
      nombre: formProvNombre,
      direccion: formProvDir,
      telefono: formProvTel,
      correo: formProvCorreo,
      medio_pago: formProvPago,
      tienda_id: miId
    };

    const { error } = await supabase.from('artesanos').insert(nuevoArtesano);

    if (error) {
      alert("Hubo un error al guardar al proveedor: " + error.message);
    } else {
      await cargarDatos(); 
      setArtesanoSeleccionadoRut(formProvRut); 
      setModalArtesano(false); 
      setFormProvRut(''); setFormProvNombre(''); setFormProvDir(''); 
      setFormProvTel(''); setFormProvCorreo(''); setFormProvPago('Efectivo');
    }
    setGuardandoProv(false);
  };

  const abrirGestorParaNuevoDirecto = () => {
    if (!artesanoSeleccionadoRut) {
      alert("Por favor, primero selecciona un artesano en la lista de arriba.");
      return;
    }
    limpiarFormGestor();
    setMostrandoFormularioGestor(true);
    setModalGestor(true);
  };

  const limpiarFormGestor = () => {
    setArtEditandoId(null);
    setFormArtNombre('');
    setFormArtCosto('');
    setFormArtDesc('');
    setFormArtStock('1');
    setFormArtCategoriaId(''); 
    setFormArtArchivo(null);
    setFormArtArchivo2(null);
    setPrevFoto1(null);
    setPrevFoto2(null);
  };

  const cargarParaEditar = (art: any) => {
    setArtEditandoId(art.id);
    setFormArtNombre(art.nombre);
    setFormArtCosto(art.precio_costo.toString());
    setFormArtDesc(art.descripcion || '');
    setFormArtStock(art.stock ? art.stock.toString() : '1');
    setFormArtCategoriaId(art.categoria_id || ''); 
    setFormArtArchivo(null); 
    setFormArtArchivo2(null);
    setPrevFoto1(art.foto_url || null);
    setPrevFoto2(art.foto_url_2 || null);
    setMostrandoFormularioGestor(true);
  };

  const guardarArticulo = async (e: any) => {
    e.preventDefault();
    setProcesandoArt(true);
    
    const artActual = artEditandoId ? articulosMaestro.find(a => a.id === artEditandoId) : null;

    // Foto 1
    let fotoUrl: string | null = artActual?.foto_url || null;
    if (formArtArchivo) {
      const nombreArchivo = `${miId}/artesanos/${Math.random()}-${formArtArchivo.name}`;
      const { error: uploadError } = await supabase.storage.from('fotos_muebles').upload(nombreArchivo, formArtArchivo);
      if (!uploadError) {
        const { data } = supabase.storage.from('fotos_muebles').getPublicUrl(nombreArchivo);
        fotoUrl = data.publicUrl;
      }
    }

    // Foto 2
    let fotoUrl2: string | null = artActual?.foto_url_2 || null;
    if (formArtArchivo2) {
      const nombreArchivo2 = `${miId}/artesanos/${Math.random()}-${formArtArchivo2.name}`;
      const { error: uploadError2 } = await supabase.storage.from('fotos_muebles').upload(nombreArchivo2, formArtArchivo2);
      if (!uploadError2) {
        const { data } = supabase.storage.from('fotos_muebles').getPublicUrl(nombreArchivo2);
        fotoUrl2 = data.publicUrl;
      }
    }

    const datos: any = {
      tienda_id: miId,
      rut_artesano: artesanoSeleccionadoRut,
      nombre: formArtNombre,
      precio_costo: parseFloat(formArtCosto) || 0,
      descripcion: formArtDesc,
      stock: parseInt(formArtStock) || 1,
      precio_venta: 0,
      categoria_id: formArtCategoriaId || null,
      // barcode/qr_code: null  ← preparado para escaneo futuro
    };

    if (fotoUrl !== null) datos.foto_url = fotoUrl;
    if (fotoUrl2 !== null) datos.foto_url_2 = fotoUrl2;

    if (artEditandoId) {
      await supabase.from('articulos_maestro').update(datos).eq('id', artEditandoId);
    } else {
      const idGenerado = `${artesanoSeleccionadoRut}-${formArtNombre.replace(/\s+/g, '').toLowerCase()}-${Math.floor(Math.random() * 1000)}`;
      await supabase.from('articulos_maestro').insert({ ...datos, id: idGenerado });
    }

    await cargarDatos();
    limpiarFormGestor();
    setMostrandoFormularioGestor(false);
    setProcesandoArt(false);
  };

  const eliminarArticulo = async (id: string, nombre: string) => {
    const confirmar = window.confirm(`¿Seguro que deseas eliminar "${nombre}" del catálogo de este artesano?`);
    if (!confirmar) return;
    
    setProcesandoArt(true);
    await supabase.from('articulos_maestro').delete().eq('id', id);
    await cargarDatos();
    setProcesandoArt(false);
  };

  const traspasarACatalogo = async (art: any) => {
    const precioVentaInput = window.prompt(`Vamos a traspasar "${art.nombre}" a tu vitrina pública.\n\nEste producto te cuesta $${art.precio_costo.toLocaleString('es-CL')}.\n¿A qué precio de VENTA al público lo quieres publicar?`, art.precio_costo.toString());
    
    if (precioVentaInput === null || precioVentaInput === "") return;
    
    const precioVenta = parseFloat(precioVentaInput);
    if (isNaN(precioVenta)) return alert("Por favor ingresa un número válido.");

    setProcesandoArt(true);
    
    const datosPublicos: any = {
      tienda_id: miId,
      nombre: art.nombre,
      descripcion: art.descripcion || '',
      precio: precioVenta,
      stock: art.stock || 1,
      categoria_id: art.categoria_id || null 
    };

    // Copiar ambas fotos si existen — evita corrupción al clonar
    if (art.foto_url) datosPublicos.foto_url = art.foto_url;
    if (art.foto_url_2) datosPublicos.foto_url_2 = art.foto_url_2;

    const { error } = await supabase.from('productos').insert(datosPublicos);
    
    setProcesandoArt(false);

    if (error) {
      alert("Hubo un error al traspasar el producto: " + error.message);
    } else {
      alert("¡Clonación exitosa! 🌟 El producto ya está publicado en tu vitrina pública.");
    }
  };

  return (
    <div className="fade-in space-y-4">
      
      <div className="flex bg-stone-200 p-1.5 rounded-xl">
        <button 
          onClick={() => setSubPestanaCompras('pedido')} 
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${subPestanaCompras === 'pedido' ? 'bg-white shadow text-stone-900' : 'text-stone-500'}`}
        >
          Hacer Pedido
        </button>
        <button 
          onClick={() => setSubPestanaCompras('historial')} 
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${subPestanaCompras === 'historial' ? 'bg-white shadow text-stone-900' : 'text-stone-500'}`}
        >
          Historial Compras
        </button>
      </div>

      {subPestanaCompras === 'pedido' && (
        <div className="space-y-4 pt-2 pb-24">
          
          <div className="flex gap-2 relative">
            <div className="relative flex-1">
              <select 
                value={artesanoSeleccionadoRut} 
                onChange={(e) => { 
                  setArtesanoSeleccionadoRut(e.target.value); 
                  setCarrito({}); 
                  setTerminoBusqueda(''); // Limpiamos la búsqueda al cambiar de artesano
                }} 
                className="w-full bg-[#4A4440] text-white p-4 py-5 rounded-2xl font-bold text-lg shadow-sm appearance-none focus:outline-none"
              >
                <option value="">ARTESANO (Seleccionar)</option>
                {artesanos.map(a => <option key={a.rut} value={a.rut}>{a.nombre}</option>)}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-white pointer-events-none">▼</div>
            </div>
            
            <button 
              onClick={() => setModalArtesano(true)} 
              className="bg-amber-600 hover:bg-amber-700 text-white w-16 rounded-2xl flex items-center justify-center shadow-sm transition-colors" 
              title="Nuevo Proveedor"
            >
              <span className="text-3xl leading-none mb-1">+</span>
            </button>
          </div>

          {artesanoActual ? (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200 relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-700"></div>
              <div className="flex-1 pl-2">
                <h3 className="font-bold text-stone-800 text-lg mb-2">{artesanoActual.nombre}</h3>
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center gap-2 text-stone-500">
                    <span className="text-sm">📍</span> {artesanoActual.direccion || 'Sin dirección'}
                  </div>
                  <div className="flex items-center gap-2 text-stone-500 font-bold uppercase tracking-wider mt-1">
                    <span className="text-sm">💳</span> Pago: <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md ml-1">{artesanoActual.medio_pago || 'Efectivo'}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => { limpiarFormGestor(); setMostrandoFormularioGestor(false); setModalGestor(true); }} 
                className="bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-sm w-full sm:w-auto justify-center"
              >
                <span>⚙️</span> Ver Catálogo Completo
              </button>
            </div>
          ) : (
            <div className="border border-stone-200 border-dashed rounded-2xl p-4 text-center bg-stone-50/50">
               <p className="font-bold text-xs text-stone-400 uppercase tracking-widest">Ningún proveedor seleccionado</p>
            </div>
          )}

          {/* --- BARRA DE BÚSQUEDA Y ORDEN (Solo aparece si el artesano tiene productos) --- */}
          {artesanoSeleccionadoRut && articulosDelArtesano.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 mb-2 gap-2">
              
              {/* Buscador */}
              <div className="relative w-full sm:w-auto flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">🔍</span>
                <input 
                  type="text" 
                  placeholder="Buscar producto..." 
                  value={terminoBusqueda}
                  onChange={(e) => setTerminoBusqueda(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-stone-200 rounded-xl text-sm font-bold text-stone-600 bg-white shadow-sm focus:border-amber-500 outline-none"
                />
              </div>

              {/* Ordenar */}
              <select 
                value={ordenProductos} 
                onChange={(e) => setOrdenProductos(e.target.value)} 
                className="w-full sm:w-auto p-2.5 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 bg-white shadow-sm focus:border-amber-500 outline-none cursor-pointer"
              >
                <option value="alfabetico_asc">Ordenar: Nombre (A - Z)</option>
                <option value="alfabetico_desc">Ordenar: Nombre (Z - A)</option>
                <option value="precio_asc">Ordenar: Costo (Menor a Mayor)</option>
                <option value="precio_desc">Ordenar: Costo (Mayor a Menor)</option>
              </select>
            </div>
          )}

          <div className="space-y-3 mt-2">
            {artesanoSeleccionadoRut ? (
              articulosDelArtesano.length > 0 ? (
                articulosFiltrados.length > 0 ? (
                  articulosFiltrados.map(art => {
                    const categoriaObj = categorias.find(c => c.id === art.categoria_id);
                    return (
                      <div key={art.id} className="bg-white rounded-2xl p-3 shadow-sm border border-stone-200 flex items-center gap-4 hover:border-amber-300 transition-colors">
                        <div className="w-16 h-16 bg-stone-50 rounded-xl flex items-center justify-center shrink-0 border border-stone-100 overflow-hidden">
                          {art.foto_url ? <img src={art.foto_url} className="w-full h-full object-cover" /> : <span className="text-2xl text-stone-300">📦</span>}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-stone-800 text-sm leading-tight">{art.nombre}</h3>
                          {categoriaObj && (
                            <span className="inline-block bg-stone-100 text-stone-500 text-[9px] px-1.5 py-0.5 rounded mt-0.5 font-semibold uppercase tracking-wider">
                              {categoriaObj.nombre}
                            </span>
                          )}
                          <p className="text-[#C26B29] font-black mt-1">${art.precio_costo.toLocaleString('es-CL')}</p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center bg-stone-100 rounded-full p-1 border border-stone-200">
                            <button onClick={() => cambiarCantidad(art.id, -1)} className="w-6 h-6 flex items-center justify-center font-bold text-stone-500">-</button>
                            <span className="w-6 text-center font-bold text-xs">{carrito[art.id] || 0}</span>
                            <button onClick={() => cambiarCantidad(art.id, 1)} className="w-6 h-6 flex items-center justify-center font-bold text-stone-500">+</button>
                          </div>
                          <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">Cant</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center py-8 text-stone-500 font-bold text-sm bg-stone-50 rounded-2xl border border-dashed border-stone-300">
                    No se encontró ningún producto que coincida con "{terminoBusqueda}".
                  </p>
                )
              ) : (
                <p className="text-center py-8 text-stone-400 text-sm bg-white rounded-2xl border border-dashed border-stone-300">
                  Este artesano no tiene productos registrados.
                </p>
              )
            ) : null}
          </div>

          <div className="fixed bottom-20 left-0 w-full px-4 z-30">
            <div className="max-w-lg mx-auto flex items-stretch gap-2 bg-stone-100 p-2 rounded-2xl border border-stone-300 shadow-xl">
              <button 
                onClick={abrirGestorParaNuevoDirecto} 
                className="bg-[#D97706] text-white px-3 sm:px-4 rounded-xl font-bold text-[11px] sm:text-xs leading-tight shadow flex items-center text-center justify-center hover:bg-amber-700 transition-colors"
              >
                + Nuevo<br/>Producto
              </button>
              <div className="flex-1 bg-white border border-stone-200 rounded-xl p-2 flex items-center px-3 shadow-inner">
                <span className="text-stone-500 font-bold text-[10px] uppercase tracking-widest leading-none">Monto<br/>Compra</span>
                <span className="font-black text-xl ml-auto text-stone-800">${montoTotalCompra.toLocaleString('es-CL')}</span>
              </div>
              <button 
                onClick={procesarPedido} 
                className="bg-white border-2 border-stone-300 px-4 rounded-xl font-bold text-xs leading-tight shadow flex items-center text-center text-stone-700 uppercase hover:bg-stone-50 transition-colors"
              >
                Envío<br/>Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {subPestanaCompras === 'historial' && (
        <div className="space-y-4 pt-2 pb-10">
          <div className="grid gap-3 mt-2">
            <h3 className="font-bold text-stone-500 text-sm uppercase mb-2">Registro de Compras</h3>
            {historialCompras.length === 0 ? (
              <p className="text-stone-400 text-sm text-center py-6 bg-white rounded-xl border border-dashed border-stone-300">Aún no hay pedidos registrados.</p>
            ) : (
              historialCompras.map((compra) => {
                const nombreArtesano = artesanos.find(a => String(a.rut) === String(compra.rut_artesano))?.nombre || 'Artesano Desconocido';
                return (
                  <div key={compra.id} className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col gap-1 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#8B3D08]"></div>
                    <div className="flex justify-between items-start pl-2">
                      <span className="font-bold text-stone-800 text-sm leading-tight pr-2">{nombreArtesano}</span>
                      <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-md text-sm">-${compra.total.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="flex justify-between items-end mt-1 pl-2">
                      <span className="text-stone-500 text-sm">{compra.cantidad}x {compra.nombre_articulo}</span>
                      <span className="text-stone-400 text-xs font-semibold">{new Date(compra.fecha).toLocaleDateString('es-CL')}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL CREAR ARTESANO */}
      {modalArtesano && (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-end sm:items-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto slide-up shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-stone-800">Crear Proveedor</h3>
              <button onClick={() => setModalArtesano(false)} className="text-stone-400 font-bold text-xl hover:text-red-500">✕</button>
            </div>
            <form onSubmit={guardarArtesanoManual} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">RUT</label>
                <input type="text" required value={formProvRut} onChange={(e) => setFormProvRut(e.target.value)} className="w-full border p-3 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Nombre</label>
                <input type="text" required value={formProvNombre} onChange={(e) => setFormProvNombre(e.target.value)} className="w-full border p-3 rounded-lg" />
              </div>
              <button 
                type="submit" 
                disabled={guardandoProv} 
                className="w-full bg-stone-800 text-white py-3.5 mt-2 rounded-xl font-bold text-sm hover:bg-stone-900 transition-colors"
              >
                {guardandoProv ? '⏳ Guardando...' : 'Guardar Proveedor'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ENVIAR PEDIDO */}
      {modalEnvio && datosEnvio && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-end sm:items-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md p-8 rounded-t-3xl sm:rounded-3xl text-center space-y-4 shadow-2xl slide-up">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 border-4 border-white shadow-sm">✅</div>
            <h3 className="text-3xl font-bold text-stone-800">¡Pedido Guardado!</h3>
            <p className="text-stone-500 text-sm">El pedido ya quedó registrado en tu historial.</p>
            <div className="space-y-3 pt-6">
              <button 
                onClick={() => { if(datosEnvio.telefono) window.open(`https://wa.me/${datosEnvio.telefono}?text=${encodeURIComponent(datosEnvio.texto)}`, '_blank'); cerrarYLimpiar(); }} 
                className="w-full bg-[#25D366] text-white p-4 rounded-2xl font-bold flex justify-center items-center gap-3"
              >
                WhatsApp
              </button>
              <button 
                onClick={cerrarYLimpiar} 
                className="w-full bg-stone-100 text-stone-500 p-4 rounded-2xl font-bold mt-4"
              >
                Solo guardar y salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANEL GESTOR DE CATÁLOGO DEL ARTESANO */}
      {modalGestor && artesanoActual && (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-end sm:items-center p-0 sm:p-4">
          <div className="bg-[#FDFCF8] w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl slide-up overflow-hidden">
            
            <div className="bg-stone-800 text-white p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { if (mostrandoFormularioGestor) { setMostrandoFormularioGestor(false); limpiarFormGestor(); } else { setModalGestor(false); } }} 
                  className="bg-stone-700 hover:bg-stone-600 w-8 h-8 rounded-full flex items-center justify-center font-bold"
                >
                  ←
                </button>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Catálogo de Proveedor</h3>
                  <p className="text-stone-400 text-xs mt-0.5">{artesanoActual.nombre}</p>
                </div>
              </div>
            </div>

            {mostrandoFormularioGestor ? (
              <div className="flex-1 overflow-y-auto p-6 bg-white animate-in fade-in">
                <h4 className="font-black text-stone-800 text-lg mb-4">{artEditandoId ? '✏️ Actualizar Producto' : '📦 Añadir Nuevo Producto'}</h4>

                <form onSubmit={guardarArticulo} className="space-y-4">
                  {/* ── DOBLE CARGA DE FOTOS ── */}
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Fotos del Producto (máx. 2)</label>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Foto 1 */}
                      <div className="flex flex-col gap-2">
                        <div className="w-full aspect-square rounded-xl overflow-hidden border-2 border-dashed border-stone-300 bg-stone-50 flex items-center justify-center relative">
                          {(formArtArchivo ? URL.createObjectURL(formArtArchivo) : prevFoto1) ? (
                            <>
                              <img
                                src={formArtArchivo ? URL.createObjectURL(formArtArchivo) : prevFoto1!}
                                className="w-full h-full object-cover"
                                alt="Foto 1"
                              />
                              <button
                                type="button"
                                onClick={() => { setFormArtArchivo(null); setPrevFoto1(null); }}
                                className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shadow"
                              >✕</button>
                            </>
                          ) : (
                            <span className="text-stone-300 text-3xl">📷</span>
                          )}
                        </div>
                        <label className="cursor-pointer bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg px-3 py-1.5 text-[11px] font-bold text-center transition-colors">
                          {prevFoto1 || formArtArchivo ? 'Cambiar foto 1' : '+ Foto principal'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0] || null;
                              setFormArtArchivo(file);
                              if (file) setPrevFoto1(null);
                            }}
                          />
                        </label>
                      </div>
                      {/* Foto 2 */}
                      <div className="flex flex-col gap-2">
                        <div className="w-full aspect-square rounded-xl overflow-hidden border-2 border-dashed border-stone-300 bg-stone-50 flex items-center justify-center relative">
                          {(formArtArchivo2 ? URL.createObjectURL(formArtArchivo2) : prevFoto2) ? (
                            <>
                              <img
                                src={formArtArchivo2 ? URL.createObjectURL(formArtArchivo2) : prevFoto2!}
                                className="w-full h-full object-cover"
                                alt="Foto 2"
                              />
                              <button
                                type="button"
                                onClick={() => { setFormArtArchivo2(null); setPrevFoto2(null); }}
                                className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shadow"
                              >✕</button>
                            </>
                          ) : (
                            <span className="text-stone-300 text-3xl">📷</span>
                          )}
                        </div>
                        <label className="cursor-pointer bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200 rounded-lg px-3 py-1.5 text-[11px] font-bold text-center transition-colors">
                          {prevFoto2 || formArtArchivo2 ? 'Cambiar foto 2' : '+ Foto detalle'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0] || null;
                              setFormArtArchivo2(file);
                              if (file) setPrevFoto2(null);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Nombre del Producto</label>
                    <input 
                      type="text" 
                      required 
                      value={formArtNombre} 
                      onChange={(e) => setFormArtNombre(e.target.value)} 
                      className="w-full bg-stone-50 border border-stone-300 p-3.5 rounded-xl font-bold focus:outline-none focus:border-amber-600" 
                    />
                  </div>
                  
                  {/* SELECTOR RELACIONAL DE CATEGORÍA EN PROVEEDORES */}
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Categoría</label>
                    <select 
                      value={formArtCategoriaId} 
                      onChange={(e) => setFormArtCategoriaId(e.target.value)} 
                      className="w-full bg-stone-50 border border-stone-300 p-3.5 rounded-xl font-bold text-stone-700 focus:outline-none focus:border-amber-600"
                    >
                      <option value="">(Sin categoría)</option>
                      {categorias.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Costo ($)</label>
                      <input 
                        type="number" 
                        required 
                        value={formArtCosto} 
                        onChange={(e) => setFormArtCosto(e.target.value)} 
                        className="w-full bg-stone-50 border p-3.5 rounded-xl font-bold text-amber-800 focus:outline-none focus:border-amber-600" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Stock</label>
                      <input 
                        type="number" 
                        required 
                        value={formArtStock} 
                        onChange={(e) => setFormArtStock(e.target.value)} 
                        className="w-full bg-stone-50 border p-3.5 rounded-xl font-bold focus:outline-none focus:border-amber-600" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Descripción</label>
                    <textarea 
                      value={formArtDesc} 
                      onChange={(e) => setFormArtDesc(e.target.value)} 
                      className="w-full bg-stone-50 border p-3.5 rounded-xl h-24 focus:outline-none focus:border-amber-600" 
                    />
                  </div>
                  
                  <div className="pt-4 space-y-2">
                    <button 
                      type="submit" 
                      disabled={procesandoArt} 
                      className="w-full bg-amber-700 text-white py-4 rounded-xl font-bold shadow-sm hover:bg-amber-800"
                    >
                      {procesandoArt ? '⏳ Guardando...' : (artEditandoId ? '✔ Guardar Cambios' : '+ Agregar a la Lista')}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setMostrandoFormularioGestor(false); limpiarFormGestor(); }} 
                      className="w-full bg-stone-100 text-stone-600 py-4 rounded-xl font-bold hover:bg-stone-200"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#FDFCF8] animate-in fade-in">
                {articulosFiltrados.length === 0 ? (
                   <div className="text-center py-10">
                     <span className="text-4xl block mb-2">📋</span>
                     <p className="text-stone-400 font-bold text-sm">No se encontraron productos.</p>
                   </div>
                ) : (
                  articulosFiltrados.map(art => {
                    const categoriaObj = categorias.find(c => c.id === art.categoria_id);
                    return (
                      <div key={art.id} className="bg-white border border-stone-200 p-3 rounded-xl shadow-sm flex items-center justify-between hover:border-amber-300">
                        <div className="w-12 h-12 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200 mr-3">
                          {art.foto_url ? <img src={art.foto_url} className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-stone-300">📦</span>}
                        </div>
                        <div className="flex-1 pr-2">
                          <p className="font-bold text-stone-800 text-sm leading-tight">{art.nombre}</p>
                          {categoriaObj && (
                            <span className="inline-block bg-stone-100 text-stone-500 text-[9px] px-1.5 py-0.5 rounded mt-0.5 font-semibold uppercase tracking-wider">
                              {categoriaObj.nombre}
                            </span>
                          )}
                          <p className="text-amber-700 font-black text-xs mt-0.5">${art.precio_costo.toLocaleString('es-CL')}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => traspasarACatalogo(art)} className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="Publicar en Vitrina">🏪</button>
                          <button onClick={() => cargarParaEditar(art)} className="w-8 h-8 flex items-center justify-center bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200" title="Editar">✏️</button>
                          <button onClick={() => eliminarArticulo(art.id, art.nombre)} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-100" title="Eliminar">🗑️</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
            
          </div>
        </div>
      )}

    </div>
  );
}