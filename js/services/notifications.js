import { supabase } from '../supabaseClient.js?v=20260813k';

/**
 * Notificações no app.
 *
 * O canal `app` é entregue no momento em que é criado (status já nasce `sent`),
 * porque não depende de serviço externo nenhum. Envio por e-mail exige uma conta
 * num provedor (Resend, SendGrid) e uma Edge Function — quando isso existir,
 * basta gravar uma segunda linha com channel='email' e status='pending' e o
 * envio acontece fora daqui.
 */

/** Notificações do usuário logado (RLS já limita ao próprio destinatário). */
export async function listMyNotifications(limit = 20) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, message, read, created_at')
    .eq('channel', 'app')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

/** Marca uma notificação como lida. O banco só permite alterar esta coluna. */
export async function markNotificationRead(id) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

/** Marca todas as não lidas do usuário como lidas. */
export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('read', false)
    .eq('channel', 'app');
  if (error) throw error;
}

/**
 * Avisa quando chega notificação nova para este usuário.
 * O filtro por destinatário é aplicado no servidor — sem ele o Realtime tentaria
 * entregar eventos de outras pessoas (que o RLS bloquearia, mas é desperdício).
 */
export function subscribeNotifications({ userId, onChange }) {
  const channel = supabase.channel(`notifications-${userId}`).on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
    onChange
  );
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}
