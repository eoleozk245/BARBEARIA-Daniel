/**
 * Puxar para atualizar (mobile).
 *
 * Só arma o gesto quando o container já está no topo do scroll — caso contrário
 * o toque é do scroll normal e não podemos interferir. Os listeners de toque
 * são `passive` até termos certeza de que é um pull para baixo; só a partir daí
 * usamos um listener não-passivo para poder chamar preventDefault e impedir o
 * "bounce" nativo do navegador.
 */

const THRESHOLD = 70; // distância mínima para disparar
const MAX_PULL = 110; // resistência: além disso o indicador não desce mais

/**
 * @param {HTMLElement} scroller elemento que rola (ou document.scrollingElement)
 * @param {() => Promise<void>} onRefresh o que recarregar
 */
export function enablePullToRefresh(scroller, onRefresh) {
  if (!scroller || !window.matchMedia('(max-width: 900px)').matches) return () => {};

  const indicator = document.createElement('div');
  indicator.className = 'ptr';
  indicator.innerHTML = '<span class="ms" aria-hidden="true">arrow_downward</span>';
  scroller.style.position = scroller.style.position || 'relative';
  scroller.prepend(indicator);

  let startY = 0;
  let pulling = false;
  let refreshing = false;

  const atTop = () => (scroller === document.body ? window.scrollY : scroller.scrollTop) <= 0;

  const setPull = (dist) => {
    indicator.style.transform = `translateY(${dist}px)`;
    indicator.classList.toggle('ready', dist >= THRESHOLD);
  };

  const reset = () => {
    indicator.style.transition = 'transform .25s var(--ease)';
    setPull(0);
    indicator.classList.remove('ready', 'spin');
    setTimeout(() => { indicator.style.transition = ''; }, 260);
  };

  const onStart = (e) => {
    if (refreshing || !atTop()) return;
    startY = e.touches[0].clientY;
    pulling = true;
  };

  const onMove = (e) => {
    if (!pulling || refreshing) return;
    const delta = e.touches[0].clientY - startY;
    if (delta <= 0) { pulling = false; return; } // rolando para cima: não é nosso gesto
    // Resistência: quanto mais puxa, menos anda — dá a sensação de elástico.
    const dist = Math.min(MAX_PULL, delta * 0.5);
    if (dist > 6) e.preventDefault();
    setPull(dist);
  };

  const onEnd = async () => {
    if (!pulling || refreshing) return;
    pulling = false;
    const dist = parseFloat(indicator.style.transform.replace(/[^\d.-]/g, '')) || 0;
    if (dist < THRESHOLD) return reset();

    refreshing = true;
    indicator.classList.add('spin');
    setPull(THRESHOLD);
    try {
      await onRefresh();
    } finally {
      refreshing = false;
      reset();
    }
  };

  scroller.addEventListener('touchstart', onStart, { passive: true });
  scroller.addEventListener('touchmove', onMove, { passive: false });
  scroller.addEventListener('touchend', onEnd, { passive: true });
  scroller.addEventListener('touchcancel', onEnd, { passive: true });

  return () => {
    scroller.removeEventListener('touchstart', onStart);
    scroller.removeEventListener('touchmove', onMove);
    scroller.removeEventListener('touchend', onEnd);
    scroller.removeEventListener('touchcancel', onEnd);
    indicator.remove();
  };
}
