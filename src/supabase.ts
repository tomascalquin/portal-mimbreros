import { createClient } from '@supabase/supabase-js'

// Reemplaza esto con los datos reales de tu proyecto en Supabase
const supabaseUrl = 'https://fwhjzjqkvfdsezfgpqdi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aGp6anFrdmZkc2V6ZmdwcWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjY2MTMsImV4cCI6MjA4Nzc0MjYxM30.1MLuKDs61KF1XqOBdp_TFmOK6taP3pbOpsro75zA_rI'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Función para usar un proxy CDN (Cloudflare) gratuito y evitar consumo de Egress en Supabase
export const getOptimizedUrl = (url: string | null | undefined, width: number = 800): string | undefined => {
  if (!url) return undefined;
  // Solo aplicamos el proxy a URLs de Supabase
  if (!url.includes('supabase.co')) return url;
  // wsrv.nl es un proxy global respaldado por Cloudflare que cachea y comprime las imágenes
  const urlSinProtocolo = url.replace('https://', '');
  return `https://wsrv.nl/?url=${urlSinProtocolo}&w=${width}&output=webp&q=80`;
};