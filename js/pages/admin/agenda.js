import { listAllAppointments, updateAppointmentStatus, subscribeAppointments, countAppointments } from '../../services/appointments.js?v=20260813j';
import { confirmAppointmentManually } from '../../services/loyalty.js?v=20260813j';
import { listBarbers } from '../../services/barbers.js?v=20260813j';
import { formatCurrency } from '../../utils/format.js?v=20260813j';
import { escapeHtml, showToast, emptyState, skeletonRows, skeletonTable } from '../../utils/dom.js?v=20260813j';
import { countUp } from '../../utils/anim.js?v=20260813j';
import { getAdminDashboardMetrics } from '../../services/metrics.js?v=20260813j';
import { setAdminMetrics } from '../../legacy.js?v=20260813j';

const STATUS_META = {
  scheduled: { cls: 'ast-pnd', label: 'Agendado', icon: 'schedule' },
  confirmed: { cls: 'ast-ok', label: 'Confirmado', icon: 'check_circle' },
  completed: { cls: 'ast-ok', label: 'Concluído', icon: 'check_circle' },
  cancelled: { cls: 'ast-cncl', label: 'Cancelado', icon: 'cancel' },
};

let cachedAppointments = [];
let barbersLoaded = false;
let highlightRowId = null; // agendamento recém-chegado pelo Realtime, a destacar no próximo render

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
  const tbodyEarly = document.getElementById('ag-tbody');
  if (tbodyEarly && !tbodyEarly.children.length) tbodyEarly.innerHTML = skeletonTable(6, 9);
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
      const isNew = a.id === highlightRowId;
      return `<tr class="${isNew ? 'row-new' : ''}">
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
          ${a.status !== 'cancelled' && a.status !== 'completed' ? `<button class="abtn abtn-o" data-complete="${a.id}" title="Use apenas se o QR Code não puder ser lido — não soma ponto de fidelidade">Concluir</button>` : ''}
          ${a.status !== 'cancelled' && a.status !== 'completed' ? `<button class="abtn abtn-r" data-cancel="${a.id}">Cancelar</button>` : ''}
        </div></td>
      </tr>`;
    })
    .join('');

  highlightRowId = null; // o destaque vale só para este desenho

  tbody.querySelectorAll('[data-confirm]').forEach((btn) => {
    btn.addEventListener('click', () => updateAppointmentStatus(btn.dataset.confirm, 'confirmed').catch((e) => showToast(e.message)));
  });
  tbody.querySelectorAll('[data-complete]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!confirm('Concluir manualmente este agendamento? Isso NÃO soma ponto de fidelidade — use apenas quando o QR Code não puder ser lido.')) return;
      confirmAppointmentManually(btn.dataset.complete).catch((e) => showToast(e.message));
    });
  });
  tbody.querySelectorAll('[data-cancel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!confirm('Cancelar este agendamento?')) return;
      updateAppointmentStatus(btn.dataset.cancel, 'cancelled').catch((e) => showToast(e.message));
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
  countUp(el, await countAppointments({ from, to }));
}

/**
 * Cartões financeiros e gráficos do Dashboard, com números reais.
 * Receita = atendimentos concluídos × preço do serviço. Não existe despesa nem
 * lucro líquido aqui porque o sistema não registra despesas em lugar nenhum.
 */
export async function renderFinanceKpis() {
  let m;
  try {
    m = await getAdminDashboardMetrics();
  } catch (err) {
    const trend = document.getElementById('kpi-receita-trend');
    if (trend) trend.innerHTML = '<span class="ms">error</span> não foi possível carregar';
    return;
  }

  const receita = Number(m.current_month_revenue) || 0;
  const anterior = Number(m.prev_month_revenue) || 0;
  const concluidos = Number(m.current_month_completed) || 0;

  countUp(document.getElementById('kpi-receita'), receita, { format: (n) => formatCurrency(n) });
  countUp(document.getElementById('kpi-ticket'), concluidos ? receita / concluidos : 0, {
    decimals: 2,
    format: (n) => formatCurrency(n),
  });
  countUp(document.getElementById('kpi-novos'), Number(m.new_clients_month) || 0);

  const lbl = document.getElementById('kpi-receita-lbl');
  if (lbl && m.month_start) {
    const mes = new Date(`${m.month_start}T00:00:00`).toLocaleDateString('pt-BR', { month: 'long' });
    lbl.textContent = `Receita — ${mes[0].toUpperCase()}${mes.slice(1)}`;
  }

  // A variação só faz sentido se houve mês anterior com movimento; sem isso,
  // qualquer porcentagem seria divisão por zero disfarçada.
  const trend = document.getElementById('kpi-receita-trend');
  if (trend) {
    if (!anterior) {
      trend.style.color = 'var(--mut)';
      trend.innerHTML = '<span class="ms">remove</span> sem mês anterior para comparar';
    } else {
      const pct = ((receita - anterior) / anterior) * 100;
      const subiu = pct >= 0;
      trend.style.color = '';
      trend.className = `akpi-trend ${subiu ? 'aup' : 'adown'}`;
      trend.innerHTML = `<span class="ms">${subiu ? 'arrow_upward' : 'arrow_downward'}</span> ${subiu ? '+' : ''}${pct.toFixed(1).replace('.', ',')}% vs. mês anterior`;
    }
  }

  setAdminMetrics(m); // redesenha os três gráficos
}

let unsubscribeAll = null;
/** Assina Realtime para todos os agendamentos: qualquer criação/cancelamento/confirmação atualiza a tabela sozinha. */
export function subscribeAdminAgenda() {
  if (unsubscribeAll) unsubscribeAll();
  unsubscribeAll = subscribeAppointments({
    scope: 'all',
    onChange: async (payload) => {
      // Guarda o id do agendamento que acabou de chegar para destacá-lo depois
      // de redesenhar — senão o barbeiro não percebe a novidade no meio da lista.
      if (payload?.eventType === 'INSERT' && payload.new?.id) highlightRowId = payload.new.id;
      await renderAdminAgenda();
      await renderAppointmentsKpi();
    },
  });
}

Object.assign(window, { renderAg: renderAdminAgenda });
