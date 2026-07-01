import { listServices } from '../services/services.js';
import { formatCurrency, formatDuration } from '../utils/format.js';
import { escapeHtml } from '../utils/dom.js';

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
