import { scanQrCheckin } from '../../services/loyalty.js?v=20260813b';
import { listTodayAppointments } from '../../services/appointments.js?v=20260813b';
import { escapeHtml } from '../../utils/dom.js?v=20260813b';

/* Tamanho em que a imagem é decodificada. O jsQR é JavaScript puro: rodar na
   resolução cheia (1280px) trava o processador do celular e sobram pouquíssimas
   tentativas reais por segundo. Reduzindo para 480px o ganho é de ~10x, sem
   perder precisão para um QR que ocupa boa parte do quadro. */
const DECODE_SIZE = 480;
const DECODE_INTERVAL_MS = 100; // ~10 leituras/s (o rAF roda a 60fps, o que seria desperdício)
const HINT_AFTER_MS = 7000;

let stream = null;
let track = null;
let rafId = null;
let busy = false;
let lastResultAt = 0;
let lastDecodeAt = 0;
let scanStartedAt = 0;
let hintShown = false;

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
  navigator.vibrate?.(120); // feedback tátil: o barbeiro sabe que leu sem olhar a tela
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
 * Leitura contínua com jsQR, recortando o quadrado central (o que o barbeiro
 * enquadra na mira) e decodificando reduzido para ser rápido no celular.
 */
function decodeLoop() {
  rafId = requestAnimationFrame(decodeLoop);

  const video = document.getElementById('qrsc-video');
  const canvas = document.getElementById('qrsc-canvas');
  if (!video || !canvas || !stream || busy) return;
  if (!window.jsQR || video.readyState !== video.HAVE_ENOUGH_DATA) return;

  const now = performance.now();
  if (now - lastDecodeAt < DECODE_INTERVAL_MS) return;
  lastDecodeAt = now;

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  // Recorta o quadrado central — é a área que o vídeo realmente mostra (object-fit:cover).
  const side = Math.min(vw, vh);
  const sx = (vw - side) / 2;
  const sy = (vh - side) / 2;

  canvas.width = DECODE_SIZE;
  canvas.height = DECODE_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, sx, sy, side, side, 0, 0, DECODE_SIZE, DECODE_SIZE);

  const img = ctx.getImageData(0, 0, DECODE_SIZE, DECODE_SIZE);
  const code = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });

  if (code?.data) {
    handleDecodedToken(code.data.trim());
    return;
  }

  if (!hintShown && scanStartedAt && now - scanStartedAt > HINT_AFTER_MS) {
    hintShown = true;
    const hint = document.getElementById('qrsc-hint');
    if (hint) hint.style.display = 'block';
  }
}

/** Mostra controles de zoom/lanterna só quando a câmera do aparelho suportar. */
function setupCameraControls() {
  const caps = track?.getCapabilities?.() || {};

  const torchBtn = document.getElementById('qrsc-torch');
  if (torchBtn) {
    if (caps.torch) {
      torchBtn.style.display = '';
      torchBtn.onclick = async () => {
        const on = torchBtn.dataset.on === '1';
        try {
          await track.applyConstraints({ advanced: [{ torch: !on }] });
          torchBtn.dataset.on = on ? '0' : '1';
          torchBtn.classList.toggle('on', !on);
        } catch { /* aparelho recusou — nada a fazer */ }
      };
    } else {
      torchBtn.style.display = 'none';
    }
  }

  const zoom = document.getElementById('qrsc-zoom');
  const zoomWrap = document.getElementById('qrsc-zoom-wrap');
  if (zoom && zoomWrap) {
    if (caps.zoom) {
      zoomWrap.style.display = '';
      zoom.min = caps.zoom.min;
      zoom.max = caps.zoom.max;
      zoom.step = caps.zoom.step || 0.1;
      zoom.value = track.getSettings?.().zoom ?? caps.zoom.min;
      zoom.oninput = () => {
        track.applyConstraints({ advanced: [{ zoom: Number(zoom.value) }] }).catch(() => {});
      };
    } else {
      zoomWrap.style.display = 'none';
    }
  }
}

/** Abre a câmera e inicia a leitura contínua (chamado ao entrar na seção Escanear). */
export async function startQrScanner() {
  renderTodayList();

  const video = document.getElementById('qrsc-video');
  if (!video) return;
  hintShown = false;
  const hint = document.getElementById('qrsc-hint');
  if (hint) hint.style.display = 'none';
  showResult('', 'Aponte a câmera para o QR Code do cliente.');

  if (!window.jsQR) {
    showResult('err', 'Leitor de QR não carregou. Recarregue a página.', 'jsQR ausente');
    return;
  }

  try {
    // Sem forçar proporção quadrada: nenhuma câmera entrega 1280x1280, e pedir isso
    // fazia o navegador escolher um modo estranho. Pede-se resolução alta e foco contínuo.
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        advanced: [{ focusMode: 'continuous' }],
      },
    });
    track = stream.getVideoTracks()[0];
    video.srcObject = stream;
    await video.play();
    setupCameraControls();
    scanStartedAt = performance.now();
    lastDecodeAt = 0;
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
  track = null;
  scanStartedAt = 0;
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
