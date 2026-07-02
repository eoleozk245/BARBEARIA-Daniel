import { listClientStats, deleteClient } from '../../services/profiles.js';
import { escapeHtml } from '../../utils/dom.js';

const SEGMENT_META = {
  vip: { cls: 'cbdg-vip', label: 'VIP' },
  novo: { cls: 'cbdg-new', label: 'Novo' },
  regular: { cls: 'cbdg-reg', label: 'Regular' },
};

let cachedClients = [];

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function formatDate(isoDate) {
  if (!isoDate) return null;
  return isoDate.split('-').reverse().join('/');
}

/** Renderiza a grid de clientes (#cli-grid) com dados reais + classificação calculada no banco. */
export async function renderAdminClients() {
  cachedClients = await listClientStats();

  const search = (document.getElementById('cli-s')?.value || '').toLowerCase();
  const segmentFilter = (document.getElementById('cli-b')?.value || '').toLowerCase();

  const filtered = cachedClients.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search) && !c.email.toLowerCase().includes(search)) return false;
    if (segmentFilter && c.segment !== segmentFilter) return false;
    return true;
  });

  const grid = document.getElementById('cli-grid');
  if (!grid) return;

  grid.innerHTML = filtered.length
    ? filtered
        .map((c) => {
          const seg = SEGMENT_META[c.segment] || SEGMENT_META.regular;
          const lastVisit = formatDate(c.last_visit_date);
          const clienteDesde = formatDate(c.created_at.slice(0, 10));
          return `
    <div class="acli" data-id="${c.client_id}">
      <div class="acli-top">
        <div class="acli-av">${initials(c.name)}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">
            <div class="acli-nm">${escapeHtml(c.name)}</div>
            <span class="cbdg ${seg.cls}">${seg.label}</span>
          </div>
          <div class="acli-em">${escapeHtml(c.email)}</div>
        </div>
      </div>
      <div class="acli-stats">
        <div class="acli-st"><div class="acli-stv">${c.completed_visits}</div><div class="acli-stl">Visitas</div></div>
        <div class="acli-st"><div class="acli-stv">${c.upcoming_count}</div><div class="acli-stl">Próximos</div></div>
        <div class="acli-st"><div class="acli-stv" style="font-size:12px">${clienteDesde}</div><div class="acli-stl">Cliente desde</div></div>
      </div>
      <div style="padding-top:12px;margin-top:2px;border-top:1px solid rgba(255,255,255,.05);display:flex;justify-content:space-between;align-items:center;gap:8px">
        <span style="font-size:11px;color:var(--mut)">Última visita: ${lastVisit || 'ainda nenhuma'}</span>
        <button class="abtn abtn-r" data-delete="${c.client_id}" style="font-size:11px;padding:5px 12px;border-radius:8px">Excluir</button>
      </div>
    </div>`;
        })
        .join('')
    : '<p style="font-size:13px;color:var(--mut);padding:20px 0">Nenhum cliente encontrado.</p>';

  grid.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => handleDeleteClient(btn.dataset.delete));
  });
}

async function handleDeleteClient(clientId) {
  const client = cachedClients.find((c) => c.client_id === clientId);
  const name = client?.name || 'este cliente';
  if (!confirm(`Excluir ${name} permanentemente? Isso remove o login e TODOS os dados relacionados (agendamentos, avaliações, notificações). Essa ação não pode ser desfeita.`)) {
    return;
  }
  try {
    await deleteClient(clientId);
    await renderAdminClients();
  } catch (err) {
    alert('Erro ao excluir cliente: ' + (err.message || 'tente novamente.'));
  }
}

Object.assign(window, { renderClis: renderAdminClients });
