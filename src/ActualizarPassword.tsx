import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useNavigate } from 'react-router-dom';

export default function ActualizarPassword() {
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const navigate = useNavigate();

  useEffect(() => {
    // Escuchamos si el usuario realmente viene del correo de recuperación
    supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMensaje({ texto: 'Escribe tu nueva contraseña.', tipo: 'exito' });
      }
    });
  }, []);

  const cambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      // Esta es la función real que guarda la nueva contraseña en Supabase
      const { error } = await supabase.auth.updateUser({ password: nuevaPassword });
      
      if (error) throw error;
      
      setMensaje({ texto: '¡Contraseña actualizada! Entrando al taller...', tipo: 'exito' });
      
      // Esperamos 2 segundos para que lea el mensaje y lo mandamos al panel
      setTimeout(() => {
        navigate('/admin');
      }, 2000);

    } catch (error: any) {
      setMensaje({ texto: 'Hubo un error al actualizar. Intenta pedir otro correo.', tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl border border-stone-100 fade-in text-center">
        
        <h2 className="text-2xl font-serif italic font-bold text-stone-800 mb-2">Nueva Contraseña</h2>
        <p className="text-stone-500 text-sm mb-6">Ingresa la nueva clave que usarás para acceder a tu vitrina.</p>

        <form onSubmit={cambiarPassword} className="space-y-4 text-left">
          <div>
            <input 
              type="password" required value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)} 
              placeholder="Escribe tu nueva contraseña" minLength={6}
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700 transition-all text-stone-800 font-medium" 
            />
          </div>

          {mensaje.texto && (
            <div className={`p-4 rounded-2xl text-xs font-bold text-center border ${mensaje.tipo === 'exito' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {mensaje.texto}
            </div>
          )}

          <button type="submit" disabled={cargando} className="w-full bg-stone-800 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-stone-900 active:scale-95 transition-all disabled:opacity-70 mt-4">
            {cargando ? 'Guardando...' : 'Actualizar y Entrar'}
          </button>
        </form>

      </div>
    </div>
  );
}