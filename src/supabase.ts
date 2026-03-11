import { createClient } from '@supabase/supabase-js'

// Reemplaza esto con los datos reales de tu proyecto en Supabase
const supabaseUrl = 'https://fwhjzjqkvfdsezfgpqdi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aGp6anFrdmZkc2V6ZmdwcWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjY2MTMsImV4cCI6MjA4Nzc0MjYxM30.1MLuKDs61KF1XqOBdp_TFmOK6taP3pbOpsro75zA_rI'

// Esto crea el puente de comunicación
export const supabase = createClient(supabaseUrl, supabaseKey)