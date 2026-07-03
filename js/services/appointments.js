import { supabase } from '../supabaseClient.js';

const SELECT_WITH_JOINS = `
  id, appointment_date, start_time, end_time, status, notes, created_at, updated_at,
  qr_token, qr_used_at, confirmed_at, confirmed_by,
  service:services(id,name,price,duration_minutes),
  barber:barbers(id,name)
`;

/** Agendamentos do cliente logado (RLS já filtra por client_id = auth.uid()). */
export async function listMyAppointments() {
  const { data, error } = await supabase
    .from('appointments')
    .select(SELECT_WITH_JOINS)
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data;
}

/** Admin-only: todos os agendamentos (RLS libera via is_admin()). */
export async function listAllAppointments() {
  const { data, error } = await supabase
    .from('appointments')
    .select(`${SELECT_WITH_JOINS}, client:profiles(id,name,email)`)
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data;
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minutesToTime(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Calcula os horários realmente livres de um barbeiro numa data, cruzando o
 * horário de trabalho (barber_hours) com os agendamentos já existentes
 * (scheduled/confirmed) e a duração do serviço escolhido.
 */
export async function getAvailableSlots(barberId, serviceId, dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const weekday = date.getDay();

  const [{ data: hours, error: hoursErr }, { data: service, error: svcErr }, { data: settings }] =
    await Promise.all([
      supabase.from('barber_hours').select('start_time,end_time').eq('barber_id', barberId).eq('weekday', weekday),
      supabase.from('services').select('duration_minutes').eq('id', serviceId).single(),
      supabase.from('business_settings').select('slot_interval_minutes').eq('id', true).single(),
    ]);
  if (hoursErr) throw hoursErr;
  if (svcErr) throw svcErr;
  if (!hours || hours.length === 0) return [];

  const { data: busy, error: apptErr } = await supabase
    .from('appointments')
    .select('start_time,end_time')
    .eq('barber_id', barberId)
    .eq('appointment_date', dateStr)
    .in('status', ['scheduled', 'confirmed']);
  if (apptErr) throw apptErr;

  const duration = service.duration_minutes;
  const step = settings?.slot_interval_minutes || 30;
  const busyRanges = busy.map((b) => [timeToMinutes(b.start_time), timeToMinutes(b.end_time)]);
  const now = new Date();
  const isToday = now.toISOString().slice(0, 10) === dateStr;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots = [];
  for (const h of hours) {
    const dayStart = timeToMinutes(h.start_time);
    const dayEnd = timeToMinutes(h.end_time);
    for (let start = dayStart; start + duration <= dayEnd; start += step) {
      if (isToday && start <= nowMinutes) continue;
      const end = start + duration;
      const overlaps = busyRanges.some(([bStart, bEnd]) => start < bEnd && end > bStart);
      if (!overlaps) slots.push({ start_time: minutesToTime(start), end_time: minutesToTime(end) });
    }
  }
  return slots;
}

/** Cria um agendamento real. Trata violação da constraint única (corrida de horário). */
export async function createAppointment({ client_id, barber_id, service_id, appointment_date, start_time, end_time, notes }) {
  const { data, error } = await supabase
    .from('appointments')
    .insert({ client_id, barber_id, service_id, appointment_date, start_time, end_time, notes })
    .select(SELECT_WITH_JOINS)
    .single();
  if (error) {
    if (error.code === '23505') {
      throw new Error('Esse horário acabou de ser ocupado por outra pessoa. Escolha outro horário.');
    }
    throw error;
  }
  return data;
}

/** Cancelamento pelo próprio cliente (o trigger no banco só permite isso). */
export async function cancelAppointment(id) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Admin: confirmar, cancelar ou concluir um agendamento. */
export async function updateAppointmentStatus(id, status) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function countAppointments({ from, to } = {}) {
  let query = supabase.from('appointments').select('id', { count: 'exact', head: true });
  if (from) query = query.gte('appointment_date', from);
  if (to) query = query.lte('appointment_date', to);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

/**
 * Assina mudanças em tempo real na tabela appointments.
 * scope 'own' filtra pelo client_id do usuário logado; 'all' (admin) recebe tudo.
 * Retorna uma função para cancelar a assinatura.
 */
export function subscribeAppointments({ scope, clientId, onChange }) {
  const channel = supabase.channel(`appointments-${scope}-${clientId || 'all'}`).on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'appointments',
      ...(scope === 'own' && clientId ? { filter: `client_id=eq.${clientId}` } : {}),
    },
    onChange
  );
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}
