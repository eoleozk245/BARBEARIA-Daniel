import { supabase } from '../supabaseClient.js?v=20260813g';

/**
 * Admin-only: todas as avaliações reais, mais recentes primeiro.
 * RLS (`reviews_select_own_or_admin`) só devolve as avaliações do próprio cliente
 * ou, para admin, todas — não há mais leitura pública desta tabela.
 */
export async function listAllReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, admin_reply, replied_at, created_at, client:profiles(id,name), barber:barbers(id,name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Avaliações do cliente logado (RLS já limita ao próprio). Usada para saber o que já foi avaliado. */
export async function listMyReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, appointment_id, rating, comment, admin_reply, replied_at, created_at');
  if (error) throw error;
  return data;
}

/**
 * Cliente avalia um atendimento concluído.
 * O banco é quem manda: a policy `reviews_insert_own` exige que o agendamento
 * seja do próprio cliente E esteja `completed`, e um índice único garante uma
 * avaliação por atendimento. Aqui só traduzimos o erro para algo legível.
 */
export async function createReview({ appointmentId, barberId, rating, comment }) {
  const { data, error } = await supabase
    .from('reviews')
    .insert({ appointment_id: appointmentId, barber_id: barberId, rating, comment: comment || null })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Você já avaliou este atendimento.');
    if (error.code === '42501') throw new Error('Só é possível avaliar um atendimento já concluído.');
    throw error;
  }
  return data;
}

/** Admin-only: responde a uma avaliação (RLS permite update por admin). */
export async function replyToReview(reviewId, replyText) {
  const { data, error } = await supabase
    .from('reviews')
    .update({ admin_reply: replyText, replied_at: new Date().toISOString() })
    .eq('id', reviewId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
