import { listClientStats, deleteClient, createClientAccount, updateProfile } from '../../services/profiles.js';
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
        <div style="display:flex;gap:6px">
          <button class="abtn abtn-o" data-edit="${c.client_id}" style="font-size:11px;padding:5px 12px;border-radius:8px">Editar</button>
          <button class="abtn abtn-r" data-delete="${c.client_id}" style="font-size:11px;padding:5px 12px;border-radius:8px">Excluir</button>
        </div>
      </div>
    </div>`;
        })
        .join('')
    : '<p style="font-size:13px;color:var(--mut);padding:20px 0">Nenhum cliente encontrado.</p>';

  grid.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => handleDeleteClient(btn.dataset.delete));
  });
  grid.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openClientModal(btn.dataset.edit));
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

/* ══ Modal Novo Cliente / Editar Cliente ══ */

let editingClientId = null; // null = modo criação

function modalErr(message) {
  const el = document.getElementById('cm-err');
  if (!el) return;
  el.textContent = message;
  el.style.display = message ? 'block' : 'none';
}

/** Abre o modal — sem id = criar; com id = editar (nome/telefone; e-mail travado). */
export function openClientModal(clientId = null) {
  editingClientId = clientId || null;
  const overlay = document.getElementById('cli-modal');
  if (!overlay) return;

  const title = document.getElementById('cli-modal-title');
  const nameInp = document.getElementById('cm-name');
  const emailInp = document.getElementById('cm-email');
  const phoneInp = document.getElementById('cm-phone');
  const pwGroup = document.getElementById('cm-pw-group');
  const pwInp = document.getElementById('cm-password');
  modalErr('');
  pwInp.value = '';

  if (editingClientId) {
    const client = cachedClients.find((c) => c.client_id === editingClientId);
    if (!client) return;
    title.textContent = 'Editar Cliente';
    nameInp.value = client.name;
    emailInp.value = client.email;
    emailInp.disabled = true; // trocar e-mail exige alterar o login (fase futura)
    phoneInp.value = client.phone || '';
    pwGroup.style.display = 'none';
  } else {
    title.textContent = 'Novo Cliente';
    nameInp.value = '';
    emailInp.value = '';
    emailInp.disabled = false;
    phoneInp.value = '';
    pwGroup.style.display = '';
  }

  overlay.style.display = 'flex';
  nameInp.focus();
}

export function closeClientModal() {
  const overlay = document.getElementById('cli-modal');
  if (overlay) overlay.style.display = 'none';
  editingClientId = null;
}

export async function saveClientModal() {
  modalErr('');
  const name = document.getElementById('cm-name')?.value.trim();
  const email = document.getElementById('cm-email')?.value.trim();
  const phone = document.getElementById('cm-phone')?.value.trim();
  const password = document.getElementById('cm-password')?.value;

  if (!name) return modalErr('Informe o nome do cliente.');
  if (!editingClientId && !email) return modalErr('Informe o e-mail do cliente.');
  if (!editingClientId && password && password.length < 8) return modalErr('A senha deve ter no mínimo 8 caracteres.');

  const saveBtn = document.getElementById('cm-save');
  if (saveBtn) saveBtn.disabled = true;
  try {
    if (editingClientId) {
      await updateProfile(editingClientId, { name, phone: phone || null });
    } else {
      await createClientAccount({ name, email, phone, password });
    }
    closeClientModal();
    await renderAdminClients();
  } catch (err) {
    modalErr(err.message || 'Não foi possível salvar. Tente novamente.');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

Object.assign(window, { renderClis: renderAdminClients, openClientModal, closeClientModal, saveClientModal });
