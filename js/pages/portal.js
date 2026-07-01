import { listServices } from '../services/services.js';
import { listMyAppointments, cancelAppointment, subscribeAppointments } from '../services/appointments.js';
import { formatCurrency, formatDuration } from '../utils/format.js';
import { escapeHtml } from '../utils/dom.js';

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const STATUS_BADGE = {
  scheduled: { cls: 'pbdgpnd', icon: 'schedule', label: 'Agendado' },
  confirmed: { cls: 'pbdgok', icon: 'check_circle', label: 'Confirmado' },
  completed: { cls: 'pbdgdn', icon: 'check_circle', label: 'Concluído' },
  cancelled: { cls: 'pbdgdn', icon: 'cancel', label: 'Cancelado', style: 'color:var(--err);border-color:rgba(242,139,130,.25)' },
};

function apptCard(a, { showCancel }) {
  const [year, month, day] = a.appointment_date.split('-');
  const badge = STATUS_BADGE[a.status];
  const initials = a.barber.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return `
    <div class="appt" data-id="${a.id}">
      <div class="apptdt"><div class="apptmon">${MONTHS_PT[Number(month) - 1]}</div><div class="apptday">${day}</div><div class="appttm">${a.start_time.slice(0, 5)}</div></div>
      <div><div class="appth">${escapeHtml(a.service.name)} <span class="pbdg ${badge.cls}" style="${badge.style || ''}"><span class="ms">${badge.icon}</span> ${badge.label}</span></div>
        <div class="apptbar"><div class="abav">${initials}</div> ${escapeHtml(a.barber.name)} <span style="color:var(--dim)">·</span><span class="apptp">${formatCurrency(a.service.price)}</span></div></div>
      <div class="apptacts">${showCancel ? `<button class="btncncl" data-cancel="${a.id}">Cancelar</button>` : ''}</div>
    </div>`;
}

/** Renderiza "Próximos"/"Histórico" (#ptcprox/#ptchist) com agendamentos reais do cliente logado. */
export async function renderClientAppointments() {
  const prox = document.getElementById('ptcprox');
  const hist = document.getElementById('ptchist');
  if (!prox || !hist) return;
  const appts = await listMyAppointments();
  const upcoming = appts.filter((a) => a.status === 'scheduled' || a.status === 'confirmed');
  const past = appts.filter((a) => a.status === 'completed' || a.status === 'cancelled');

  prox.innerHTML = upcoming.length
    ? upcoming.map((a) => apptCard(a, { showCancel: true })).join('')
    : '<p style="font-size:13px;color:var(--mut);padding:20px 0">Nenhum agendamento futuro.</p>';
  hist.innerHTML = past.length
    ? past.map((a) => apptCard(a, { showCancel: false })).join('')
    : '<p style="font-size:13px;color:var(--mut);padding:20px 0">Nenhum histórico ainda.</p>';

  prox.querySelectorAll('[data-cancel]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Cancelar este agendamento?')) return;
      try {
        await cancelAppointment(btn.dataset.cancel);
        await renderClientAppointments();
        await renderMiniCalendar();
      } catch (err) {
        alert(err.message || 'Não foi possível cancelar.');
      }
    });
  });
}

/** Mini calendário do portal (#mcgrid) marcando dias com agendamento real do cliente. */
export async function renderMiniCalendar() {
  const el = document.getElementById('mcgrid');
  if (!el) return;
  const appts = await listMyAppointments();
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const firstWeekday = new Date(y, m, 1).getDay();
  const totalDays = new Date(y, m + 1, 0).getDate();
  const activeDays = new Set(
    appts
      .filter((a) => a.status === 'scheduled' || a.status === 'confirmed')
      .map((a) => a.appointment_date)
      .filter((d) => d.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`))
      .map((d) => Number(d.split('-')[2]))
  );
  const dayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  let html = dayLabels.map((d) => `<div class="mcdn">${d}</div>`).join('');
  for (let i = 0; i < firstWeekday; i++) html += `<div class="mcd empty"></div>`;
  for (let d = 1; d <= totalDays; d++) {
    let cls = 'mcd';
    if (d === today.getDate()) cls += ' today';
    if (activeDays.has(d)) cls += ' ha';
    html += `<div class="${cls}">${d}</div>`;
  }
  el.innerHTML = html;
}

let unsubscribeMine = null;
/** Assina Realtime para o cliente logado: qualquer mudança (admin confirma/cancela, etc) re-renderiza sozinho. */
export function subscribeClientAppointments(clientId) {
  if (unsubscribeMine) unsubscribeMine();
  unsubscribeMine = subscribeAppointments({
    scope: 'own',
    clientId,
    onChange: () => {
      renderClientAppointments();
      renderMiniCalendar();
    },
  });
}

/** Renderiza a grid de serviços do portal (#psrvgrid) — mesma tabela `services` do site público. */
export async function renderPortalServices() {
  const el = document.getElementById('psrvgrid');
  if (!el) return;
  const services = await listServices();
  el.innerHTML = services
    .map(
      (s) => `
    <div class="psrv">
      <div class="psrvico"><i class="ti ${escapeHtml(s.icon || 'ti-cut')}"></i></div>
      <div class="psrvtop"><span class="psrvnm">${escapeHtml(s.name)}</span><span class="psrvpr">${formatCurrency(s.price)}</span></div>
      <p class="psrvds">${escapeHtml(s.description)}</p>
      <div class="psrvdur"><span class="ms">schedule</span>${formatDuration(s.duration_minutes)}</div>
      <button class="psrvbook">Agendar este serviço</button>
    </div>`
    )
    .join('');
}

/** Atualiza nome/avatar do cliente logado na sidebar e no dashboard do portal. */
export function applyClientProfileToUI(profile) {
  const initials = profile.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const firstName = profile.name.split(' ')[0];

  const sbav = document.getElementById('p-sbav');
  const sbun = document.getElementById('p-sbun');
  const dname = document.getElementById('p-dname');
  if (sbav) sbav.textContent = initials;
  if (sbun) sbun.textContent = profile.name;
  if (dname) dname.textContent = firstName;
}
