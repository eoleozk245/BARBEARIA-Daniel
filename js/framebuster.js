/**
 * Proteção contra clickjacking.
 *
 * O site é servido pelo GitHub Pages, que não permite definir cabeçalhos HTTP
 * próprios — ou seja, `X-Frame-Options` e a diretiva CSP `frame-ancestors`
 * (que só vale em cabeçalho, nunca em <meta>) estão fora de alcance. Este
 * script é o equivalente possível no cliente: se a página for carregada dentro
 * de um iframe, ela se esconde imediatamente e tenta assumir a janela de topo.
 *
 * Carregado de forma síncrona no <head>, antes de qualquer renderização, para
 * que um atacante não consiga sobrepor a interface antes da checagem rodar.
 */
(function () {
  if (window.top === window.self) return;

  // Esconde antes de qualquer pintura — impede a sobreposição enganosa.
  document.documentElement.style.display = 'none';

  try {
    window.top.location = window.self.location.href;
  } catch (err) {
    // Cross-origin: não dá para navegar o topo. Então descartamos a página.
    window.location.replace('about:blank');
  }
})();
