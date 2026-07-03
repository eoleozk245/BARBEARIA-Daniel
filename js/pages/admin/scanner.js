import { scanQrCheckin } from '../../services/loyalty.js';

let stream = null;
let rafId = null;
let detector = null;
let busy = false;
let lastResultAt = 0;

function showResult(kind, message) {
  const el = document.getElementById('qrsc-result');
  if (!el) return;
  el.className = `qrsc-result ${kind}`;
  el.textContent = message;
}

async function handleDecodedToken(token) {
  const now = Date.now();
  if (busy || now - lastResultAt < 1500) return; // evita disparar de novo no mesmo frame/QR ainda visível
  busy = true;
  try {
    const result = await scanQrCheckin(token);
    lastResultAt = Date.now();
    showResult(
      'ok',
      result.reward_unlocked
        ? `Atendimento confirmado! +1 ponto — recompensa de corte grátis liberada 🎉 (total: ${result.loyalty_total} pontos)`
        : `Atendimento confirmado! +1 ponto de fidelidade (total: ${result.loyalty_total} pontos).`
    );
  } catch (err) {
    lastResultAt = Date.now();
    showResult('err', err.message || 'Não foi possível confirmar o QR Code.');
  } finally {
    busy = false;
  }
}

function decodeLoop() {
  const video = document.getElementById('qrsc-video');
  const canvas = document.getElementById('qrsc-canvas');
  if (!video || !canvas || !stream) return;

  if (detector) {
    detector
      .detect(video)
      .then((codes) => {
        if (codes && codes.length > 0) handleDecodedToken(codes[0].rawValue);
      })
      .catch(() => {});
  } else if (window.jsQR && video.readyState === video.HAVE_ENOUGH_DATA) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = window.jsQR(imageData.data, imageData.width, imageData.height);
    if (code) handleDecodedToken(code.data);
  }

  rafId = requestAnimationFrame(decodeLoop);
}

/** Abre a câmera e inicia a leitura contínua de QR Code (chamado ao entrar na seção Escanear). */
export async function startQrScanner() {
  const video = document.getElementById('qrsc-video');
  if (!video) return;
  showResult('', 'Aponte a câmera para o QR Code do cliente.');

  if ('BarcodeDetector' in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      if (formats.includes('qr_code')) {
        detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      }
    } catch {
      detector = null;
    }
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = stream;
    await video.play();
    rafId = requestAnimationFrame(decodeLoop);
  } catch (err) {
    showResult('err', 'Não foi possível acessar a câmera. Verifique as permissões do navegador.');
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
  detector = null;
}

Object.assign(window, { startQrScanner, stopQrScanner });
