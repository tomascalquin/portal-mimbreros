import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import * as XLSX from 'xlsx';
import { useToast } from './hooks/useToast';
import { formatCLP } from './utils/fecha';

// ── Mini componente de confirmación inline (reemplaza window.confirm feo de iOS) ──
function ConfirmDelete({ nombre, onConfirm, onCancel }: { nombre: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl slide-up space-y-4">
        <div className="text-center">
          <span className="text-4xl block mb-3">⚠️</span>
          <p className="font-bold text-stone-800 text-base leading-snug">¿Eliminar <span className="text-red-600">"{nombre}"</span>?</p>
          <p className="text-stone-400 text-sm mt-1">Esta acción no se puede deshacer.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="py-3.5 bg-stone-100 text-stone-700 font-bold rounded-2xl text-sm active:scale-95 transition-all">
            Cancelar
          </button>
          <button onClick={onConfirm} className="py-3.5 bg-red-600 text-white font-bold rounded-2xl text-sm active:scale-95 transition-all">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sección de Gestión de Peajes (datos en Supabase, editables desde la app) ──
function SeccionPeajes() {
  const { toast } = useToast();
  const [peajes, setPeajes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<any | null>(null); // peaje en edición
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState<any | null>(null);

  // Formulario
  const [fNombre, setFNombre] = useState('');
  const [fRuta, setFRuta] = useState('');
  const [fTramoOrigen, setFTramoOrigen] = useState('');
  const [fTramoDestino, setFTramoDestino] = useState('');
  const [fOrden, setFOrden] = useState('');
  const [fLiviano, setFLiviano] = useState('');
  const [fCamion, setFCamion] = useState('');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase.from('peajes_chile').select('*').order('ruta').order('orden');
    if (data) setPeajes(data);
    setCargando(false);
  }

  function abrirEditar(p: any) {
    setEditando(p);
    setCreando(false);
    setFNombre(p.nombre);
    setFRuta(p.ruta);
    setFTramoOrigen(p.tramo_origen);
    setFTramoDestino(p.tramo_destino);
    setFOrden(String(p.orden));
    setFLiviano(String(p.tarifa_liviano));
    setFCamion(String(p.tarifa_camion ?? ''));
  }

  function abrirCrear() {
    setCreando(true);
    setEditando(null);
    setFNombre(''); setFRuta(''); setFTramoOrigen(''); setFTramoDestino('');
    setFOrden(''); setFLiviano(''); setFCamion('');
  }

  function cancelar() { setEditando(null); setCreando(false); }

  async function guardar() {
    if (!fNombre.trim() || !fRuta.trim() || !fTramoOrigen.trim() || !fTramoDestino.trim()) {
      toast('Completa nombre, ruta y tramos', 'error', '⚠️'); return;
    }
    const liviano = parseInt(fLiviano, 10);
    if (isNaN(liviano) || liviano <= 0) { toast('Ingresa tarifa liviano válida', 'error', '⚠️'); return; }
    setGuardando(true);
    const row = {
      nombre: fNombre.trim(),
      ruta: fRuta.trim(),
      tramo_origen: fTramoOrigen.trim(),
      tramo_destino: fTramoDestino.trim(),
      orden: parseInt(fOrden, 10) || 10,
      tarifa_liviano: liviano,
      tarifa_camion: fCamion ? parseInt(fCamion, 10) || null : null,
    };
    if (editando) {
      const { error } = await supabase.from('peajes_chile').update(row).eq('id', editando.id);
      if (error) { toast('Error al actualizar: ' + error.message, 'error', '❌'); }
      else { toast('Peaje actualizado ✅', 'exito'); }
    } else {
      const { error } = await supabase.from('peajes_chile').insert(row);
      if (error) { toast('Error al crear: ' + error.message, 'error', '❌'); }
      else { toast('Peaje creado ✅', 'exito'); }
    }
    setGuardando(false);
    cancelar();
    await cargar();
  }

  async function eliminar() {
    if (!confirmarEliminar) return;
    await supabase.from('peajes_chile').delete().eq('id', confirmarEliminar.id);
    setConfirmarEliminar(null);
    await cargar();
    toast('Peaje eliminado', 'info', '🗑️');
  }

  // Agrupar por ruta para mostrar ordenado
  const porRuta: Record<string, any[]> = {};
  peajes.forEach(p => {
    if (!porRuta[p.ruta]) porRuta[p.ruta] = [];
    porRuta[p.ruta].push(p);
  });

  const formularioAbierto = editando || creando;

  return (
    <>
      {confirmarEliminar && (
        <ConfirmDelete
          nombre={confirmarEliminar.nombre}
          onConfirm={eliminar}
          onCancel={() => setConfirmarEliminar(null)}
        />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛣️</span>
            <div>
              <h3 className="font-bold text-stone-700 text-sm">Peajes de Chile</h3>
              <p className="text-[10px] text-stone-400 mt-0.5">Tarifas usadas en el cotizador de fletes</p>
            </div>
          </div>
          {!formularioAbierto && (
            <button
              onClick={abrirCrear}
              className="text-amber-700 text-xs font-bold hover:text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl transition-all active:scale-95"
            >
              + Nuevo
            </button>
          )}
        </div>

        {/* Formulario crear/editar */}
        {formularioAbierto && (
          <div className="p-4 border-b border-stone-100 bg-amber-50 space-y-3">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
              {creando ? '➕ Nuevo peaje' : `✏️ Editando: ${editando.nombre}`}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-stone-400 mb-1">Nombre del peaje</label>
                <input value={fNombre} onChange={e => setFNombre(e.target.value)} placeholder="Ej: Angostura (Paine)"
                  className="w-full p-2.5 border border-stone-200 rounded-xl text-sm font-bold focus:outline-none focus:border-amber-500 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 mb-1">Ruta</label>
                <input value={fRuta} onChange={e => setFRuta(e.target.value)} placeholder="Ej: Ruta 5"
                  className="w-full p-2.5 border border-stone-200 rounded-xl text-sm font-bold focus:outline-none focus:border-amber-500 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 mb-1">Orden en ruta</label>
                <input type="number" value={fOrden} onChange={e => setFOrden(e.target.value)} placeholder="10, 20..."
                  className="w-full p-2.5 border border-stone-200 rounded-xl text-sm font-bold focus:outline-none focus:border-amber-500 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 mb-1">Tramo origen</label>
                <input value={fTramoOrigen} onChange={e => setFTramoOrigen(e.target.value)} placeholder="Ej: Santiago"
                  className="w-full p-2.5 border border-stone-200 rounded-xl text-sm font-bold focus:outline-none focus:border-amber-500 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 mb-1">Tramo destino</label>
                <input value={fTramoDestino} onChange={e => setFTramoDestino(e.target.value)} placeholder="Ej: Rancagua"
                  className="w-full p-2.5 border border-stone-200 rounded-xl text-sm font-bold focus:outline-none focus:border-amber-500 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 mb-1">Tarifa liviano ($)</label>
                <input type="number" value={fLiviano} onChange={e => setFLiviano(e.target.value)} placeholder="2900"
                  className="w-full p-2.5 border border-stone-200 rounded-xl text-sm font-bold focus:outline-none focus:border-amber-500 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 mb-1">Tarifa camión ($)</label>
                <input type="number" value={fCamion} onChange={e => setFCamion(e.target.value)} placeholder="6500"
                  className="w-full p-2.5 border border-stone-200 rounded-xl text-sm font-bold focus:outline-none focus:border-amber-500 bg-white" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={guardar} disabled={guardando}
                className="flex-1 bg-amber-700 text-white py-3 rounded-xl font-bold text-sm hover:bg-amber-800 active:scale-95 transition-all disabled:opacity-60">
                {guardando ? '⏳' : creando ? '✅ Crear peaje' : '✅ Guardar cambios'}
              </button>
              <button onClick={cancelar}
                className="bg-stone-200 text-stone-700 px-4 py-3 rounded-xl font-bold text-sm hover:bg-stone-300 active:scale-95 transition-all">
                ✕
              </button>
            </div>
            <p className="text-[9px] text-stone-400 leading-relaxed">
              💡 <strong>Tramo origen/destino:</strong> ciudad exacta donde comienza y termina este peaje en la ruta.
              El cotizador selecciona automáticamente los peajes intermedios entre origen y destino del flete.
            </p>
          </div>
        )}

        {/* Lista de peajes agrupados por ruta */}
        <div className="p-4 space-y-4">
          {cargando ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-stone-400 text-sm font-bold">Cargando peajes...</p>
            </div>
          ) : peajes.length === 0 ? (
            <div className="text-center py-8 bg-stone-50 rounded-xl border border-dashed border-stone-200">
              <span className="text-3xl block mb-2">🛣️</span>
              <p className="text-stone-500 font-black text-sm">No hay peajes cargados</p>
              <p className="text-stone-400 text-xs mt-1">Agrega el primero con el botón "＋ Nuevo"</p>
              <p className="text-amber-600 text-xs mt-3 font-bold">
                O ejecuta el SQL seed en Supabase:
              </p>
              <p className="text-stone-400 text-[10px] mt-0.5 font-mono">
                supabase/seed_peajes.sql
              </p>
            </div>
          ) : (
            Object.entries(porRuta).map(([ruta, lista]) => (
              <div key={ruta}>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
                  🛣 {ruta}
                </p>
                <div className="space-y-1.5">
                  {lista.sort((a, b) => a.orden - b.orden).map(p => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2.5 border border-stone-100 rounded-xl bg-stone-50 hover:border-amber-200 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-stone-700 text-sm truncate">{p.nombre}</p>
                        <p className="text-[10px] text-stone-400">
                          {p.tramo_origen} → {p.tramo_destino}
                        </p>
                      </div>
                      <div className="text-right mx-3 shrink-0">
                        <p className="text-xs font-black text-stone-800">{formatCLP(p.tarifa_liviano)}</p>
                        {p.tarifa_camion && (
                          <p className="text-[10px] text-stone-400">{formatCLP(p.tarifa_camion)} 🚚</p>
                        )}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => abrirEditar(p)}
                          className="w-8 h-8 flex items-center justify-center bg-white border border-stone-200 text-stone-500 rounded-lg hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 active:scale-95 transition-all text-sm">
                          ✏️
                        </button>
                        <button onClick={() => setConfirmarEliminar(p)}
                          className="w-8 h-8 flex items-center justify-center bg-white border border-stone-200 text-red-400 rounded-lg hover:bg-red-50 hover:border-red-300 active:scale-95 transition-all text-sm">
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}



export default function PestanaLocal({ miId, nombreLocal, setNombreLocal }: any) {
  const { toast } = useToast();
  const [telefono, setTelefono] = useState('');
  const [guardandoLocal, setGuardandoLocal] = useState(false);
  const [mensajeLocal, setMensajeLocal] = useState({ texto: '', tipo: '' });

  const [categorias, setCategorias] = useState<any[]>([]);
  const [nombreNuevaCategoria, setNombreNuevaCategoria] = useState('');
  const [categoriaAEditar, setCategoriaAEditar] = useState<any>(null);
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);
  const [confirmarEliminarCat, setConfirmarEliminarCat] = useState<any>(null);

  const [bancos, setBancos] = useState<any[]>([]);
  const [nombreNuevoBanco, setNombreNuevoBanco] = useState('');
  const [numeroCuentaBanco, setNumeroCuentaBanco] = useState('');
  const [titularBanco, setTitularBanco] = useState('');
  const [bancoAEditar, setBancoAEditar] = useState<any>(null);
  const [guardandoBanco, setGuardandoBanco] = useState(false);
  const [confirmarEliminarBanco, setConfirmarEliminarBanco] = useState<any>(null);

  const [cargandoExcel, setCargandoExcel] = useState(false);
  const [mensajeExcel, setMensajeExcel] = useState({ texto: '', tipo: '' });
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    if (miId) { cargarTelefono(); cargarCategorias(); cargarBancos(); }
  }, [miId]);

  async function cargarTelefono() {
    const { data } = await supabase.from('tiendas').select('telefono').eq('id', miId).single();
    if (data) setTelefono(data.telefono || '');
  }

  async function cargarCategorias() {
    const { data } = await supabase.from('categorias').select('*').eq('tienda_id', miId).order('nombre');
    if (data) setCategorias(data);
  }

  const guardarCategoria = async (e: any) => {
    e.preventDefault();
    if (!nombreNuevaCategoria.trim()) return;
    setGuardandoCategoria(true);
    if (categoriaAEditar) {
      await supabase.from('categorias').update({ nombre: nombreNuevaCategoria }).eq('id', categoriaAEditar.id);
    } else {
      await supabase.from('categorias').insert({ nombre: nombreNuevaCategoria, tienda_id: miId });
    }
    await cargarCategorias();
    setNombreNuevaCategoria(''); setCategoriaAEditar(null); setGuardandoCategoria(false);
  };

  const eliminarCategoria = async () => {
    if (!confirmarEliminarCat) return;
    await supabase.from('categorias').delete().eq('id', confirmarEliminarCat.id);
    setConfirmarEliminarCat(null);
    await cargarCategorias();
  };

  async function cargarBancos() {
    const { data } = await supabase.from('entidades_bancarias').select('*').eq('tienda_id', miId).order('nombre');
    if (data) setBancos(data);
  }

  const guardarBanco = async (e: any) => {
    e.preventDefault();
    if (!nombreNuevoBanco.trim()) return;
    setGuardandoBanco(true);
    if (bancoAEditar) {
      await supabase.from('entidades_bancarias').update({ nombre: nombreNuevoBanco, numero_cuenta: numeroCuentaBanco, titular: titularBanco }).eq('id', bancoAEditar.id);
    } else {
      await supabase.from('entidades_bancarias').insert({ nombre: nombreNuevoBanco, numero_cuenta: numeroCuentaBanco, titular: titularBanco, tienda_id: miId });
    }
    await cargarBancos();
    setNombreNuevoBanco(''); setNumeroCuentaBanco(''); setTitularBanco(''); setBancoAEditar(null); setGuardandoBanco(false);
  };

  const eliminarBanco = async () => {
    if (!confirmarEliminarBanco) return;
    await supabase.from('entidades_bancarias').delete().eq('id', confirmarEliminarBanco.id);
    setConfirmarEliminarBanco(null);
    await cargarBancos();
  };

  const guardarDatosLocal = async () => {
    setGuardandoLocal(true);
    const { error } = await supabase.from('tiendas').upsert({ id: miId, nombre_local: nombreLocal, telefono });
    if (error) setMensajeLocal({ texto: 'Error al guardar.', tipo: 'error' });
    else setMensajeLocal({ texto: '✅ ¡Datos actualizados!', tipo: 'exito' });
    setGuardandoLocal(false);
    setTimeout(() => setMensajeLocal({ texto: '', tipo: '' }), 3000);
  };

  const manejarImportacionUnicoExcel = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setCargandoExcel(true); setMensajeExcel({ texto: 'Leyendo archivo maestro...', tipo: 'info' });
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const hojaArtesanos = wb.Sheets['Artesano'] || wb.Sheets[wb.SheetNames[0]];
        if (hojaArtesanos) {
          const dataArtesanos: any[] = XLSX.utils.sheet_to_json(hojaArtesanos);
          for (const row of dataArtesanos) {
            await supabase.from('artesanos').upsert({ rut: String(row.Rut || row.rut || row.RUT), nombre: row.Nombre || row.nombre, direccion: row.Direccion || row.direccion, telefono: row.Telefono || row.telefono, correo: row.Correo || row.correo, medio_pago: row['Medio pago'] || row.MedioPago || 'Efectivo', tienda_id: miId });
          }
        }
        const hojaArticulos = wb.Sheets['Articulo'] || wb.Sheets[wb.SheetNames[1]];
        if (hojaArticulos) {
          const dataArticulos: any[] = XLSX.utils.sheet_to_json(hojaArticulos);
          for (const row of dataArticulos) {
            const nombreArticulo = String(row.Articulo || row.articulo);
            let idArt = ''; let rutArtesano = '';
            if (row.ID || row.id) { idArt = String(row.ID || row.id); rutArtesano = idArt.substring(0, 10); }
            else { rutArtesano = String(row['Rut Artesano'] || row.Rut || row.rut || ''); idArt = `${rutArtesano}-${nombreArticulo.replace(/\s+/g, '').toLowerCase()}`; }
            await supabase.from('articulos_maestro').upsert({ id: idArt, rut_artesano: rutArtesano, nombre: nombreArticulo, precio_costo: parseFloat(row.Costo || row.costo || 0), precio_venta: parseFloat(row.Venta || row.venta || 0), tienda_id: miId });
          }
        }
        setMensajeExcel({ texto: '¡Base de datos actualizada correctamente!', tipo: 'exito' });
      } catch (error) {
        setMensajeExcel({ texto: 'Error al leer el archivo. Revisa el formato.', tipo: 'error' });
      }
      setCargandoExcel(false);
      setTimeout(() => setMensajeExcel({ texto: '', tipo: '' }), 5000);
      e.target.value = null;
    };
    reader.readAsBinaryString(file);
  };

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const { data: artesanos } = await supabase.from('artesanos').select('*').eq('tienda_id', miId);
      const { data: articulos } = await supabase.from('articulos_maestro').select('*').eq('tienda_id', miId);
      const { data: compras } = await supabase.from('registro_compras').select('*').eq('tienda_id', miId).order('fecha', { ascending: false });
      const datosCompras = compras?.map(c => { const a = artesanos?.find(a => String(a.rut) === String(c.rut_artesano)); return { 'Fecha': new Date(c.fecha).toLocaleDateString('es-CL'), 'Hora': new Date(c.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }), 'Artesano': a?.nombre || 'Desconocido', 'RUT': c.rut_artesano, 'Artículo': c.nombre_articulo, 'Cantidad': c.cantidad, 'Costo Unitario': c.precio_costo, 'Total Pagado': c.total }; }) || [];
      const datosCatalogo = articulos?.map(art => { const a = artesanos?.find(a => String(a.rut) === String(art.rut_artesano)); return { 'Rut Artesano': art.rut_artesano, 'Nombre Artesano': a?.nombre || 'Desconocido', 'Articulo': art.nombre, 'Costo': art.precio_costo, 'Venta': art.precio_venta }; }) || [];
      const datosArtesanos = artesanos?.map(a => ({ 'Rut': a.rut, 'Nombre': a.nombre, 'Direccion': a.direccion, 'Telefono': a.telefono, 'Correo': a.correo, 'Medio pago': a.medio_pago })) || [];
      const libroExcel = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libroExcel, XLSX.utils.json_to_sheet(datosCompras), "Historial Compras");
      XLSX.utils.book_append_sheet(libroExcel, XLSX.utils.json_to_sheet(datosCatalogo), "Articulos");
      XLSX.utils.book_append_sheet(libroExcel, XLSX.utils.json_to_sheet(datosArtesanos), "Artesanos");
      const fechaHoy = new Date().toLocaleDateString('es-CL').replace(/\//g, '-');
      XLSX.writeFile(libroExcel, `Reporte_Local_${fechaHoy}.xlsx`);
    } catch { toast('Error al generar el Excel', 'error', '❌'); }
    setExportando(false);
  };

  return (
    <div className="space-y-4 fade-in pb-10">

      {/* Confirmaciones inline (reemplazan window.confirm) */}
      {confirmarEliminarCat && (
        <ConfirmDelete nombre={confirmarEliminarCat.nombre} onConfirm={eliminarCategoria} onCancel={() => setConfirmarEliminarCat(null)} />
      )}
      {confirmarEliminarBanco && (
        <ConfirmDelete nombre={confirmarEliminarBanco.nombre} onConfirm={eliminarBanco} onCancel={() => setConfirmarEliminarBanco(null)} />
      )}

      <h2 className="text-xl font-bold text-stone-800">Administración</h2>

      {/* ── CARD 1: Datos del local ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 flex items-center gap-2">
          <span className="text-lg">🏪</span>
          <h3 className="font-bold text-stone-700 text-sm">Datos del Local</h3>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">Nombre de tu vitrina</label>
            <input type="text" value={nombreLocal} onChange={e => setNombreLocal(e.target.value)} className="w-full p-3 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-600 font-bold text-stone-800 bg-stone-50 text-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">WhatsApp</label>
            <div className="flex items-center rounded-xl overflow-hidden border border-stone-200 bg-stone-50">
              <span className="px-3 py-3 bg-stone-100 text-stone-500 font-bold text-sm border-r border-stone-200 shrink-0">+56 9</span>
              <input type="tel" inputMode="numeric" value={telefono} onChange={e => setTelefono(e.target.value)} className="flex-1 p-3 bg-transparent focus:outline-none font-bold text-stone-800 text-sm" />
            </div>
          </div>
          {mensajeLocal.texto && (
            <div className={`p-3 rounded-xl text-sm font-bold text-center ${mensajeLocal.tipo === 'exito' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {mensajeLocal.texto}
            </div>
          )}
          <button onClick={guardarDatosLocal} disabled={guardandoLocal} className="w-full bg-stone-800 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-stone-900 active:scale-95 transition-all disabled:opacity-60">
            {guardandoLocal ? '⏳ Guardando...' : 'Guardar Datos'}
          </button>
        </div>
      </div>

      {/* ── CARD 2: Categorías ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 flex items-center gap-2">
          <span className="text-lg">🏷️</span>
          <div>
            <h3 className="font-bold text-stone-700 text-sm">Categorías de Productos</h3>
            <p className="text-[10px] text-stone-400 mt-0.5">Para organizar tu catálogo</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <form onSubmit={guardarCategoria} className="flex gap-2">
            <input
              type="text" value={nombreNuevaCategoria} onChange={e => setNombreNuevaCategoria(e.target.value)}
              placeholder="Ej: Canastos, Mesas, Sillas..."
              className="flex-1 p-3 border border-stone-200 rounded-xl text-sm font-bold focus:outline-none focus:border-amber-600 bg-stone-50"
              required
            />
            <button type="submit" disabled={guardandoCategoria} className="bg-amber-700 text-white px-4 rounded-xl font-bold text-sm hover:bg-amber-800 active:scale-95 transition-all whitespace-nowrap shadow-sm">
              {guardandoCategoria ? '⏳' : categoriaAEditar ? '✓' : '+ Añadir'}
            </button>
            {categoriaAEditar && (
              <button type="button" onClick={() => { setCategoriaAEditar(null); setNombreNuevaCategoria(''); }} className="bg-stone-200 text-stone-600 px-3 rounded-xl text-sm font-bold hover:bg-stone-300 active:scale-95 transition-all">
                ✕
              </button>
            )}
          </form>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {categorias.length === 0 ? (
              <div className="text-center py-6 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                <p className="text-stone-400 text-xs font-bold">Sin categorías. Añade la primera arriba.</p>
              </div>
            ) : categorias.map(cat => (
              <div key={cat.id} className="flex items-center justify-between px-3 py-3 border border-stone-100 rounded-xl bg-stone-50 hover:border-amber-200 transition-colors">
                <span className="font-bold text-stone-700 text-sm">{cat.nombre}</span>
                <div className="flex gap-1.5">
                  <button onClick={() => { setCategoriaAEditar(cat); setNombreNuevaCategoria(cat.nombre); }} className="w-9 h-9 flex items-center justify-center bg-white border border-stone-200 text-stone-500 rounded-lg hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 active:scale-95 transition-all shadow-sm text-sm">✏️</button>
                  <button onClick={() => setConfirmarEliminarCat(cat)} className="w-9 h-9 flex items-center justify-center bg-white border border-stone-200 text-red-400 rounded-lg hover:bg-red-50 hover:border-red-300 active:scale-95 transition-all shadow-sm text-sm">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CARD 3: Bancos ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 flex items-center gap-2">
          <span className="text-lg">🏦</span>
          <div>
            <h3 className="font-bold text-stone-700 text-sm">Entidades Bancarias</h3>
            <p className="text-[10px] text-stone-400 mt-0.5">Cuentas para recibir transferencias</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <form onSubmit={guardarBanco} className="space-y-2">
            <input type="text" value={nombreNuevoBanco} onChange={e => setNombreNuevoBanco(e.target.value)} placeholder="Nombre del banco (ej: Banco Estado)" className="w-full p-3 border border-stone-200 rounded-xl text-sm font-bold focus:outline-none focus:border-amber-600 bg-stone-50" required />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" inputMode="numeric" value={numeroCuentaBanco} onChange={e => setNumeroCuentaBanco(e.target.value)} placeholder="N° cuenta" className="p-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-600 bg-stone-50" />
              <input type="text" value={titularBanco} onChange={e => setTitularBanco(e.target.value)} placeholder="Titular" className="p-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-600 bg-stone-50" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={guardandoBanco} className="flex-1 bg-amber-700 text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-amber-800 active:scale-95 transition-all shadow-sm">
                {guardandoBanco ? '⏳' : bancoAEditar ? '✓ Guardar Cambios' : '+ Añadir Banco'}
              </button>
              {bancoAEditar && (
                <button type="button" onClick={() => { setBancoAEditar(null); setNombreNuevoBanco(''); setNumeroCuentaBanco(''); setTitularBanco(''); }} className="bg-stone-200 text-stone-600 px-4 rounded-xl text-sm font-bold hover:bg-stone-300 active:scale-95 transition-all">
                  ✕
                </button>
              )}
            </div>
          </form>
          <div className="space-y-2">
            {bancos.length === 0 ? (
              <div className="text-center py-6 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                <p className="text-stone-400 text-xs font-bold">Sin cuentas bancarias. Añade la primera arriba.</p>
              </div>
            ) : bancos.map(banco => (
              <div key={banco.id} className="flex items-center justify-between px-3 py-3 border border-stone-100 rounded-xl bg-stone-50 hover:border-blue-200 transition-colors">
                <div>
                  <p className="font-bold text-stone-800 text-sm">{banco.nombre}</p>
                  {(banco.numero_cuenta || banco.titular) && (
                    <p className="text-[10px] text-stone-400 mt-0.5">{banco.titular}{banco.titular && banco.numero_cuenta ? ' · ' : ''}{banco.numero_cuenta ? `Cta: ${banco.numero_cuenta}` : ''}</p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => { setBancoAEditar(banco); setNombreNuevoBanco(banco.nombre); setNumeroCuentaBanco(banco.numero_cuenta || ''); setTitularBanco(banco.titular || ''); }} className="w-9 h-9 flex items-center justify-center bg-white border border-stone-200 text-stone-500 rounded-lg hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 active:scale-95 transition-all shadow-sm text-sm">✏️</button>
                  <button onClick={() => setConfirmarEliminarBanco(banco)} className="w-9 h-9 flex items-center justify-center bg-white border border-stone-200 text-red-400 rounded-lg hover:bg-red-50 hover:border-red-300 active:scale-95 transition-all shadow-sm text-sm">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CARD 4: Peajes ── */}
      <SeccionPeajes />

      {/* ── CARD 5: Exportar ── */}

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 flex items-center gap-2">
          <span className="text-lg">📥</span>
          <div>
            <h3 className="font-bold text-stone-700 text-sm">Exportar Reportes</h3>
            <p className="text-[10px] text-stone-400 mt-0.5">Descarga tu historial en Excel</p>
          </div>
        </div>
        <div className="p-4">
          <button onClick={exportarExcel} disabled={exportando} className="w-full bg-[#107C41] text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-[#0a5e30] active:scale-95 transition-all disabled:opacity-60 shadow-sm">
            {exportando ? <span className="animate-pulse">Generando Excel... ⏳</span> : <><span className="text-xl">📊</span> Descargar Reporte y Catálogo</>}
          </button>
        </div>
      </div>

      {/* ── CARD 5: Importar Excel ── */}
      <div className="bg-amber-50 rounded-2xl border border-amber-200 overflow-hidden">
        <div className="px-4 py-3 bg-amber-100/70 border-b border-amber-200 flex items-center gap-2">
          <span className="text-lg">📤</span>
          <div>
            <h3 className="font-bold text-amber-900 text-sm">Subir Excel Maestro</h3>
            <p className="text-[10px] text-amber-700 mt-0.5">Pestañas "Artesano" y "Articulo"</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <label className="block w-full">
            <div className="w-full bg-amber-800 text-white py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer hover:bg-amber-900">
              <span>📁</span> Seleccionar archivo .xlsx
            </div>
            <input type="file" accept=".xlsx, .xls" onChange={manejarImportacionUnicoExcel} className="hidden" />
          </label>
          {cargandoExcel && (
            <div className="flex items-center justify-center gap-2 text-amber-700 font-bold text-sm bg-amber-100 p-3 rounded-xl">
              <span className="animate-spin inline-block">⚙️</span> Procesando todas las hojas...
            </div>
          )}
          {mensajeExcel.texto && (
            <p className={`font-bold text-sm text-center p-3 rounded-xl ${mensajeExcel.tipo === 'exito' ? 'bg-green-50 text-green-700 border border-green-100' : mensajeExcel.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'text-amber-700'}`}>
              {mensajeExcel.texto}
            </p>
          )}
        </div>
      </div>

    </div>
  );
}