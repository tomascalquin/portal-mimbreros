import { createClient } from '@supabase/supabase-js'

// Extraemos las llaves de las variables de entorno de Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey)

// Función para usar un proxy CDN (Cloudflare) gratuito y evitar consumo de Egress en Supabase
export const getOptimizedUrl = (url: string | null | undefined, width: number = 800): string | undefined => {
  if (!url) return undefined;
  // Solo aplicamos el proxy a URLs de Supabase
  if (!url.includes('supabase.co')) return url;
  // wsrv.nl: proxy global de Cloudflare que cachea y comprime imágenes.
  // maxage=30d → wsrv.nl solo va a Supabase UNA VEZ al mes por imagen (antes era cada 24h).
  // Esto reduce el Cached Egress de Supabase en ~30x.
  const urlSinProtocolo = url.replace('https://', '');
  return `https://wsrv.nl/?url=${urlSinProtocolo}&w=${width}&output=webp&q=80&maxage=30d`;
};