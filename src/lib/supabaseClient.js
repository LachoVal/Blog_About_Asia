import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const authOptions = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true
};

if (typeof window !== 'undefined' && window.sessionStorage) {
  authOptions.storage = window.sessionStorage;
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: authOptions })
  : null;

export function requireSupabase() {
  return supabase;
}
