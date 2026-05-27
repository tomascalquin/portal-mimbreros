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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setSesion(session);
        setCargandoAuth(false);
      } else {
        // Intentar auto-login si el usuario marcó "Recordarme"
        const stored = localStorage.getItem('sb_credenciales');
        if (stored) {
          try {
            const { email, password } = JSON.parse(stored);
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (!error && data.session) {
              setSesion(data.session);
            }
          } catch {
            localStorage.removeItem('sb_credenciales');
          }
        }
        setCargandoAuth(false);
      }
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
        {/* La raíz lleva directo al catálogo de Jorge */}
        <Route path="/" element={<Navigate to="/catalogo/e552b6a3-16ef-4998-be48-4577c976355a" replace />} />
        
        <Route path="/admin" element={sesion ? <Panel /> : <Login />} />
        <Route path="*" element={<Navigate to="/catalogo/e552b6a3-16ef-4998-be48-4577c976355a" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;