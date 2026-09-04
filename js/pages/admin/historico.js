import { listActivity } from '../../services/activity.js?v=20260813j';
import { escapeHtml, emptyState, skeletonRows } from '../../utils/dom.js?v=20260813j';

/**
 * Aparência de cada tipo de evento gravado em `activity_log`.
 * A chave é a coluna `action` que os triggers do banco escrevem.
 */
const ACTION_META = {
  appointment_created: { icon: 'event', dot: 'dot-mut' },
  appointment_confirmed: { icon: 'event_available', dot: 'dot-acc' },
  appointment_completed: { icon: 'check_circle', dot: 'dot-ok' },
  appointment_cancelled: { icon: 'cancel', dot: 'dot-err' },
  client_created: { icon: 'person_add', dot: 'dot-acc' },
  review_created: { icon: 'star', dot: 'dot-acc' },
  review_replied: { icon: 'reply', dot: 'dot-mut' },
};
const FALLBACK_META = { icon: 'bolt', dot: 'dot-mut' };

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Quem fez a ação. `actor_id` é null quando o evento partiu do próprio sistema
 * (gatilho de banco sem sessão, tarefa agendada) — nesse caso "Sistema" é a
 * descrição honesta, não um nome inventado.
 */
function actorLabel(row) {
  if (!row.actor) return 'Sistema';
  return row.actor.role === 'admin' ? `${row.actor.name} (admin)` : row.actor.name;
}

/** Renderiza o Histórico (#atl-list) lendo a tabela activity_log. */
export async function renderAdminHistorico() {
  const el = document.getElementById('atl-list');
  if (!el) return;
  if (!el.children.length) el.innerHTML = skeletonRows(4, 'sk-row');

  let feed;
  try {
    feed = await listActivity(30);
  } catch (err) {
    el.innerHTML = emptyState('error', 'Não foi possível carregar o histórico', err.message || 'Tente novamente.');
    return;
  }

  el.classList.add('stagger');
  el.innerHTML = feed.length
    ? feed
        .map((h) => {
          const meta = ACTION_META[h.action] || FALLBACK_META;
          return `
    <div class="atl-item">
      <div class="atl-dot ${meta.dot}"><span class="ms">${meta.icon}</span></div>
      <div class="atl-act">${escapeHtml(h.description || h.action)}</div>
      <div class="atl-meta"><span><span class="ms">person</span>${escapeHtml(actorLabel(h))}</span><span><span class="ms">schedule</span>${formatDateTime(h.created_at)}</span></div>
    </div>`;
        })
        .join('')
    : emptyState('history', 'Nenhuma atividade ainda', 'Agendamentos, cadastros e avaliações aparecem aqui conforme acontecem.');
}

Object.assign(window, { renderAdminHistorico });
