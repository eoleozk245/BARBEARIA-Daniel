import { listAllAppointments } from '../../services/appointments.js';
import { listClients } from '../../services/profiles.js';
import { listAllReviews } from '../../services/reviews.js';
import { escapeHtml } from '../../utils/dom.js';

const STATUS_META = {
  completed: { action: 'concluído', icon: 'check_circle', dot: 'dot-ok' },
  cancelled: { action: 'cancelado', icon: 'cancel', dot: 'dot-err' },
  confirmed: { action: 'confirmado', icon: 'event_available', dot: 'dot-acc' },
  scheduled: { action: 'agendado', icon: 'event', dot: 'dot-mut' },
};

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Monta um feed de atividade real combinando agendamentos, novos clientes e
 * avaliações — não existe uma tabela de activity_log dedicada no banco, então
 * este histórico é derivado dos eventos que já existem, sem nenhum dado fictício.
 */
async function buildActivityFeed() {
  const [appts, clients, reviews] = await Promise.all([listAllAppointments(), listClients(), listAllReviews()]);

  const events = [];

  appts.forEach((a) => {
    const meta = STATUS_META[a.status];
    if (!meta) return;
    events.push({
      time: a.updated_at,
      icon: meta.icon,
      dot: meta.dot,
      action: `Agendamento ${meta.action} — ${a.client?.name || 'Cliente'} / ${a.service?.name || 'Serviço'}`,
      user: 'Sistema',
    });
  });

  clients.forEach((c) => {
    events.push({
      time: c.created_at,
      icon: 'person_add',
      dot: 'dot-acc',
      action: `Novo cliente cadastrado — ${c.name}`,
      user: 'Sistema',
    });
  });

  reviews.forEach((r) => {
    const clientName = r.client?.name || 'Cliente';
    events.push({
      time: r.created_at,
      icon: 'star',
      dot: 'dot-acc',
      action: `Nova avaliação recebida — ${clientName} (${r.rating}★)`,
      user: 'Sistema',
    });
    if (r.replied_at) {
      events.push({
        time: r.replied_at,
        icon: 'reply',
        dot: 'dot-mut',
        action: `Resposta enviada à avaliação de ${clientName}`,
        user: 'Daniel',
      });
    }
  });

  return events.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 20);
}

/** Renderiza o Histórico (#atl-list) com atividade real do sistema. */
export async function renderAdminHistorico() {
  const el = document.getElementById('atl-list');
  if (!el) return;
  const feed = await buildActivityFeed();

  el.innerHTML = feed.length
    ? feed
        .map(
          (h) => `
    <div class="atl-item">
      <div class="atl-dot ${h.dot}"><span class="ms">${h.icon}</span></div>
      <div class="atl-act">${escapeHtml(h.action)}</div>
      <div class="atl-meta"><span><span class="ms">person</span>${h.user}</span><span><span class="ms">schedule</span>${formatDateTime(h.time)}</span></div>
    </div>`
        )
        .join('')
    : '<p style="font-size:13px;color:var(--mut);padding:20px 0">Nenhuma atividade registrada ainda.</p>';
}

Object.assign(window, { renderAdminHistorico });
