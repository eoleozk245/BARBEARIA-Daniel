import { supabase } from '../supabaseClient.js';

export async function listBarbers({ onlyActive = true } = {}) {
  let query = supabase.from('barbers').select('*').order('name');
  if (onlyActive) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createBarber(barber) {
  const { data, error } = await supabase.from('barbers').insert(barber).select().single();
  if (error) throw error;
  return data;
}

export async function updateBarber(id, patch) {
  const { data, error } = await supabase
    .from('barbers')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBarber(id) {
  const { error } = await supabase.from('barbers').delete().eq('id', id);
  if (error) throw error;
}

export async function getBarberHours(barberId) {
  const { data, error } = await supabase
    .from('barber_hours')
    .select('*')
    .eq('barber_id', barberId)
    .order('weekday');
  if (error) throw error;
  return data;
}
