/**
 * Utilitários de animação em JS — só para o que CSS puro não resolve
 * (interpolar números e desenhar partículas). Tudo o mais no projeto é CSS.
 */

/** O usuário pediu para reduzir movimento no sistema operacional? */
export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** Desaceleração no fim — o número corre rápido e "assenta" no valor final. */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Anima um número de 0 até `value` dentro do elemento.
 *
 * `format` permite manter sufixos e moeda ("12/10", "R$ 1.200"), já que o que
 * interessa é interpolar o número, não o texto ao redor. Guarda o id do frame
 * no próprio elemento: se a mesma caixa for atualizada de novo (Realtime, por
 * exemplo), a contagem anterior é cancelada em vez de disputar o texto.
 */
export function countUp(el, value, { durationMs = 800, format = (n) => String(n), decimals = 0 } = {}) {
  if (!el) return;
  cancelAnimationFrame(Number(el.dataset.countRaf) || 0);

  const target = Number(value) || 0;
  if (prefersReducedMotion() || durationMs <= 0) {
    el.textContent = format(target);
    return;
  }

  const from = 0;
  const started = performance.now();
  const step = (now) => {
    const t = Math.min((now - started) / durationMs, 1);
    const current = from + (target - from) * easeOutCubic(t);
    el.textContent = format(decimals ? Number(current.toFixed(decimals)) : Math.round(current));
    if (t < 1) {
      el.dataset.countRaf = String(requestAnimationFrame(step));
    } else {
      el.textContent = format(target); // garante o valor exato no fim
      delete el.dataset.countRaf;
    }
  };
  el.dataset.countRaf = String(requestAnimationFrame(step));
}

/**
 * Chuva de confete em canvas, sem biblioteca.
 *
 * O canvas é criado na hora, fica por cima de tudo sem capturar cliques e se
 * remove sozinho ao terminar — assim não sobra nada no DOM entre uma
 * comemoração e outra.
 */
export function confetti({ durationMs = 2200, count = 90 } = {}) {
  if (prefersReducedMotion()) return; // pura decoração: quem pediu menos movimento não perde nada

  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // acima de 2x só custa bateria
  const resize = () => {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  document.body.appendChild(canvas);

  const COLORS = ['#e6c364', '#f1d885', '#c9a84c', '#4caf82', '#ffffff'];
  const W = window.innerWidth;
  const parts = Array.from({ length: count }, () => ({
    x: Math.random() * W,
    y: -20 - Math.random() * window.innerHeight * 0.4,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    color: COLORS[(Math.random() * COLORS.length) | 0],
    vy: 2.2 + Math.random() * 2.6,
    vx: -1 + Math.random() * 2,
    rot: Math.random() * Math.PI,
    vr: -0.12 + Math.random() * 0.24,
  }));

  const started = performance.now();
  let rafId = 0;
  const frame = (now) => {
    const elapsed = now - started;
    const fade = Math.max(0, 1 - Math.max(0, elapsed - durationMs * 0.6) / (durationMs * 0.4));
    ctx.clearRect(0, 0, W, window.innerHeight);
    ctx.globalAlpha = fade;

    parts.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (elapsed < durationMs) {
      rafId = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      canvas.remove();
    }
  };
  window.addEventListener('resize', resize);
  rafId = requestAnimationFrame(frame);
}
