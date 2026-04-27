import { useState } from 'react';
import { supabase } from './supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  // Controlamos en qué pantalla estamos: 'login' o 'recuperar' (Se eliminó 'registro')
  const [modo, setModo] = useState('login'); 
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const manejarAcceso = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      if (modo === 'recuperar') {
        // Lógica real para enviar correo de recuperación
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/actualizar-password`,
        });
        if (error) throw error;
        setMensaje({ texto: 'Te enviamos un correo con las instrucciones.', tipo: 'exito' });
        
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      let errorTexto = error.message;
      if (errorTexto.includes('Invalid login credentials')) errorTexto = 'Correo o contraseña incorrectos.';
      if (errorTexto.includes('Password should be at least')) errorTexto = 'La contraseña debe tener al menos 6 caracteres.';
      setMensaje({ texto: errorTexto, tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl border border-stone-100 fade-in">
        
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-amber-50 rounded-full mx-auto flex items-center justify-center mb-4 border border-amber-100">
            <span className="text-4xl">🧺</span>
          </div>
          <p className="text-amber-800 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Gestión de Artesanos</p>
          <h1 className="text-3xl font-serif italic font-bold text-stone-800">Mi Taller</h1>
        </div>

        <form onSubmit={manejarAcceso} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 ml-1">Correo Electrónico</label>
            <input 
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)} 
              placeholder="artesano@correo.com"
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700 transition-all text-stone-800 font-medium" 
            />
          </div>
          
          {/* Solo mostramos la contraseña si NO estamos en modo recuperar */}
          {modo !== 'recuperar' && (
            <div>
              <div className="flex justify-between items-center mb-2 ml-1 pr-1">
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Contraseña</label>
                {modo === 'login' && (
                  <button type="button" onClick={() => { setModo('recuperar'); setMensaje({ texto: '', tipo: '' }); }} className="text-xs font-bold text-amber-700 hover:text-amber-900">
                    ¿La olvidaste?
                  </button>
                )}
              </div>
              <input 
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700 transition-all text-stone-800 font-medium" 
              />
            </div>
          )}

          {mensaje.texto && (
            <div className={`p-4 rounded-2xl text-xs font-bold text-center border ${mensaje.tipo === 'exito' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {mensaje.texto}
            </div>
          )}

          <button type="submit" disabled={cargando} className="w-full bg-amber-800 text-white py-4 rounded-2xl font-bold shadow-lg shadow-amber-900/20 hover:bg-amber-900 active:scale-95 transition-all disabled:opacity-70 mt-4">
            {cargando ? 'Cargando...' : modo === 'recuperar' ? 'Enviar correo de recuperación' : 'Entrar a mi Taller'}
          </button>
        </form>

        <div className="mt-8 text-center flex flex-col gap-2">
          {modo !== 'login' && (
            <button type="button" onClick={() => { setModo('login'); setMensaje({ texto: '', tipo: '' }); }} className="text-sm font-bold text-stone-400 hover:text-amber-800 transition-colors">
              Volver a iniciar sesión
            </button>
          )}
          {/* Aquí eliminamos el botón de crear cuenta */}
        </div>

      </div>
    </div>
  );
}