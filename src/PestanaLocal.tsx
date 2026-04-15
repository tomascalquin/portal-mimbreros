import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import * as XLSX from 'xlsx';

export default function PestanaLocal({ miId, nombreLocal, setNombreLocal }: any) {
  const [telefono, setTelefono] = useState('');
  const [guardandoLocal, setGuardandoLocal] = useState(false);
  const [mensajeLocal, setMensajeLocal] = useState({ texto: '', tipo: '' });
  
  // --- NUEVOS ESTADOS: GESTIÓN DE CATEGORÍAS ---
  const [categorias, setCategorias] = useState<any[]>([]);
  const [nombreNuevaCategoria, setNombreNuevaCategoria] = useState('');
  const [categoriaAEditar, setCategoriaAEditar] = useState<any>(null);
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);

  // --- ESTADOS: GESTIÓN DE ENTIDADES BANCARIAS ---
  const [bancos, setBancos] = useState<any[]>([]);
  const [nombreNuevoBanco, setNombreNuevoBanco] = useState('');
  const [numeroCuentaBanco, setNumeroCuentaBanco] = useState('');
  const [titularBanco, setTitularBanco] = useState('');
  const [bancoAEditar, setBancoAEditar] = useState<any>(null);
  const [guardandoBanco, setGuardandoBanco] = useState(false);

  // Estados para Importación
  const [cargandoExcel, setCargandoExcel] = useState(false);
  const [mensajeExcel, setMensajeExcel] = useState({ texto: '', tipo: '' });

  // Estado para Exportación
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    if (miId) {
      cargarTelefono();
      cargarCategorias(); // Cargamos las categorías de este local al entrar
      cargarBancos(); // Cargamos las entidades bancarias
    }
  }, [miId]);

  async function cargarTelefono() {
    const { data } = await supabase.from('tiendas').select('telefono').eq('id', miId).single();
    if (data) setTelefono(data.telefono || '');
  }

  // --- NUEVA FUNCIÓN: CARGAR CATEGORÍAS DEL LOCAL ---
  async function cargarCategorias() {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('tienda_id', miId)
      .order('nombre');
    
    if (error) console.error("Error al cargar categorías:", error);
    if (data) setCategorias(data);
  }

  // --- NUEVA FUNCIÓN: CREAR Y EDITAR CATEGORÍAS ---
  const guardarCategoria = async (e: any) => {
    e.preventDefault();
    if (!nombreNuevaCategoria.trim()) return;
    
    setGuardandoCategoria(true);

    if (categoriaAEditar) {
      // Editar existente
      const { error } = await supabase
        .from('categorias')
        .update({ nombre: nombreNuevaCategoria })
        .eq('id', categoriaAEditar.id);
      if (error) alert("Error al editar categoría: " + error.message);
    } else {
      // Crear nueva
      const { error } = await supabase
        .from('categorias')
        .insert({ nombre: nombreNuevaCategoria, tienda_id: miId });
      if (error) alert("Error al crear categoría: " + error.message);
    }

    await cargarCategorias();
    setNombreNuevaCategoria('');
    setCategoriaAEditar(null);
    setGuardandoCategoria(false);
  };

  const cancelarEdicionCategoria = () => {
    setCategoriaAEditar(null);
    setNombreNuevaCategoria('');
  };

  const iniciarEdicionCategoria = (cat: any) => {
    setCategoriaAEditar(cat);
    setNombreNuevaCategoria(cat.nombre);
  };

  // --- NUEVA FUNCIÓN: ELIMINAR CATEGORÍAS ---
  const eliminarCategoria = async (id: string, nombre: string) => {
    const confirmar = window.confirm(`¿Seguro que deseas eliminar la categoría "${nombre}"?\n\nLos productos asociados a esta categoría quedarán sin categoría, pero NO se borrarán de tu catálogo.`);
    if (!confirmar) return;

    // Supabase se encarga de poner categoria_id en NULL en las otras tablas automáticamente
    const { error } = await supabase.from('categorias').delete().eq('id', id);
    
    if (error) alert("Error al eliminar la categoría: " + error.message);
    else await cargarCategorias();
  };

  // --- FUNCIONES: GESTIÓN DE ENTIDADES BANCARIAS ---
  async function cargarBancos() {
    const { data, error } = await supabase
      .from('entidades_bancarias')
      .select('*')
      .eq('tienda_id', miId)
      .order('nombre');
    if (error) console.error("Error al cargar bancos:", error);
    if (data) setBancos(data);
  }

  const guardarBanco = async (e: any) => {
    e.preventDefault();
    if (!nombreNuevoBanco.trim()) return;
    setGuardandoBanco(true);
    if (bancoAEditar) {
      const { error } = await supabase.from('entidades_bancarias').update({
        nombre: nombreNuevoBanco,
        numero_cuenta: numeroCuentaBanco,
        titular: titularBanco,
      }).eq('id', bancoAEditar.id);
      if (error) alert("Error al editar banco: " + error.message);
    } else {
      const { error } = await supabase.from('entidades_bancarias').insert({
        nombre: nombreNuevoBanco,
        numero_cuenta: numeroCuentaBanco,
        titular: titularBanco,
        tienda_id: miId,
      });
      if (error) alert("Error al crear banco: " + error.message);
    }
    await cargarBancos();
    setNombreNuevoBanco(''); setNumeroCuentaBanco(''); setTitularBanco(''); setBancoAEditar(null);
    setGuardandoBanco(false);
  };

  const cancelarEdicionBanco = () => {
    setBancoAEditar(null);
    setNombreNuevoBanco(''); setNumeroCuentaBanco(''); setTitularBanco('');
  };

  const iniciarEdicionBanco = (banco: any) => {
    setBancoAEditar(banco);
    setNombreNuevoBanco(banco.nombre);
    setNumeroCuentaBanco(banco.numero_cuenta || '');
    setTitularBanco(banco.titular || '');
  };

  const eliminarBanco = async (id: string, nombre: string) => {
    const confirmar = window.confirm(`¿Seguro que deseas eliminar el banco "${nombre}"?`);
    if (!confirmar) return;
    const { error } = await supabase.from('entidades_bancarias').delete().eq('id', id);
    if (error) alert("Error al eliminar banco: " + error.message);
    else await cargarBancos();
  };

  const guardarDatosLocal = async () => {
    setGuardandoLocal(true);
    const { error } = await supabase.from('tiendas').upsert({ id: miId, nombre_local: nombreLocal, telefono: telefono });
    if (error) setMensajeLocal({ texto: 'Error al guardar.', tipo: 'error' });
    else setMensajeLocal({ texto: '¡Datos actualizados!', tipo: 'exito' });
    setGuardandoLocal(false);
    setTimeout(() => setMensajeLocal({ texto: '', tipo: '' }), 3000);
  };

  const manejarImportacionUnicoExcel = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    setCargandoExcel(true);
    setMensajeExcel({ texto: 'Leyendo archivo maestro...', tipo: 'info' });
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        const hojaArtesanos = wb.Sheets['Artesano'] || wb.Sheets[wb.SheetNames[0]]; 
        if (hojaArtesanos) {
          const dataArtesanos: any[] = XLSX.utils.sheet_to_json(hojaArtesanos);
          for (const row of dataArtesanos) {
            await supabase.from('artesanos').upsert({
              rut: String(row.Rut || row.rut || row.RUT), 
              nombre: row.Nombre || row.nombre, 
              direccion: row.Direccion || row.direccion,
              telefono: row.Telefono || row.telefono, 
              correo: row.Correo || row.correo, 
              medio_pago: row['Medio pago'] || row.MedioPago || 'Efectivo', 
              tienda_id: miId
            });
          }
        }

        const hojaArticulos = wb.Sheets['Articulo'] || wb.Sheets[wb.SheetNames[1]];
        if (hojaArticulos) {
          const dataArticulos: any[] = XLSX.utils.sheet_to_json(hojaArticulos);
          for (const row of dataArticulos) {
            const nombreArticulo = String(row.Articulo || row.articulo);
            let idArt = '';
            let rutArtesano = '';

            if (row.ID || row.id) {
              idArt = String(row.ID || row.id);
              rutArtesano = idArt.substring(0, 10); 
            } else {
              rutArtesano = String(row['Rut Artesano'] || row.Rut || row.rut || '');
              idArt = `${rutArtesano}-${nombreArticulo.replace(/\s+/g, '').toLowerCase()}`;
            }
            
            await supabase.from('articulos_maestro').upsert({
              id: idArt, 
              rut_artesano: rutArtesano, 
              nombre: nombreArticulo,
              precio_costo: parseFloat(row.Costo || row.costo || 0), 
              precio_venta: parseFloat(row.Venta || row.venta || 0), 
              tienda_id: miId
            });
          }
        }

        setMensajeExcel({ texto: '¡Base de datos actualizada correctamente!', tipo: 'exito' });
      } catch (error) {
        console.error(error);
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

      const datosCompras = compras?.map(c => {
        const artesanoInfo = artesanos?.find(a => String(a.rut) === String(c.rut_artesano));
        return {
          'Fecha': new Date(c.fecha).toLocaleDateString('es-CL'),
          'Hora': new Date(c.fecha).toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'}),
          'Artesano': artesanoInfo?.nombre || 'Desconocido',
          'RUT': c.rut_artesano,
          'Artículo': c.nombre_articulo,
          'Cantidad': c.cantidad,
          'Costo Unitario': c.precio_costo,
          'Total Pagado': c.total
        };
      }) || [];

      const datosCatalogo = articulos?.map(art => {
        const artesanoInfo = artesanos?.find(a => String(a.rut) === String(art.rut_artesano));
        return {
          'Rut Artesano': art.rut_artesano,
          'Nombre Artesano': artesanoInfo?.nombre || 'Desconocido',
          'Articulo': art.nombre,
          'Costo': art.precio_costo,
          'Venta': art.precio_venta
        };
      }) || [];

      const datosArtesanos = artesanos?.map(a => ({
        'Rut': a.rut,
        'Nombre': a.nombre,
        'Direccion': a.direccion,
        'Telefono': a.telefono,
        'Correo': a.correo,
        'Medio pago': a.medio_pago
      })) || [];

      const hojaCompras = XLSX.utils.json_to_sheet(datosCompras);
      const hojaCatalogo = XLSX.utils.json_to_sheet(datosCatalogo);
      const hojaArtesanos = XLSX.utils.json_to_sheet(datosArtesanos);

      const libroExcel = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libroExcel, hojaCompras, "Historial Compras");
      XLSX.utils.book_append_sheet(libroExcel, hojaCatalogo, "Articulos");
      XLSX.utils.book_append_sheet(libroExcel, hojaArtesanos, "Artesanos");

      const fechaHoy = new Date().toLocaleDateString('es-CL').replace(/\//g, '-');
      XLSX.writeFile(libroExcel, `Reporte_Local_${fechaHoy}.xlsx`);

    } catch (error) {
      console.error(error);
      alert("Hubo un error al intentar descargar el Excel.");
    }
    setExportando(false);
  };

  return (
    <div className="space-y-6 fade-in pb-10">
      <h2 className="text-2xl font-bold text-stone-800">Administración</h2>
      
      {/* CUADRO 1: CONFIGURACIÓN DEL LOCAL */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 space-y-4">
        <div>
          <label className="block text-stone-700 font-bold mb-1 text-sm">Nombre de tu vitrina</label>
          <input type="text" value={nombreLocal} onChange={e => setNombreLocal(e.target.value)} className="w-full p-3 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-700" />
        </div>
        <div>
          <label className="block text-stone-700 font-bold mb-1 text-sm">Número de WhatsApp</label>
          <div className="flex items-center">
            <span className="bg-stone-100 p-3 border border-stone-300 border-r-0 rounded-l-lg text-stone-500 font-bold">+56 9</span>
            <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} className="w-full p-3 border border-stone-300 rounded-r-lg focus:outline-none focus:border-amber-700" />
          </div>
        </div>
        {mensajeLocal.texto && (
          <div className={`p-3 rounded-lg text-sm font-bold text-center ${mensajeLocal.tipo === 'exito' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {mensajeLocal.texto}
          </div>
        )}
        <button onClick={guardarDatosLocal} disabled={guardandoLocal} className="w-full bg-stone-800 text-white py-3 rounded-lg font-bold shadow-sm hover:bg-stone-700 transition-colors">
          {guardandoLocal ? 'Guardando...' : 'Guardar Datos'}
        </button>
      </div>

      {/* --- NUEVO CUADRO 2: GESTIÓN DE CATEGORÍAS --- */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🏷️</span>
          <div>
            <h3 className="font-bold text-stone-800 text-lg leading-tight">Categorías de Productos</h3>
            <p className="text-xs text-stone-500 mt-1">Administra las categorías para organizar tu catálogo. Cada local tiene su propia lista.</p>
          </div>
        </div>

        {/* Formulario para Añadir / Editar */}
        <form onSubmit={guardarCategoria} className="flex gap-2">
          <input 
            type="text" 
            value={nombreNuevaCategoria} 
            onChange={(e) => setNombreNuevaCategoria(e.target.value)} 
            placeholder="Ej: Mesas, Sillas, Canastos..." 
            className="flex-1 p-3 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-amber-700"
            required
          />
          <button type="submit" disabled={guardandoCategoria} className="bg-amber-700 text-white px-4 rounded-lg font-bold text-sm hover:bg-amber-800 transition-colors whitespace-nowrap shadow-sm">
            {guardandoCategoria ? '⏳' : (categoriaAEditar ? 'Guardar Cambios' : 'Añadir')}
          </button>
          {categoriaAEditar && (
            <button type="button" onClick={cancelarEdicionCategoria} className="bg-stone-200 text-stone-600 px-3 rounded-lg text-sm font-bold hover:bg-stone-300 transition-colors">
              ✕
            </button>
          )}
        </form>

        {/* Lista de Categorías */}
        <div className="mt-4 max-h-60 overflow-y-auto pr-1 space-y-2 border-t border-stone-100 pt-4">
          {categorias.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-4 bg-stone-50 rounded-lg border border-dashed border-stone-200">
              No tienes categorías creadas. Añade la primera arriba.
            </p>
          ) : (
            categorias.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-3 border border-stone-200 rounded-lg bg-stone-50 hover:border-amber-300 transition-colors">
                <span className="font-bold text-stone-700 text-sm">{cat.nombre}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => iniciarEdicionCategoria(cat)} className="w-8 h-8 flex items-center justify-center bg-white border border-stone-200 text-stone-500 rounded hover:bg-stone-100 transition-colors shadow-sm text-xs" title="Editar">✏️</button>
                  <button type="button" onClick={() => eliminarCategoria(cat.id, cat.nombre)} className="w-8 h-8 flex items-center justify-center bg-white border border-stone-200 text-red-400 rounded hover:bg-red-50 transition-colors shadow-sm text-xs" title="Eliminar">🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- CUADRO 3: GESTIÓN DE ENTIDADES BANCARIAS --- */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🏦</span>
          <div>
            <h3 className="font-bold text-stone-800 text-lg leading-tight">Entidades Bancarias</h3>
            <p className="text-xs text-stone-500 mt-1">Agrega las cuentas bancarias a las que tus clientes pueden transferir. Se mostrarán al registrar ventas por transferencia.</p>
          </div>
        </div>

        {/* Formulario Agregar / Editar */}
        <form onSubmit={guardarBanco} className="space-y-2">
          <input
            type="text"
            value={nombreNuevoBanco}
            onChange={(e) => setNombreNuevoBanco(e.target.value)}
            placeholder="Nombre del banco  (ej: Banco Estado, Mercado Pago...)"
            className="w-full p-3 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-amber-700"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={numeroCuentaBanco}
              onChange={(e) => setNumeroCuentaBanco(e.target.value)}
              placeholder="N° cuenta (opcional)"
              className="p-3 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-amber-700"
            />
            <input
              type="text"
              value={titularBanco}
              onChange={(e) => setTitularBanco(e.target.value)}
              placeholder="Titular (opcional)"
              className="p-3 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-amber-700"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={guardandoBanco} className="flex-1 bg-amber-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-amber-800 transition-colors shadow-sm">
              {guardandoBanco ? '⏳' : (bancoAEditar ? 'Guardar Cambios' : '+ Añadir Banco')}
            </button>
            {bancoAEditar && (
              <button type="button" onClick={cancelarEdicionBanco} className="bg-stone-200 text-stone-600 px-3 rounded-lg text-sm font-bold hover:bg-stone-300 transition-colors">
                ✕ Cancelar
              </button>
            )}
          </div>
        </form>

        {/* Lista de Bancos */}
        <div className="mt-2 space-y-2 border-t border-stone-100 pt-4">
          {bancos.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-4 bg-stone-50 rounded-lg border border-dashed border-stone-200">
              No tienes cuentas bancarias registradas. Añade la primera arriba.
            </p>
          ) : (
            bancos.map(banco => (
              <div key={banco.id} className="flex items-center justify-between p-3 border border-stone-200 rounded-lg bg-stone-50 hover:border-amber-300 transition-colors">
                <div>
                  <p className="font-bold text-stone-800 text-sm">{banco.nombre}</p>
                  {(banco.numero_cuenta || banco.titular) && (
                    <p className="text-xs text-stone-500 mt-0.5">
                      {banco.titular && <span>{banco.titular}</span>}
                      {banco.titular && banco.numero_cuenta && <span className="mx-1">·</span>}
                      {banco.numero_cuenta && <span>Cta: {banco.numero_cuenta}</span>}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => iniciarEdicionBanco(banco)} className="w-8 h-8 flex items-center justify-center bg-white border border-stone-200 text-stone-500 rounded hover:bg-stone-100 transition-colors shadow-sm text-xs" title="Editar">✏️</button>
                  <button type="button" onClick={() => eliminarBanco(banco.id, banco.nombre)} className="w-8 h-8 flex items-center justify-center bg-white border border-stone-200 text-red-400 rounded hover:bg-red-50 transition-colors shadow-sm text-xs" title="Eliminar">🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CUADRO 4: EXPORTACIÓN DE EXCEL */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">📥</span>
          <div>
            <h3 className="font-bold text-stone-800 text-lg leading-tight">Exportar Reportes</h3>
            <p className="text-xs text-stone-500 mt-1">Descarga el historial de compras y tu catálogo completo en formato Excel.</p>
          </div>
        </div>
        
        <button 
          onClick={exportarExcel} 
          disabled={exportando}
          className="w-full bg-[#107C41] text-white py-3.5 rounded-xl font-bold shadow-md flex justify-center items-center gap-2 hover:bg-[#0a5e30] transition-colors"
        >
          {exportando ? (
            <span className="animate-pulse">Generando Excel... ⏳</span>
          ) : (
            <>
              <span className="text-xl">📊</span> Descargar Reporte y Catálogo
            </>
          )}
        </button>
      </div>

      {/* CUADRO 5: CARGA DEL EXCEL MAESTRO */}
      <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">📤</span>
          <div>
            <h3 className="font-bold text-amber-900 text-lg leading-tight">Subir Excel Maestro</h3>
            <p className="text-xs text-amber-700 mt-1">Sube tu Excel con las pestañas "Artesano" y "Articulo" para actualizar los precios o agregar proveedores de forma masiva.</p>
          </div>
        </div>
        
        <div className="bg-white p-2 rounded-xl border border-amber-100">
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={manejarImportacionUnicoExcel} 
            className="w-full text-sm text-stone-500 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:bg-amber-800 file:text-white file:font-bold hover:file:bg-amber-900 cursor-pointer transition-colors" 
          />
        </div>
        
        {cargandoExcel && (
          <div className="flex items-center justify-center gap-2 text-amber-700 font-bold text-sm bg-amber-100 p-3 rounded-lg">
            <span className="animate-spin">⚙️</span> Procesando todas las hojas...
          </div>
        )}
        
        {mensajeExcel.texto && (
          <p className={`font-bold text-sm text-center p-3 rounded-lg ${mensajeExcel.tipo === 'exito' ? 'bg-green-100 text-green-700' : mensajeExcel.tipo === 'error' ? 'bg-red-100 text-red-700' : 'text-amber-700'}`}>
            {mensajeExcel.texto}
          </p>
        )}
      </div>

    </div>
  );
}