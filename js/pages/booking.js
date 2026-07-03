import { listServices } from '../services/services.js';
import { listBarbers } from '../services/barbers.js';
import { getAvailableSlots, createAppointment } from '../services/appointments.js';
import { formatCurrency, formatDuration } from '../utils/format.js';
import { escapeHtml } from '../utils/dom.js';
import { pGo } from '../legacy.js';
import { renderClientAppointments, renderMiniCalendar } from './portal.js';

const STEPS = ['Serviço', 'Barbeiro', 'Horário', 'Confirmado'];

let bk = { service: null, barber: null, date: null, slot: null };
let cachedServices = [];
let cachedBarbers = [];
let currentClientId = null;

function el(id) {
  return document.getElementById(id);
}

/**
 * Prepara o wizard para o cliente logado (a seção só é alcançável de dentro do
 * painel autenticado, então não há mais "modo visitante" a considerar aqui).
 * Chame ao entrar no portal e ao deslogar (com profile=null para limpar o estado).
 */
export function setBookingSession(profile) {
  currentClientId = profile ? profile.id : null;
  if (currentClientId) bkReset();
}

/** Volta para "Meus Agendamentos" (dados já atualizados via Realtime/refresh explícito). */
function bkGoToAgendamentos() {
  pGo('agendamentos');
}

function renderStInd(cur) {
  const target = el('stind');
  if (!target) return;
  target.innerHTML = STEPS.map(
    (l, i) => `
    <div class="stcol">
      <div class="stc ${i < cur - 1 ? 'done' : ''} ${i === cur - 1 ? 'cur' : ''}">
        ${i < cur - 1 ? '<i class="ti ti-check" style="font-size:13px"></i>' : i + 1}
      </div>
      <div class="stl ${i === cur - 1 ? 'cur' : ''}">${l}</div>
    </div>
    ${i < 3 ? `<div class="stline ${i < cur - 1 ? 'done' : ''}"></div>` : ''}`
  ).join('');
}

async function renderBkSvc() {
  cachedServices = await listServices();
  el('bksvclist').innerHTML = cachedServices
    .map(
      (s) => `
    <div class="bksvc ${bk.service?.id === s.id ? 'on' : ''}" onclick="bkPickService('${s.id}')">
      <div><div class="bksvcn">${escapeHtml(s.name)}</div><div class="bksvcm">${escapeHtml(s.description || '')} · <i class="ti ti-clock" style="font-size:11px"></i> ${formatDuration(s.duration_minutes)}</div></div>
      <span class="bksvcp">${formatCurrency(s.price)}</span>
    </div>`
    )
    .join('');
}

async function renderBkBar() {
  cachedBarbers = await listBarbers();
  el('bkbar').innerHTML = cachedBarbers
    .map((b) => {
      const initials = b.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
      return `
    <div class="bkbarc ${bk.barber?.id === b.id ? 'on' : ''}" onclick="bkPickBarber('${b.id}')">
      <div class="bkbav">${initials}</div>
      <div><div class="bkbn">${escapeHtml(b.name)}</div><div class="bkbr">${escapeHtml(b.title || '')}</div><div class="bkbrate">★ ${b.rating ?? '—'}</div></div>
    </div>`;
    })
    .join('');
}

// MODO TESTE — reverter depois: count era 10, ampliado para permitir escolher qualquer dia dentro de ~3 meses.
function nextDates(count = 90) {
  const dates = [];
  const d = new Date();
  dates.push(new Date(d));
  while (dates.length < count) {
    d.setDate(d.getDate() + 1);
    dates.push(new Date(d));
  }
  return dates;
}

function formatDateLabel(d) {
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}
function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

async function renderBkTime() {
  const dates = nextDates();
  const todayIso = toISODate(new Date());
  el('bkdates').innerHTML = dates
    .map((d) => {
      const iso = toISODate(d);
      const label = iso === todayIso ? 'Hoje' : formatDateLabel(d);
      return `<button class="bkd ${bk.date === iso ? 'on' : ''}" onclick="bkPickDate('${iso}')">${label}</button>`;
    })
    .join('');

  const timesEl = el('bktimes');
  if (!bk.date) {
    timesEl.innerHTML = '<span style="font-size:12px;color:var(--mut)">Escolha uma data acima.</span>';
  } else {
    const slots = await getAvailableSlots(bk.barber.id, bk.service.id, bk.date);
    timesEl.innerHTML = slots.length
      ? slots
          .map(
            (s) => `<button class="bkh ${bk.slot?.start_time === s.start_time ? 'on' : ''}" onclick="bkPickTime('${s.start_time}','${s.end_time}')">${s.start_time}</button>`
          )
          .join('')
      : '<span style="font-size:12px;color:var(--mut)">Sem horários livres nesta data.</span>';
  }
  const cb = el('bkconfirm');
  if (cb) cb.style.display = bk.date && bk.slot ? 'flex' : 'none';
}

function bkGo(n) {
  document.querySelectorAll('#psec-novo-agendamento .bkstep').forEach((s, i) => s.classList.toggle('show', i === n - 1));
  renderStInd(n);
  if (n === 2) renderBkBar();
  if (n === 3) renderBkTime();
}

async function bkPickService(id) {
  bk.service = cachedServices.find((s) => s.id === id);
  bkGo(2);
}
async function bkPickBarber(id) {
  bk.barber = cachedBarbers.find((b) => b.id === id);
  bkGo(3);
}
async function bkPickDate(iso) {
  bk.date = iso;
  bk.slot = null;
  await renderBkTime();
}
async function bkPickTime(startTime, endTime) {
  bk.slot = { start_time: startTime, end_time: endTime };
  await renderBkTime();
}

function bkReset() {
  bk = { service: null, barber: null, date: null, slot: null };
  bkGo(1);
  renderBkSvc();
}

async function bkConfirm() {
  if (!currentClientId || !bk.service || !bk.barber || !bk.date || !bk.slot) return;
  const btn = el('bkconfirm');
  if (btn) btn.disabled = true;
  try {
    await createAppointment({
      client_id: currentClientId,
      barber_id: bk.barber.id,
      service_id: bk.service.id,
      appointment_date: bk.date,
      start_time: bk.slot.start_time,
      end_time: bk.slot.end_time,
    });
    el('bksum').innerHTML = [
      ['Serviço', bk.service.name],
      ['Barbeiro', bk.barber.name],
      ['Data', bk.date],
      ['Horário', bk.slot.start_time],
    ]
      .map(([k, v]) => `<div class="bksr"><span class="bksl">${k}</span><span class="bksv">${escapeHtml(String(v))}</span></div>`)
      .join('');
    bkGo(4);
    // Atualiza a lista real de "Meus Agendamentos" e o mini calendário sem esperar o Realtime.
    await renderClientAppointments();
    await renderMiniCalendar();
  } catch (err) {
    alert(err.message || 'Não foi possível concluir o agendamento.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

Object.assign(window, { bkPickService, bkPickBarber, bkPickDate, bkPickTime, bkConfirm, bkReset, bkGo, bkGoToAgendamentos });
