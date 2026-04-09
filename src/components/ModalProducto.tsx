import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function ModalProducto({ productoEditar, onClose, onGuardado }: any) {
  const [prodNombre, setProdNombre] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrecio, setProdPrecio] = useState('');
  const [prodStock, setProdStock] = useState('1');
  
  // Estados para ambas fotos
  const [prodArchivo, setProdArchivo] = useState<File | null>(null);
  const [prodArchivo2, setProdArchivo2] = useState<File | null>(null);
  
  const [guardandoProd, setGuardandoProd] = useState(false);

  // Si le pasamos un producto para editar, rellena las cajas automáticamente
  useEffect(() => {
    if (productoEditar) {
      setProdNombre(productoEditar.nombre);
      setProdDesc(productoEditar.descripcion || '');
      setProdPrecio(productoEditar.precio.toString());
      setProdStock(productoEditar.stock.toString());
      // Nota: Los inputs de tipo 'file' no se pueden autorellenar por seguridad del navegador.
    }
  }, [productoEditar]);

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoProd(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      let fotoUrl = null;
      let fotoUrl2 = null;

      // Subir la primera foto si se seleccionó una
      if (prodArchivo) {
        const nombreArchivo = `${user.id}/${Math.random()}-${prodArchivo.name}`;
        const { error: errorFoto } = await supabase.storage.from('fotos_muebles').upload(nombreArchivo, prodArchivo);
        if (!errorFoto) {
          const { data } = supabase.storage.from('fotos_muebles').getPublicUrl(nombreArchivo);
          fotoUrl = data.publicUrl;
        }
      }

      // Subir la segunda foto si se seleccionó una
      if (prodArchivo2) {
        const nombreArchivo2 = `${user.id}/detalle-${Math.random()}-${prodArchivo2.name}`;
        const { error: errorFoto2 } = await supabase.storage.from('fotos_muebles').upload(nombreArchivo2, prodArchivo2);
        if (!errorFoto2) {
          const { data } = supabase.storage.from('fotos_muebles').getPublicUrl(nombreArchivo2);
          fotoUrl2 = data.publicUrl;
        }
      }

      const datosDelMueble: any = {
        tienda_id: user.id,
        nombre: prodNombre,
        descripcion: prodDesc,
        precio: parseFloat(prodPrecio),
        stock: parseInt(prodStock),
      };

      // Solo actualizamos las URLs si efectivamente se subió una imagen nueva
      if (fotoUrl) datosDelMueble.foto_url = fotoUrl;
      if (fotoUrl2) datosDelMueble.foto_url_2 = fotoUrl2;

      if (productoEditar) {
        await supabase.from('productos').update(datosDelMueble).eq('id', productoEditar.id);
      } else {
        await supabase.from('productos').insert(datosDelMueble);
      }
      
      await onGuardado();
      onClose();
    }
    setGuardandoProd(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-end sm:items-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md p-6 rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto slide-up">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-amber-900">{productoEditar ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button onClick={onClose} className="text-stone-400 font-bold text-xl hover:text-red-500">✕</button>
        </div>
        
        <form onSubmit={guardarProducto} className="flex flex-col gap-4">
          
          {/* Fila para las dos fotos */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Foto Principal</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setProdArchivo(e.target.files ? e.target.files[0] : null)} 
                className="w-full text-[10px] text-stone-500 file:mr-2 file:py-1.5 file:px-2 file:rounded-xl file:border-0 file:bg-amber-50 file:text-amber-700 file:font-bold hover:file:bg-amber-100 transition-colors" 
              />
              {productoEditar?.foto_url && !prodArchivo && (
                <p className="text-[10px] text-stone-400 mt-1 italic">✓ Imagen guardada</p>
              )}
            </div>
            
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Foto Detalle (2)</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setProdArchivo2(e.target.files ? e.target.files[0] : null)} 
                className="w-full text-[10px] text-stone-500 file:mr-2 file:py-1.5 file:px-2 file:rounded-xl file:border-0 file:bg-stone-100 file:text-stone-700 file:font-bold hover:file:bg-stone-200 transition-colors" 
              />
              {productoEditar?.foto_url_2 && !prodArchivo2 && (
                <p className="text-[10px] text-stone-400 mt-1 italic">✓ Imagen guardada</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1">Nombre</label>
            <input type="text" required value={prodNombre} onChange={(e) => setProdNombre(e.target.value)} className="w-full p-3 border rounded-lg focus:border-amber-600 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1">Precio ($)</label>
              <input type="number" required value={prodPrecio} onChange={(e) => setProdPrecio(e.target.value)} className="w-full p-3 border rounded-lg focus:border-amber-600 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1">Cantidad (Stock)</label>
              <input type="number" required value={prodStock} onChange={(e) => setProdStock(e.target.value)} className="w-full p-3 border rounded-lg focus:border-amber-600 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1">Descripción</label>
            <textarea value={prodDesc} onChange={(e) => setProdDesc(e.target.value)} className="w-full p-3 border rounded-lg focus:border-amber-600 outline-none h-20"></textarea>
          </div>

          <button type="submit" disabled={guardandoProd} className="w-full bg-amber-600 text-white font-bold py-3.5 rounded-xl hover:bg-amber-700 mt-2 transition-colors">
            {guardandoProd ? 'Guardando...' : (productoEditar ? 'Actualizar Producto' : 'Publicar')}
          </button>
        </form>
      </div>
    </div>
  );
}