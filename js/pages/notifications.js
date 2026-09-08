import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeNotifications,
} from '../services/notifications.js?v=20260813k';
import { escapeHtml, emptyState, showToast } from '../utils/dom.js?v=20260813k';

/**
 * Sininho de notificações — o mesmo componente serve ao portal do cliente e ao
 * painel do admin, por isso os ids dos elementos são recebidos por parâmetro.
 */

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return 'ontem';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function setupNotifications({ prefix, userId }) {
  const btn = document.getElementById(`${prefix}-notif-btn`);
  const badge = document.getElementById(`${prefix}-notif-badge`);
  const panel = document.getElementById(`${prefix}-notif-panel`);
  const list = document.getElementById(`${prefix}-notif-list`);
  const allBtn = document.getElementById(`${prefix}-notif-all`);
  if (!btn || !panel || !list) return () => {};

  let items = [];

  function paint() {
    const unread = items.filter((n) => !n.read).length;
    if (badge) {
      badge.hidden = unread === 0;
      badge.textContent = unread > 9 ? '9+' : String(unread);
    }

    list.innerHTML = items.length
      ? items
          .map(
            (n) => `
        <div class="notif-item ${n.read ? '' : 'unread'}" data-notif="${n.id}">
          <span class="notif-dot"></span>
          <div class="notif-msg">${escapeHtml(n.message)}<div class="notif-time">${timeAgo(n.created_at)}</div></div>
        </div>`
          )
          .join('')
      : emptyState('notifications_off', 'Nenhuma notificação', 'Avisos sobre seus agendamentos aparecem aqui.');

    list.querySelectorAll('[data-notif]').forEach((el) => {
      el.addEventListener('click', async (e) => {
        // Sem isto o clique borbulha até o listener de "clicou fora" e fecha o
        // painel: paint() já removeu este elemento do DOM, então o teste
        // panel.contains(alvo) de lá dá falso e o painel some sozinho.
        e.stopPropagation();
        const n = items.find((x) => x.id === el.dataset.notif);
        if (!n || n.read) return;
        n.read = true; // resposta imediata; se o servidor recusar, recarregamos
        paint();
        try {
          await markNotificationRead(n.id);
        } catch {
          await refresh();
        }
      });
    });
  }

  async function refresh() {
    try {
      items = await listMyNotifications();
      paint();
    } catch {
      /* notificação é secundária: falhar aqui não pode atrapalhar o resto da tela */
    }
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = panel.hidden;
    panel.hidden = !opening;
    btn.setAttribute('aria-expanded', String(opening));
    if (opening) refresh();
  });

  // Fecha ao clicar fora ou apertar Esc — comportamento esperado de um popover.
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) panel.hidden = true;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) panel.hidden = true;
  });

  allBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    items.forEach((n) => { n.read = true; });
    paint();
    try {
      await markAllNotificationsRead();
    } catch (err) {
      showToast('Não foi possível marcar como lidas.');
      await refresh();
    }
  });

  refresh();

  const unsubscribe = subscribeNotifications({
    userId,
    onChange: async () => {
      await refresh();
      // Sacode o sino só quando o painel está fechado: com ele aberto o usuário
      // já está olhando a lista e a animação seria ruído.
      if (panel.hidden) {
        btn.classList.remove('ring');
        void btn.offsetWidth; // reinicia a animação se chegarem duas seguidas
        btn.classList.add('ring');
      }
    },
  });

  return unsubscribe;
}
