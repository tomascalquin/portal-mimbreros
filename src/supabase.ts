import { createClient } from '@supabase/supabase-js'

// Extraemos las llaves de las variables de entorno de Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
})

// Función para usar un proxy CDN (Cloudflare) gratuito y evitar consumo de Egress en Supabase
// Estrategia: solo 2 anchos estándar (400 y 800) para minimizar entradas de caché en wsrv.nl.
// maxage=365d → wsrv.nl solo va a Supabase UNA VEZ AL AÑO por imagen (~1.6 MB/día promedio).
export const getOptimizedUrl = (url: string | null | undefined, width: number = 800): string | undefined => {
  if (!url) return undefined;
  // Solo aplicamos el proxy a URLs de Supabase
  if (!url.includes('supabase.co')) return url;
  // Estandarizar a solo 2 anchos: todo ≤400 → 400, todo >400 → 800
  // Esto reduce las entradas de caché en wsrv.nl a la mitad.
  const anchoEstandar = width <= 400 ? 400 : 800;
  const urlSinProtocolo = url.replace('https://', '');
  return `https://wsrv.nl/?url=${urlSinProtocolo}&w=${anchoEstandar}&output=webp&q=80&maxage=365d`;
};