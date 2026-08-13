import { listAllReviews, replyToReview } from '../../services/reviews.js?v=20260813a';
import { escapeHtml } from '../../utils/dom.js?v=20260813a';

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/** Renderiza a aba Feedbacks (#fb-list) com avaliações reais da tabela `reviews`. */
export async function renderAdminFeedbacks() {
  const el = document.getElementById('fb-list');
  if (!el) return;
  const reviews = await listAllReviews();

  el.innerHTML = reviews.length
    ? reviews
        .map((r) => {
          const clientName = r.client?.name || 'Cliente removido';
          const barberName = r.barber?.name || '—';
          const replied = !!r.replied_at;
          return `
    <div class="afb-card" data-id="${r.id}">
      <div class="afb-top">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="afb-av">${initials(clientName)}</div>
          <div><div class="afb-nm">${escapeHtml(clientName)}</div><div class="afb-srv">${escapeHtml(barberName)} · ${formatDate(r.created_at)}</div></div>
        </div>
        <div style="text-align:right">
          <div style="color:var(--acc);font-size:13px;letter-spacing:2px">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
          ${replied ? '<div class="afb-replied"><span class="ms">check_circle</span>Respondido</div>' : ''}
        </div>
      </div>
      <div class="afb-txt">${escapeHtml(r.comment || '')}</div>
      ${
        replied
          ? `<div style="font-size:12px;color:var(--mut);padding:8px 12px;background:rgba(255,255,255,.02);border-radius:8px;border:1px solid rgba(255,255,255,.06)">✓ ${escapeHtml(r.admin_reply)}</div>`
          : `<textarea class="afb-resp" rows="2" placeholder="Escreva uma resposta pública..." data-reply-input="${r.id}"></textarea>
             <button class="abtn abtn-g" style="padding:8px 18px;border-radius:999px;font-size:12px;display:inline-flex;align-items:center;gap:6px" data-reply-btn="${r.id}"><span class="ms" style="font-size:15px">reply</span>Responder</button>`
      }
    </div>`;
        })
        .join('')
    : '<p style="font-size:13px;color:var(--mut);padding:20px 0">Nenhuma avaliação registrada ainda.</p>';

  el.querySelectorAll('[data-reply-btn]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.replyBtn;
      const input = el.querySelector(`[data-reply-input="${id}"]`);
      const text = input?.value.trim();
      if (!text) return;
      try {
        await replyToReview(id, text);
        await renderAdminFeedbacks();
      } catch (err) {
        alert(err.message || 'Não foi possível enviar a resposta.');
      }
    });
  });
}

Object.assign(window, { renderAdminFeedbacks });
