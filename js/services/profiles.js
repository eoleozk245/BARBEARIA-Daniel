import { supabase } from '../supabaseClient.js';

export async function getProfile(id) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function updateProfile(id, patch) {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Admin-only: lista todos os clientes (role='client'). */
export async function listClients() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Admin-only: lista clientes já com segment (novo/vip/regular) e estatísticas calculadas no banco. */
export async function listClientStats() {
  const { data, error } = await supabase
    .from('vw_client_stats')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Admin-only: exclusão permanente do cliente (login + todos os dados relacionados,
 * via Edge Function — precisa de service_role para apagar de auth.users).
 */
export async function deleteClient(clientId) {
  const { data, error } = await supabase.functions.invoke('delete-client', {
    body: { client_id: clientId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
