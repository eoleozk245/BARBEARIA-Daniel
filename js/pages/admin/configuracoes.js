import { listServices, createService, updateService, deleteService } from '../../services/services.js';
import { listBarbers, createBarber, updateBarber, deleteBarber } from '../../services/barbers.js';
import { formatCurrency } from '../../utils/format.js';
import { escapeHtml } from '../../utils/dom.js';

/** Renderiza a lista editável de serviços em Configurações → Serviços (dados reais). */
export async function renderCfgSvcReal() {
  const el = document.getElementById('cfg-svc-list');
  if (!el) return;
  const services = await listServices({ onlyActive: false });
  el.innerHTML = services
    .map(
      (s) => `
    <div class="asvc-row" data-id="${s.id}">
      <span class="asvc-n">${escapeHtml(s.name)}</span>
      <input class="asvc-inp" data-field="price" value="${s.price}" style="color:var(--acc)">
      <input class="asvc-inp" data-field="duration_minutes" value="${s.duration_minutes}" style="color:var(--mut)">
      <button class="abtn abtn-r" data-action="remove" style="padding:6px 10px;border-radius:8px;font-size:11px">Remover</button>
    </div>`
    )
    .join('');

  el.querySelectorAll('.asvc-row').forEach((row) => {
    const id = row.dataset.id;
    row.querySelectorAll('input[data-field]').forEach((input) => {
      input.addEventListener('change', async () => {
        const field = input.dataset.field;
        const value = field === 'price' ? parseFloat(input.value) : parseInt(input.value, 10);
        try {
          await updateService(id, { [field]: value });
        } catch (err) {
          alert('Erro ao salvar serviço: ' + err.message);
        }
      });
    });
    row.querySelector('[data-action="remove"]').addEventListener('click', async () => {
      if (!confirm('Remover este serviço?')) return;
      try {
        await deleteService(id);
        renderCfgSvcReal();
      } catch (err) {
        alert('Erro ao remover serviço: ' + err.message);
      }
    });
  });
}

export async function addNewService() {
  const name = prompt('Nome do novo serviço:');
  if (!name) return;
  try {
    await createService({ name, description: '', price: 0, duration_minutes: 30, active: true });
    renderCfgSvcReal();
  } catch (err) {
    alert('Erro ao criar serviço: ' + err.message);
  }
}

/** Renderiza a lista editável de barbeiros em Configurações → Equipe (dados reais). */
export async function renderCfgEqReal() {
  const el = document.getElementById('cfg-eq-list');
  if (!el) return;
  const barbers = await listBarbers({ onlyActive: false });
  el.innerHTML = barbers
    .map((b) => {
      const initials = b.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
      return `
    <div class="asvc-row" data-id="${b.id}">
      <div style="width:34px;height:34px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,rgba(var(--ar),.2),rgba(var(--ar),.06));border:1px solid rgba(var(--ar),.2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:var(--acc)">${initials}</div>
      <span class="asvc-n">${escapeHtml(b.name)}</span>
      <span style="font-size:11px;color:var(--mut)">${escapeHtml(b.title || '')}</span>
      <select class="afsel" data-field="active" style="width:110px;padding:6px 10px;border-radius:8px;font-size:11px">
        <option value="true" ${b.active ? 'selected' : ''}>Ativo</option>
        <option value="false" ${!b.active ? 'selected' : ''}>Inativo</option>
      </select>
      <button class="abtn abtn-r" data-action="remove" style="padding:6px 10px;border-radius:8px;font-size:11px">Remover</button>
    </div>`;
    })
    .join('');

  el.querySelectorAll('.asvc-row').forEach((row) => {
    const id = row.dataset.id;
    row.querySelector('select[data-field="active"]').addEventListener('change', async (e) => {
      try {
        await updateBarber(id, { active: e.target.value === 'true' });
      } catch (err) {
        alert('Erro ao salvar barbeiro: ' + err.message);
      }
    });
    row.querySelector('[data-action="remove"]').addEventListener('click', async () => {
      if (!confirm('Remover este barbeiro?')) return;
      try {
        await deleteBarber(id);
        renderCfgEqReal();
      } catch (err) {
        alert('Erro ao remover barbeiro: ' + err.message);
      }
    });
  });
}

export async function addNewBarber() {
  const name = prompt('Nome do novo barbeiro:');
  if (!name) return;
  try {
    await createBarber({ name, active: true });
    renderCfgEqReal();
  } catch (err) {
    alert('Erro ao criar barbeiro: ' + err.message);
  }
}

/** Aplica o nome do admin logado na sidebar e no cabeçalho do dashboard. */
export function applyAdminProfileToUI(profile) {
  const initials = profile.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const firstName = profile.name.split(' ')[0];
  const sbav = document.getElementById('a-sbav');
  const sbun = document.getElementById('a-sbun');
  const dname = document.getElementById('a-dname');
  if (sbav) sbav.textContent = initials;
  if (sbun) sbun.textContent = profile.name;
  if (dname) dname.textContent = firstName;
}
