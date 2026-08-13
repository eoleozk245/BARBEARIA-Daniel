import { supabase } from '../supabaseClient.js?v=20260813c';

const REASON_MESSAGES = {
  forbidden: 'Apenas administradores podem confirmar atendimentos.',
  not_found: 'QR Code inválido ou não reconhecido.',
  cancelled: 'Esse agendamento foi cancelado.',
  wrong_date: 'Esse QR Code não é para o dia de hoje.',
  already_used: 'Esse QR Code já foi utilizado.',
  not_found_or_invalid_status: 'Agendamento não encontrado ou já finalizado.',
};

/** Erro com o motivo técnico anexado, para a UI poder exibi-lo no diagnóstico. */
function rpcError(reason) {
  const err = new Error(REASON_MESSAGES[reason] || 'Não foi possível confirmar. Tente novamente.');
  err.reason = reason || 'desconhecido';
  return err;
}

/** Admin-only: valida o QR escaneado e confirma o atendimento (+1 ponto de fidelidade). */
export async function scanQrCheckin(qrToken) {
  const { data, error } = await supabase.rpc('confirm_appointment_by_qr', { p_qr_token: qrToken });
  if (error) {
    const err = new Error(error.message || 'Falha de comunicação com o servidor.');
    err.reason = error.code || 'erro de rede';
    throw err;
  }
  const row = data?.[0];
  if (!row?.ok) throw rpcError(row?.reason);
  return row; // { appointment_id, loyalty_total, reward_unlocked }
}

/** Admin-only: conclui manualmente (sem QR) — não soma ponto de fidelidade. */
export async function confirmAppointmentManually(appointmentId) {
  const { data, error } = await supabase.rpc('confirm_appointment_manually', { p_appointment_id: appointmentId });
  if (error) throw error;
  const row = data?.[0];
  if (!row?.ok) throw rpcError(row?.reason);
  return row;
}

/**
 * Minutos antes do horário em que o QR aparece para o cliente.
 * Regra atual: quem confirma o atendimento é o próprio barbeiro/dono, então não há
 * motivo para restringir — o padrão (525600 = 1 ano) deixa o QR sempre disponível.
 * O ajuste continua em business_settings caso a regra mude no futuro.
 */
export async function getQrUnlockMinutes() {
  const { data, error } = await supabase
    .from('business_settings')
    .select('qr_unlock_minutes_before')
    .eq('id', true)
    .single();
  if (error) throw error;
  return data?.qr_unlock_minutes_before ?? 525600;
}

/** Saldo de fidelidade do cliente logado (RLS já restringe a own-row ou admin). */
export async function getMyLoyaltyStatus(clientId) {
  const { data, error } = await supabase
    .from('loyalty_ledger')
    .select('points_delta')
    .eq('client_id', clientId);
  if (error) throw error;
  const total = (data || []).reduce((sum, row) => sum + row.points_delta, 0);
  const progress = ((total % 10) + 10) % 10;
  return {
    total,
    progress,
    remaining: progress === 0 && total > 0 ? 0 : 10 - progress,
    rewardAvailable: total > 0 && total % 10 === 0,
  };
}
