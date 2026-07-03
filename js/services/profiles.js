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
 * Admin-only: cadastro manual de cliente (cria a conta de login via Edge Function —
 * precisa de service_role para criar em auth.users; o trigger handle_new_user()
 * cria o perfil a partir do metadata). Senha em branco = gerada aleatoriamente,
 * cliente define a própria via "Esqueci minha senha".
 */
export async function createClientAccount({ name, email, phone, password }) {
  const { data, error } = await supabase.functions.invoke('create-client', {
    body: { name, email, phone, password: password || undefined },
  });
  if (error) {
    // FunctionsHttpError esconde o corpo — tenta extrair a mensagem real da resposta.
    const ctx = await error.context?.json?.().catch(() => null);
    throw new Error(ctx?.error || error.message || 'Não foi possível criar o cliente.');
  }
  if (data?.error) throw new Error(data.error);
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
