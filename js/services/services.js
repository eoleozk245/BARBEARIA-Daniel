import { supabase } from '../supabaseClient.js';

export async function listServices({ onlyActive = true } = {}) {
  let query = supabase.from('services').select('*').order('name');
  if (onlyActive) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createService(service) {
  const { data, error } = await supabase.from('services').insert(service).select().single();
  if (error) throw error;
  return data;
}

export async function updateService(id, patch) {
  const { data, error } = await supabase
    .from('services')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteService(id) {
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
}
