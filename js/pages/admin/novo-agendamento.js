import { listClientStats, createClientAccount } from '../../services/profiles.js?v=20261104a';
import { listServices } from '../../services/services.js?v=20261104a';
import { listBarbers } from '../../services/barbers.js?v=20261104a';
import { getAvailableSlots, createAppointment, todayLocalDate } from '../../services/appointments.js?v=20261104a';
import { formatCurrency, formatDuration } from '../../utils/format.js?v=20261104a';
import { escapeHtml, showToast } from '../../utils/dom.js?v=20261104a';

/**
 * Agendamento pelo painel do administrador.
 *
 * Vale a mesma regra do cliente: só horários realmente livres, dentro do
 * expediente do barbeiro e a partir de agora. Por isso este arquivo NÃO tem
 * lógica de disponibilidade própria — ele chama `getAvailableSlots()`, a mesma
 * função do portal. Duas implementações da mesma regra acabariam divergindo.
 *
 * A gravação usa `createAppointment()`, também compartilhada, então o
 * tratamento de horário ocupado (23505 / 23P01) já vem pronto.
 */

const DAYS_AHEAD = 21; // o admin costuma marcar com mais antecedência que o cliente

let clients = [];
let services = [];
let barbers = [];
let sel = { clientId: '', serviceId: '', barberId: '', date: '', slot: null };
let onSaved = null; // callback para o painel recarregar depois de salvar

function el(id) {
  return document.getElementById(id);
}

function setError(message) {
  const box = el('na-err');
  if (!box) return;
  box.textContent = message;
  box.style.display = message ? 'block' : 'none';
}

/** Habilita o botão só quando tudo estiver escolhido. */
function refreshSaveButton() {
  const btn = el('na-save');
  if (btn) btn.disabled = !(sel.clientId && sel.serviceId && sel.barberId && sel.date && sel.slot);
}

function renderClientOptions() {
  const s = el('na-client');
  if (!s) return;
  s.innerHTML =
    '<option value="">Selecione o cliente…</option>' +
    clients
      .map((c) => `<option value="${escapeHtml(c.client_id)}">${escapeHtml(c.name)} — ${escapeHtml(c.email)}</option>`)
      .join('');
  s.value = sel.clientId;
}

function renderServiceOptions() {
  const s = el('na-service');
  if (!s) return;
  s.innerHTML =
    '<option value="">Selecione o serviço…</option>' +
    services
      .map(
        (v) =>
          `<option value="${escapeHtml(v.id)}">${escapeHtml(v.name)} — ${formatCurrency(v.price)} · ${formatDuration(v.duration_minutes)}</option>`
      )
      .join('');
  s.value = sel.serviceId;
}

function renderBarberOptions() {
  const s = el('na-barber');
  if (!s) return;
  s.innerHTML =
    '<option value="">Selecione o barbeiro…</option>' +
    barbers.map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`).join('');
  s.value = sel.barberId;
}

/** Datas a partir de hoje, montadas com aritmética de Date (nada de string "-31"). */
function renderDateOptions() {
  const s = el('na-date');
  if (!s) return;
  const pad = (n) => String(n).padStart(2, '0');
  const out = ['<option value="">Selecione a data…</option>'];
  const d = new Date();
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const label =
      iso === todayLocalDate()
        ? 'Hoje'
        : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
    out.push(`<option value="${iso}">${escapeHtml(label)}</option>`);
    d.setDate(d.getDate() + 1);
  }
  s.innerHTML = out.join('');
  s.value = sel.date;
}

/** Busca os horários livres reais para barbeiro + serviço + data. */
async function renderSlots() {
  const wrap = el('na-slots');
  if (!wrap) return;
  sel.slot = null;
  refreshSaveButton();

  if (!sel.barberId || !sel.serviceId || !sel.date) {
    wrap.innerHTML = '<span class="na-hint">Escolha serviço, barbeiro e data para ver os horários.</span>';
    return;
  }

  wrap.innerHTML = '<span class="na-hint">Procurando horários livres…</span>';
  let slots;
  try {
    slots = await getAvailableSlots(sel.barberId, sel.serviceId, sel.date);
  } catch (err) {
    wrap.innerHTML = `<span class="na-hint" style="color:var(--err)">Não foi possível buscar os horários: ${escapeHtml(err.message || 'erro')}</span>`;
    return;
  }

  if (!slots.length) {
    // Distinguir os dois motivos ajuda o admin a decidir o que fazer.
    wrap.innerHTML =
      '<span class="na-hint">Sem horários livres nesta data — o barbeiro pode não atender neste dia, ou a agenda já está cheia.</span>';
    return;
  }

  wrap.innerHTML = slots
    .map(
      (s) =>
        `<button type="button" class="na-slot" data-start="${s.start_time}" data-end="${s.end_time}">${s.start_time.slice(0, 5)}</button>`
    )
    .join('');

  wrap.querySelectorAll('.na-slot').forEach((btn) => {
    btn.addEventListener('click', () => {
      sel.slot = { start_time: btn.dataset.start, end_time: btn.dataset.end };
      wrap.querySelectorAll('.na-slot').forEach((b) => b.classList.toggle('on', b === btn));
      setError('');
      refreshSaveButton();
    });
  });
}

/** Alterna entre escolher um cliente existente e cadastrar um na hora. */
function setNewClientMode(on) {
  el('na-client-existing').style.display = on ? 'none' : '';
  el('na-client-new').style.display = on ? '' : 'none';
  el('na-toggle-new').textContent = on ? 'Escolher cliente já cadastrado' : 'Cadastrar cliente novo';
  setError('');
  if (on) {
    sel.clientId = '';
    refreshSaveButton();
  }
}

function isNewClientMode() {
  return el('na-client-new')?.style.display !== 'none';
}

export async function openNewAppointmentModal(refreshCallback) {
  const overlay = el('na-modal');
  if (!overlay) return;
  onSaved = refreshCallback || null;

  sel = { clientId: '', serviceId: '', barberId: '', date: '', slot: null };
  setError('');
  ['na-new-name', 'na-new-email', 'na-new-phone', 'na-new-password'].forEach((id) => {
    const f = el(id);
    if (f) f.value = '';
  });
  setNewClientMode(false);
  el('na-slots').innerHTML = '<span class="na-hint">Escolha serviço, barbeiro e data para ver os horários.</span>';
  refreshSaveButton();
  overlay.style.display = 'flex';

  // Carrega as três listas em paralelo; se alguma falhar, o modal diz o porquê
  // em vez de abrir com selects vazios e sem explicação.
  try {
    [clients, services, barbers] = await Promise.all([listClientStats(), listServices(), listBarbers()]);
  } catch (err) {
    setError(`Não foi possível carregar os dados: ${err.message || 'tente novamente.'}`);
    return;
  }
  renderClientOptions();
  renderServiceOptions();
  renderBarberOptions();
  renderDateOptions();
}

export function closeNewAppointmentModal() {
  const overlay = el('na-modal');
  if (overlay) overlay.style.display = 'none';
}

export async function saveNewAppointment() {
  setError('');
  const btn = el('na-save');

  if (!sel.serviceId || !sel.barberId || !sel.date || !sel.slot) {
    return setError('Escolha serviço, barbeiro, data e horário.');
  }

  if (btn) btn.disabled = true;
  try {
    let clientId = sel.clientId;

    // Cadastro na hora: a conta precisa existir antes do agendamento, porque
    // appointments.client_id é uma FK para profiles.
    if (isNewClientMode()) {
      const name = el('na-new-name')?.value.trim();
      const email = el('na-new-email')?.value.trim();
      const phone = el('na-new-phone')?.value.trim();
      const password = el('na-new-password')?.value;
      if (!name) return setError('Informe o nome do cliente.');
      if (!email) return setError('Informe o e-mail — é ele que cria o login do cliente.');
      if (password && password.length < 8) return setError('A senha deve ter no mínimo 8 caracteres.');

      const created = await createClientAccount({ name, email, phone, password });
      clientId = created?.user?.id || created?.id || created?.profile?.id;
      if (!clientId) throw new Error('O cliente foi criado, mas o sistema não recebeu o identificador dele.');
    }

    if (!clientId) return setError('Selecione o cliente.');

    await createAppointment({
      client_id: clientId,
      barber_id: sel.barberId,
      service_id: sel.serviceId,
      appointment_date: sel.date,
      start_time: sel.slot.start_time,
      end_time: sel.slot.end_time,
    });

    closeNewAppointmentModal();
    showToast('Agendamento criado.', 'ok');
    if (onSaved) await onSaved();
  } catch (err) {
    // Erro fica visível no modal, com os dados preservados para corrigir.
    setError(err.message || 'Não foi possível criar o agendamento.');
  } finally {
    if (btn) btn.disabled = false;
    refreshSaveButton();
  }
}

/* Ligações dos campos — feitas uma vez, já que o modal existe desde o carregamento. */
document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.id === 'na-client') {
    sel.clientId = t.value;
    refreshSaveButton();
  } else if (t.id === 'na-service') {
    sel.serviceId = t.value;
    await renderSlots();
  } else if (t.id === 'na-barber') {
    sel.barberId = t.value;
    await renderSlots();
  } else if (t.id === 'na-date') {
    sel.date = t.value;
    await renderSlots();
  }
});

document.addEventListener('click', (e) => {
  if (e.target.closest('#na-toggle-new')) {
    e.preventDefault();
    setNewClientMode(!isNewClientMode());
  }
});

Object.assign(window, { openNewAppointmentModal, closeNewAppointmentModal, saveNewAppointment });
