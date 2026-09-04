import { supabase } from '../supabaseClient.js?v=20260813j';

/**
 * Métricas reais do dashboard do admin.
 *
 * Tudo vem de atendimentos CONCLUÍDOS × preço do serviço — não há registro de
 * despesas em lugar nenhum do sistema, então não existe "despesa" nem "lucro
 * líquido" aqui: seriam números inventados. Se um dia a barbearia passar a
 * lançar pagamentos (tabela `payments`, hoje vazia), basta trocar a origem do
 * valor dentro de `admin_dashboard_metrics()` no banco.
 */
export async function getAdminDashboardMetrics() {
  const { data, error } = await supabase.rpc('admin_dashboard_metrics');
  if (error) throw error;
  return data;
}
