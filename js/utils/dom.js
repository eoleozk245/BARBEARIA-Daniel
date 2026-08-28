export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

/**
 * Estado vazio ilustrado — troca os parágrafos cinza de "nada aqui" por algo
 * que explica o que fazer. Devolve HTML pronto para interpolar.
 */
export function emptyState(icon, title, subtitle = '') {
  return `
    <div class="empty">
      <div class="empty-ico"><span class="ms">${escapeHtml(icon)}</span></div>
      <div class="empty-t">${escapeHtml(title)}</div>
      ${subtitle ? `<div class="empty-s">${escapeHtml(subtitle)}</div>` : ''}
    </div>`;
}

/** Barras de carregamento (skeleton) — `n` linhas. */
export function skeletonRows(n = 3, cls = 'sk-row') {
  return Array.from({ length: n }, () => `<div class="sk ${cls}"></div>`).join('');
}

/** Skeleton para tabela: `rows` linhas de `cols` células. */
export function skeletonTable(rows = 5, cols = 9) {
  const cells = Array.from({ length: cols }, () => '<td><div class="sk sk-cell"></div></td>').join('');
  return Array.from({ length: rows }, () => `<tr>${cells}</tr>`).join('');
}

const TOAST_MS = 4500;

/**
 * Mensagem flutuante, no lugar do alert() nativo (que trava a página inteira e
 * destoa do visual). Some sozinha; para erro que o usuário precisa reler com
 * calma, prefira mostrar também inline no formulário.
 */
export function showToast(message, kind = 'err') {
  const host = document.getElementById('toasts');
  if (!host) return;

  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.setAttribute('role', kind === 'err' ? 'alert' : 'status');
  el.textContent = message; // textContent: nunca interpreta HTML vindo de erro do servidor

  const close = document.createElement('button');
  close.className = 'toast-x';
  close.setAttribute('aria-label', 'Fechar aviso');
  close.textContent = '×';

  let removeId = null;
  const dismiss = () => {
    clearTimeout(removeId);
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  };
  close.addEventListener('click', dismiss);
  el.appendChild(close);
  host.appendChild(el);
  removeId = setTimeout(dismiss, TOAST_MS);
}

/** Escapa texto vindo do banco antes de interpolar em innerHTML (evita XSS). */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
