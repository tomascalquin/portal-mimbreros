import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import Login from './Login';
import Panel from './Panel';
import Vitrina from './Vitrina';
import ActualizarPassword from './ActualizarPassword'; // <-- NUEVA IMPORTACIÓN

function App() {
  const [sesion, setSesion] = useState<any>(null);
  const [cargandoAuth, setCargandoAuth] = useState(true); 

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session);
      setCargandoAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session);
      setCargandoAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (cargandoAuth) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="text-5xl animate-bounce">🧺</span>
          <p className="text-amber-800 font-bold tracking-widest uppercase text-xs">Abriendo el taller...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/catalogo/:tiendaId" element={<Vitrina />} />
        
        {/* NUEVA RUTA: La página donde aterrizan desde el correo */}
        <Route path="/actualizar-password" element={<ActualizarPassword />} />
        <Route path="/" element={<Navigate to="/admin" replace />} />
        
        <Route path="/admin" element={sesion ? <Panel /> : <Login />} />
        <Route path="*" element={<Navigate to="/admin" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;