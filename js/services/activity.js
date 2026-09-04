import { supabase } from '../supabaseClient.js?v=20260813j';

/**
 * Feed de atividade do admin, lido da tabela `activity_log`.
 *
 * Antes este histórico era remontado no navegador cruzando agendamentos,
 * clientes e avaliações a cada carregamento. Agora os eventos são gravados por
 * triggers no banco, o que traz três ganhos: uma consulta em vez de três,
 * registra quem fez a ação (`actor_id`), e o texto fica congelado no momento do
 * evento — continua correto mesmo que o cliente seja excluído ou o serviço mude
 * de nome depois.
 */
export async function listActivity(limit = 30) {
  const { data, error } = await supabase
    .from('activity_log')
    .select('id, action, description, entity_type, entity_id, created_at, actor:profiles!activity_log_actor_id_fkey(id,name,role)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
