import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Sinaliza para a UI se as credenciais estão presentes, em vez de quebrar
// a aplicação com tela branca (ver src/pages/SetupNotice.tsx).
export const isSupabaseConfigured = Boolean(url && anonKey)

// Fallbacks só evitam o erro de construção quando o .env ainda não existe;
// nunca são usados de fato, pois a UI bloqueia o app antes de qualquer chamada.
export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'anon-placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
