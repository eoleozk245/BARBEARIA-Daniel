// Versão fixada de propósito. Com `@2`, o esm.sh entregaria qualquer release 2.x
// futura — ou seja, código novo entraria no site sem nenhuma revisão nossa.
// Para atualizar: troque o número aqui e teste login, agendamento e leitura do QR.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3';

const SUPABASE_URL = 'https://sbzrccpyomwuctufkkmf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_IIWVKyMRGBHaPEjreTVsIg_ar1pC3-T';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
