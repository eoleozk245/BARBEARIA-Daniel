import { scanQrCheckin } from '../../services/loyalty.js?v=20260813a';
import { listTodayAppointments } from '../../services/appointments.js?v=20260813a';
import { escapeHtml } from '../../utils/dom.js?v=20260813a';

let stream = null;
let rafId = null;
let busy = false;
let lastResultAt = 0;

function showResult(kind, message, detail) {
  const el = document.getElementById('qrsc-result');
  if (!el) return;
  el.className = `qrsc-result ${kind}`;
  el.innerHTML = detail
    ? `${escapeHtml(message)}<br><span style="font-size:11px;opacity:.7;font-weight:400">(${escapeHtml(detail)})</span>`
    : escapeHtml(message);
}

/** Confirma um atendimento a partir do token — usado pela câmera, pelo código manual e pela lista. */
async function confirmByToken(token) {
  const result = await scanQrCheckin(token);
  showResult(
    'ok',
    result.reward_unlocked
      ? `Atendimento confirmado! +1 ponto — recompensa de corte grátis liberada 🎉 (total: ${result.loyalty_total} pontos)`
      : `Atendimento confirmado! +1 ponto de fidelidade (total: ${result.loyalty_total} pontos).`
  );
  await renderTodayList();
}

async function handleDecodedToken(token) {
  const now = Date.now();
  if (busy || now - lastResultAt < 1500) return; // evita disparar de novo no mesmo QR ainda visível
  busy = true;
  try {
    await confirmByToken(token);
  } catch (err) {
    showResult('err', err.message || 'Não foi possível confirmar o QR Code.', err.reason);
  } finally {
    lastResultAt = Date.now();
    busy = false;
  }
}

/**
 * Loop de leitura usando exclusivamente o jsQR.
 * (O BarcodeDetector nativo foi removido de propósito: em vários Androids ele
 * existe mas falha silenciosamente, e o código nunca caía para o jsQR —
 * a câmera abria e nunca lia nada.)
 */
function decodeLoop() {
  const video = document.getElementById('qrsc-video');
  const canvas = document.getElementById('qrsc-canvas');
  if (!video || !canvas || !stream) return;

  if (window.jsQR && video.readyState === video.HAVE_ENOUGH_DATA) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code?.data) handleDecodedToken(code.data.trim());
  }

  rafId = requestAnimationFrame(decodeLoop);
}

/** Abre a câmera e inicia a leitura contínua (chamado ao entrar na seção Escanear). */
export async function startQrScanner() {
  renderTodayList();

  const video = document.getElementById('qrsc-video');
  if (!video) return;
  showResult('', 'Aponte a câmera para o QR Code do cliente.');

  if (!window.jsQR) {
    showResult('err', 'Leitor de QR não carregou. Recarregue a página.', 'jsQR ausente');
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1280 } },
    });
    video.srcObject = stream;
    await video.play();
    rafId = requestAnimationFrame(decodeLoop);
  } catch (err) {
    showResult('err', 'Não foi possível acessar a câmera. Use a lista abaixo para confirmar.', err.name);
  }
}

/** Para a câmera e o loop de decodificação (chamado ao sair da seção Escanear). */
export function stopQrScanner() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}

/**
 * Lista os agendamentos de hoje com botão de confirmar presença.
 * Usa o próprio qr_token do agendamento, então passa exatamente pelas mesmas
 * validações da leitura por câmera (uso único, data, ponto de fidelidade).
 */
export async function renderTodayList() {
  const el = document.getElementById('qrsc-today');
  if (!el) return;
  el.innerHTML = '<p style="font-size:12px;color:var(--mut)">Carregando…</p>';
  let appts;
  try {
    appts = await listTodayAppointments();
  } catch (err) {
    el.innerHTML = `<p style="font-size:12px;color:var(--err)">Não foi possível carregar: ${escapeHtml(err.message || 'erro')}</p>`;
    return;
  }

  el.innerHTML = appts.length
    ? appts
        .map(
          (a) => `
    <div class="qrsc-cli">
      <div style="flex:1;min-width:0">
        <div class="qrsc-cli-nm">${escapeHtml(a.client?.name || 'Cliente')}</div>
        <div class="qrsc-cli-sub">${a.start_time.slice(0, 5)} · ${escapeHtml(a.service?.name || '')}</div>
      </div>
      <button class="abtn abtn-g" data-confirm-token="${a.qr_token}" style="padding:8px 14px;border-radius:10px;font-size:12px;white-space:nowrap">Confirmar</button>
    </div>`
        )
        .join('')
    : '<p style="font-size:12px;color:var(--mut)">Nenhum atendimento pendente para hoje.</p>';

  el.querySelectorAll('[data-confirm-token]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await confirmByToken(btn.dataset.confirmToken);
      } catch (err) {
        showResult('err', err.message || 'Não foi possível confirmar.', err.reason);
        btn.disabled = false;
      }
    });
  });
}

/** Confirma digitando/colando o código, para quando a câmera não conseguir ler. */
async function confirmQrManual() {
  const input = document.getElementById('qrsc-manual-input');
  const token = input?.value.trim();
  if (!token) {
    showResult('err', 'Digite ou cole o código do cliente antes de confirmar.');
    return;
  }
  try {
    await confirmByToken(token);
    if (input) input.value = '';
  } catch (err) {
    showResult('err', err.message || 'Não foi possível confirmar o código.', err.reason);
  }
}

Object.assign(window, { startQrScanner, stopQrScanner, confirmQrManual, renderTodayList });
