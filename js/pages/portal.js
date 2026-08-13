import { listServices } from '../services/services.js';
import { listMyAppointments, cancelAppointment, subscribeAppointments } from '../services/appointments.js';
import { getMyLoyaltyStatus, getQrUnlockMinutes } from '../services/loyalty.js';
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
  const showQr = a.status === 'scheduled' || a.status === 'confirmed';
  return `
    <div class="appt" data-id="${a.id}">
      <div class="apptdt"><div class="apptmon">${MONTHS_PT[Number(month) - 1]}</div><div class="apptday">${day}</div><div class="appttm">${a.start_time.slice(0, 5)}</div></div>
      <div><div class="appth">${escapeHtml(a.service.name)} <span class="pbdg ${badge.cls}" style="${badge.style || ''}"><span class="ms">${badge.icon}</span> ${badge.label}</span></div>
        <div class="apptbar"><div class="abav">${initials}</div> ${escapeHtml(a.barber.name)} <span style="color:var(--dim)">·</span><span class="apptp">${formatCurrency(a.service.price)}</span></div></div>
      <div class="apptacts">
        ${showQr ? `<button class="btnalt" data-qr="${a.id}"><span class="ms" style="font-size:15px">qr_code_2</span> Ver QR Code</button>` : ''}
        ${showCancel ? `<button class="btncncl" data-cancel="${a.id}">Cancelar</button>` : ''}
      </div>
    </div>`;
}

let cachedAppts = [];
let qrUnlockMinutes = 10;
let qrUnlockMinutesLoaded = false;
let currentProfile = null;

/** Renderiza "Próximos"/"Histórico" (#ptcprox/#ptchist) com agendamentos reais do cliente logado. */
export async function renderClientAppointments() {
  const prox = document.getElementById('ptcprox');
  const hist = document.getElementById('ptchist');
  if (!prox || !hist) return;
  if (!qrUnlockMinutesLoaded) {
    qrUnlockMinutes = await getQrUnlockMinutes();
    qrUnlockMinutesLoaded = true;
  }
  cachedAppts = await listMyAppointments();
  const upcoming = cachedAppts.filter((a) => a.status === 'scheduled' || a.status === 'confirmed');
  const past = cachedAppts.filter((a) => a.status === 'completed' || a.status === 'cancelled');

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
  document.querySelectorAll('[data-qr]').forEach((btn) => {
    btn.addEventListener('click', () => openQrModal(btn.dataset.qr));
  });
}

function qrUnlockAt(a) {
  const unlockAt = new Date(`${a.appointment_date}T${a.start_time}`);
  unlockAt.setMinutes(unlockAt.getMinutes() - qrUnlockMinutes);
  return unlockAt;
}

function qrIsAvailable(a) {
  return new Date() >= qrUnlockAt(a);
}

/** Abre o modal do QR Code do agendamento (gera o QR se dentro da janela de liberação, senão avisa quando libera). */
export function openQrModal(appointmentId) {
  const a = cachedAppts.find((x) => x.id === appointmentId);
  const overlay = document.getElementById('qr-modal');
  if (!a || !overlay) return;

  const info = document.getElementById('qr-modal-info');
  const wrap = document.getElementById('qr-modal-canvas-wrap');
  const msg = document.getElementById('qr-modal-msg');
  const codeWrap = document.getElementById('qr-modal-code-wrap');
  const codeEl = document.getElementById('qr-modal-code');
  if (info) {
    info.textContent = `${a.service.name} · ${a.barber.name} · ${a.appointment_date.split('-').reverse().join('/')} às ${a.start_time.slice(0, 5)}`;
  }
  if (wrap) wrap.innerHTML = '';
  if (codeWrap) codeWrap.style.display = 'none';

  if (qrIsAvailable(a)) {
    if (wrap && window.QRCode) {
      new window.QRCode(wrap, {
        text: a.qr_token,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.M,
      });
    }
    if (codeEl) codeEl.textContent = a.qr_token;
    if (codeWrap) codeWrap.style.display = 'block';
    if (msg) msg.textContent = 'Mostre este QR Code ao barbeiro no momento do atendimento.';
  } else {
    const unlockAt = qrUnlockAt(a);
    const label = unlockAt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    if (msg) msg.textContent = `Este QR Code ainda não está disponível. Ele será liberado em ${label}.`;
  }

  overlay.style.display = 'flex';
}

export function closeQrModal() {
  const overlay = document.getElementById('qr-modal');
  if (overlay) overlay.style.display = 'none';
}

/**
 * Segmento do cliente (novo/vip/regular) — mesma regra usada em `vw_client_stats`
 * (cadastro há ≤30 dias → novo; ≥40 cortes concluídos → vip; senão regular).
 * Mantenha as duas em sincronia se o critério mudar.
 */
function computeSegmentBadge(profile, completedCount) {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const isNew = Date.now() - new Date(profile.created_at).getTime() <= THIRTY_DAYS_MS;
  if (isNew) return { label: 'Novo', cls: 'pbdgok' };
  if (completedCount >= 40) return { label: 'VIP', cls: 'pbdgvip' };
  return { label: 'Regular', cls: 'pbdgdn' };
}

function nextUpcomingAppointment(appts) {
  return appts
    .filter((a) => a.status === 'scheduled' || a.status === 'confirmed')
    .sort((a, b) => (a.appointment_date + a.start_time).localeCompare(b.appointment_date + b.start_time))[0];
}

/** Preenche as estatísticas reais do dashboard (cortes, próximo agendamento) — sem dado fictício. */
export function renderClientDashboardExtras() {
  const completedCount = cachedAppts.filter((a) => a.status === 'completed').length;
  const cortesEl = document.getElementById('dst-cortes');
  if (cortesEl) cortesEl.textContent = String(completedCount);

  const nxtWrap = document.getElementById('nxtc-wrap');
  if (!nxtWrap) return;
  const next = nextUpcomingAppointment(cachedAppts);
  if (!next) {
    nxtWrap.innerHTML = `
      <div class="nxttag">Próximo agendamento</div>
      <p style="font-size:13px;color:var(--mut);margin-top:10px">Você ainda não possui nenhum agendamento.</p>`;
    return;
  }
  const [, month, day] = next.appointment_date.split('-');
  const monthName = new Date(next.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long' });
  nxtWrap.innerHTML = `
    <div class="nxttag">Próximo agendamento</div>
    <div class="ndb"><div class="ndbm">${monthName}</div><div class="ndbd">${day}</div><div class="ndbt">${next.start_time.slice(0, 5)}</div></div>
    <div class="nxttit">${escapeHtml(next.service.name)}</div>
    <div class="nxtmeta">
      <div class="nxtrow"><span class="ms">person</span> ${escapeHtml(next.barber.name)}</div>
      <div class="nxtrow"><span class="ms">payments</span> ${formatCurrency(next.service.price)}</div>
      <div class="nxtrow"><span class="ms">schedule</span> ~${formatDuration(next.service.duration_minutes)}</div>
    </div>
    <div class="nxtacts">
      <button class="pbtn pbtno pbtnsm" data-qr="${next.id}"><span class="ms" style="font-size:15px">qr_code_2</span> Ver QR Code</button>
    </div>`;
  nxtWrap.querySelectorAll('[data-qr]').forEach((btn) => {
    btn.addEventListener('click', () => openQrModal(btn.dataset.qr));
  });
}

/** Preenche o cabeçalho e o "Resumo da conta" do Meu Perfil com dados reais — sem exemplo fictício. */
export function renderClientProfileExtras() {
  const profile = currentProfile;
  if (!profile) return;
  const completedCount = cachedAppts.filter((a) => a.status === 'completed').length;
  const segment = computeSegmentBadge(profile, completedCount);
  const initials = profile.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const memberSince = new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const next = nextUpcomingAppointment(cachedAppts);

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
  };

  setText('pf-av', initials);
  setText('pf-name', profile.name);
  const badge = document.getElementById('pf-badge');
  if (badge) {
    badge.className = `pbdg ${segment.cls}`;
    badge.textContent = segment.label;
  }
  setText('pf-sub', `Membro desde ${memberSince} · ${completedCount} corte${completedCount === 1 ? '' : 's'} realizado${completedCount === 1 ? '' : 's'}`);

  setValue('pf-inp-name', profile.name);
  setValue('pf-inp-email', profile.email);
  setValue('pf-inp-phone', profile.phone);
  setValue('pf-inp-cpf', profile.cpf);
  setValue('pf-inp-city', profile.city);
  setValue('pf-inp-birth', profile.birthdate ? new Date(profile.birthdate + 'T00:00:00').toLocaleDateString('pt-BR') : '');

  setText('sum-cortes', String(completedCount));
  setText('sum-favorito', 'Nenhum');
  setText('sum-proximo', next ? `${next.appointment_date.split('-')[2]} ${MONTHS_PT[Number(next.appointment_date.split('-')[1]) - 1]}` : '—');
  const sumStatus = document.getElementById('sum-status');
  if (sumStatus) sumStatus.innerHTML = `<span class="pbdg ${segment.cls}">${segment.label}</span>`;
}

/** Preenche todos os widgets de fidelidade (.loy) da página com o saldo real do cliente. */
export async function renderLoyaltyWidgets(clientId) {
  const widgets = document.querySelectorAll('.loy');
  if (!widgets.length) return;
  const { progress, remaining, rewardAvailable } = await getMyLoyaltyStatus(clientId);
  widgets.forEach((w) => {
    const n = w.querySelector('.loyn .n');
    const bar = w.querySelector('.loybar .loyf');
    const msg = w.querySelector('.loyms');
    if (n) n.textContent = String(progress);
    if (bar) bar.style.width = `${progress * 10}%`;
    if (msg) {
      msg.innerHTML = rewardAvailable
        ? '<strong>Resgate disponível!</strong> Você já pode pegar um corte grátis.'
        : `Faltam <strong>${remaining} corte${remaining === 1 ? '' : 's'}</strong> para um serviço gratuito.`;
    }
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
    onChange: async () => {
      await renderClientAppointments();
      renderMiniCalendar();
      renderLoyaltyWidgets(clientId);
      renderClientDashboardExtras();
      renderClientProfileExtras();
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
  currentProfile = profile;
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

Object.assign(window, { openQrModal, closeQrModal });
