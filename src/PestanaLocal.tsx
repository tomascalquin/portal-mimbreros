import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import * as XLSX from 'xlsx';

export default function PestanaLocal({ miId, nombreLocal, setNombreLocal }: any) {
  const [telefono, setTelefono] = useState('');
  const [guardandoLocal, setGuardandoLocal] = useState(false);
  const [mensajeLocal, setMensajeLocal] = useState({ texto: '', tipo: '' });
  
  // Estados para Importación
  const [cargandoExcel, setCargandoExcel] = useState(false);
  const [mensajeExcel, setMensajeExcel] = useState({ texto: '', tipo: '' });

  // Estado para Exportación
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    if (miId) cargarTelefono();
  }, [miId]);

  async function cargarTelefono() {
    const { data } = await supabase.from('tiendas').select('telefono').eq('id', miId).single();
    if (data) setTelefono(data.telefono || '');
  }

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

        // 1. Guardar Artesanos primero
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

        // 2. Guardar Artículos
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

  // --- NUEVA FUNCIÓN: EXPORTAR DATOS A EXCEL ---
  const exportarExcel = async () => {
    setExportando(true);
    try {
      // 1. Traer todos los datos de Supabase
      const { data: artesanos } = await supabase.from('artesanos').select('*').eq('tienda_id', miId);
      const { data: articulos } = await supabase.from('articulos_maestro').select('*').eq('tienda_id', miId);
      const { data: compras } = await supabase.from('registro_compras').select('*').eq('tienda_id', miId).order('fecha', { ascending: false });

      // 2. Darle formato a la hoja de Historial de Compras
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

      // 3. Darle formato a la hoja de Catálogo de Artículos
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

      // 4. Darle formato a la hoja de Artesanos (Respaldo)
      const datosArtesanos = artesanos?.map(a => ({
        'Rut': a.rut,
        'Nombre': a.nombre,
        'Direccion': a.direccion,
        'Telefono': a.telefono,
        'Correo': a.correo,
        'Medio pago': a.medio_pago
      })) || [];

      // 5. Crear las hojas virtuales
      const hojaCompras = XLSX.utils.json_to_sheet(datosCompras);
      const hojaCatalogo = XLSX.utils.json_to_sheet(datosCatalogo);
      const hojaArtesanos = XLSX.utils.json_to_sheet(datosArtesanos);

      // 6. Crear el libro de Excel y meterle las hojas
      const libroExcel = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libroExcel, hojaCompras, "Historial Compras");
      XLSX.utils.book_append_sheet(libroExcel, hojaCatalogo, "Articulos");
      XLSX.utils.book_append_sheet(libroExcel, hojaArtesanos, "Artesanos");

      // 7. Descargar el archivo con la fecha de hoy
      const fechaHoy = new Date().toLocaleDateString('es-CL').replace(/\//g, '-');
      XLSX.writeFile(libroExcel, `Reporte_La_Cantarita_${fechaHoy}.xlsx`);

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

      {/* CUADRO 2: EXPORTACIÓN DE EXCEL (NUEVO) */}
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

      {/* CUADRO 3: CARGA DEL EXCEL MAESTRO */}
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