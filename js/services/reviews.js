import { supabase } from '../supabaseClient.js?v=20260813b';

/** Admin-only: todas as avaliações reais, mais recentes primeiro (RLS permite leitura pública). */
export async function listAllReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, admin_reply, replied_at, created_at, client:profiles(id,name), barber:barbers(id,name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
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
