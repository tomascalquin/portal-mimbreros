import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useTaller() {
  const [datos, setDatos] = useState({
    tienda: { nombre_local: '', telefono: '' },
    productos: [] as any[],
    compras: [] as any[],
    cargando: true
  });

  const cargarTodo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [tienda, productos, compras] = await Promise.all([
      supabase.from('tiendas').select('*').eq('id', user.id).single(),
      supabase.from('productos').select('*').eq('tienda_id', user.id),
      supabase.from('compras').select('*').eq('tienda_id', user.id).order('fecha', { ascending: false })
    ]);

    setDatos({
      tienda: tienda.data || { nombre_local: '', telefono: '' },
      productos: productos.data || [],
      compras: compras.data || [],
      cargando: false
    });
  };

  useEffect(() => { cargarTodo(); }, []);

  return { ...datos, refrescar: cargarTodo };
}