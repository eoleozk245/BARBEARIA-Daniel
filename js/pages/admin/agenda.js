import { listAllAppointments, updateAppointmentStatus, subscribeAppointments, countAppointments } from '../../services/appointments.js';
import { listBarbers } from '../../services/barbers.js';
import { formatCurrency } from '../../utils/format.js';
import { escapeHtml } from '../../utils/dom.js';

const STATUS_META = {
  scheduled: { cls: 'ast-pnd', label: 'Agendado', icon: 'schedule' },
  confirmed: { cls: 'ast-ok', label: 'Confirmado', icon: 'check_circle' },
  completed: { cls: 'ast-ok', label: 'Concluído', icon: 'check_circle' },
  cancelled: { cls: 'ast-cncl', label: 'Cancelado', icon: 'cancel' },
};

let cachedAppointments = [];
let barbersLoaded = false;

async function populateFilters() {
  if (barbersLoaded) return;
  const barbers = await listBarbers();
  const sel = document.getElementById('ag-bar');
  if (sel) {
    sel.innerHTML =
      '<option value="">Todos os barbeiros</option>' +
      barbers.map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`).join('');
  }
  barbersLoaded = true;
}

function populateDateFilter() {
  const sel = document.getElementById('ag-dt');
  if (!sel) return;
  const current = sel.value;
  const dates = [...new Set(cachedAppointments.map((a) => a.appointment_date))].sort();
  sel.innerHTML =
    '<option value="">Todas as datas</option>' +
    dates.map((d) => `<option value="${d}" ${d === current ? 'selected' : ''}>${d.split('-').reverse().join('/')}</option>`).join('');
}

/** Renderiza a tabela de Agenda (#ag-tbody) com agendamentos reais, aplicando os filtros da UI. */
export async function renderAdminAgenda() {
  await populateFilters();
  cachedAppointments = await listAllAppointments();
  populateDateFilter();

  const search = (document.getElementById('ag-search')?.value || '').toLowerCase();
  const barberId = document.getElementById('ag-bar')?.value || '';
  const status = document.getElementById('ag-st')?.value || '';
  const date = document.getElementById('ag-dt')?.value || '';

  const filtered = cachedAppointments.filter((a) => {
    if (search && !a.client.name.toLowerCase().includes(search) && !a.service.name.toLowerCase().includes(search)) return false;
    if (barberId && a.barber.id !== barberId) return false;
    if (status && a.status !== status) return false;
    if (date && a.appointment_date !== date) return false;
    return true;
  });

  const tbody = document.getElementById('ag-tbody');
  if (!tbody) return;
  tbody.innerHTML = filtered
    .map((a) => {
      const s = STATUS_META[a.status];
      return `<tr>
        <td style="color:var(--mut);font-size:12px">#${a.id.slice(0, 8)}</td>
        <td><strong>${escapeHtml(a.client.name)}</strong></td>
        <td>${escapeHtml(a.service.name)}</td>
        <td style="color:var(--mut)">${escapeHtml(a.barber.name)}</td>
        <td style="color:var(--mut)">${a.appointment_date.split('-').reverse().join('/')}</td>
        <td>${a.start_time.slice(0, 5)}</td>
        <td style="font-weight:700;color:var(--acc)">${formatCurrency(a.service.price)}</td>
        <td><span class="ast ${s.cls}"><span class="ms">${s.icon}</span>${s.label}</span></td>
        <td><div class="aact">
          ${a.status === 'scheduled' ? `<button class="abtn abtn-g" data-confirm="${a.id}">Confirmar</button>` : ''}
          ${a.status !== 'cancelled' && a.status !== 'completed' ? `<button class="abtn abtn-r" data-cancel="${a.id}">Cancelar</button>` : ''}
        </div></td>
      </tr>`;
    })
    .join('');

  tbody.querySelectorAll('[data-confirm]').forEach((btn) => {
    btn.addEventListener('click', () => updateAppointmentStatus(btn.dataset.confirm, 'confirmed').catch((e) => alert(e.message)));
  });
  tbody.querySelectorAll('[data-cancel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!confirm('Cancelar este agendamento?')) return;
      updateAppointmentStatus(btn.dataset.cancel, 'cancelled').catch((e) => alert(e.message));
    });
  });
}

/** Atualiza o card "Atendimentos este mês" do Dashboard com contagem real. */
export async function renderAppointmentsKpi() {
  const el = document.getElementById('kpi-appts-count');
  if (!el) return;
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
  el.textContent = await countAppointments({ from, to });
}

let unsubscribeAll = null;
/** Assina Realtime para todos os agendamentos: qualquer criação/cancelamento/confirmação atualiza a tabela sozinha. */
export function subscribeAdminAgenda() {
  if (unsubscribeAll) unsubscribeAll();
  unsubscribeAll = subscribeAppointments({ scope: 'all', onChange: () => renderAdminAgenda() });
}

Object.assign(window, { renderAg: renderAdminAgenda });
