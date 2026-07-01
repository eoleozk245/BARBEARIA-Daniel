import { listServices } from '../services/services.js';
import { listBarbers } from '../services/barbers.js';
import { formatCurrency, formatDuration } from '../utils/format.js';
import { escapeHtml } from '../utils/dom.js';

/** Renderiza a grid de serviços do site público (#srvgrid) a partir do banco real. */
export async function renderPublicServices(rvObs) {
  const el = document.getElementById('srvgrid');
  if (!el) return [];
  const services = await listServices();
  el.innerHTML = services
    .map(
      (s, i) => `
    <div class="srvc rv rv${(i % 3) + 1}">
      <div class="sico"><i class="ti ${escapeHtml(s.icon || 'ti-cut')}"></i></div>
      <div class="stop"><span class="sname">${escapeHtml(s.name)}</span><span class="spric">${formatCurrency(s.price)}</span></div>
      <p class="sdesc">${escapeHtml(s.description)}</p>
      <div class="sfoot">
        <span class="stim"><i class="ti ti-clock"></i> ${formatDuration(s.duration_minutes)}</span>
        <span class="sarr">Agendar <i class="ti ti-arrow-right"></i></span>
      </div>
    </div>`
    )
    .join('');
  if (rvObs) document.querySelectorAll('#srvgrid .rv').forEach((node) => rvObs.observe(node));
  return services;
}

function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Renderiza a grid de equipe do site público (#tgrid) a partir do banco real. */
export async function renderPublicTeam(rvObs) {
  const el = document.getElementById('tgrid');
  if (!el) return [];
  const barbers = await listBarbers();
  el.innerHTML = barbers
    .map(
      (b, i) => `
    <div class="tcard rv rv${(i % 4) + 1}">
      <div class="tavw"><div class="tav">${initials(b.name)}</div></div>
      <div class="tnm">${escapeHtml(b.name)}</div><div class="trl">${escapeHtml(b.title || '')}</div>
      <div class="tex">${escapeHtml(b.experience_label || '')} de experiência</div>
      <div class="trate"><span class="tstar">★</span>${b.rating ?? '—'}</div>
      <div class="tsp">${escapeHtml(b.specialty || '')}</div>
    </div>`
    )
    .join('');
  if (rvObs) document.querySelectorAll('#tgrid .rv').forEach((node) => rvObs.observe(node));
  return barbers;
}
