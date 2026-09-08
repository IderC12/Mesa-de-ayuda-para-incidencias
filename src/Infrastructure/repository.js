import { createClient } from '@supabase/supabase-js';
import { createDemoRepository } from './Repositories/demoRepository.js';
import { createSupabaseRepository } from './Repositories/supabaseRepository.js';
const mode = import.meta.env.VITE_DATA_MODE || 'demo';
export function createRepository() {
  if (mode === 'demo') return createDemoRepository();
  if (mode !== 'supabase') throw new Error('VITE_DATA_MODE debe ser demo o supabase.');
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error('Falta configurar Supabase. Consulta .env.example y la guía de instalación.');
  return createSupabaseRepository(createClient(url, key));
}

console.log("VITE_DATA_MODE:", import.meta.env.VITE_DATA_MODE);
console.log("MODE:", mode);