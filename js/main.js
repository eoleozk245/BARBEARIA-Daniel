import { signUp, signIn, signInAdmin, signOut, resetPassword, getCurrentProfile } from './auth/auth.js?v=20261104a';
import { renderPublicServices, renderPublicTeam } from './pages/public.js?v=20261104a';
import {
  renderPortalServices,
  applyClientProfileToUI,
  renderClientAppointments,
  renderMiniCalendar,
  renderLoyaltyWidgets,
  renderClientDashboardExtras,
  renderClientProfileExtras,
  subscribeClientAppointments,
} from './pages/portal.js?v=20261104a';
import { setBookingSession } from './pages/booking.js?v=20261104a';
import {
  renderCfgSvcReal,
  renderCfgEqReal,
  addNewService,
  addNewBarber,
  applyAdminProfileToUI,
} from './pages/admin/configuracoes.js?v=20261104a';
import { renderAdminAgenda, subscribeAdminAgenda, renderAppointmentsKpi, renderFinanceKpis } from './pages/admin/agenda.js?v=20261104a';
import { renderAdminClients, renderTopClients } from './pages/admin/clientes.js?v=20261104a';
import { renderAdminFeedbacks } from './pages/admin/feedbacks.js?v=20261104a';
import { renderAdminHistorico } from './pages/admin/historico.js?v=20261104a';
import './pages/admin/scanner.js?v=20261104a';
import { rvObs, showV, pGo, aGo, adminInit } from './legacy.js?v=20261104a';
import { enablePullToRefresh } from './utils/pulltorefresh.js?v=20261104a';
import { setupNotifications } from './pages/notifications.js?v=20261104a';
import { emptyState, showToast } from './utils/dom.js?v=20261104a';
import { openNewAppointmentModal } from './pages/admin/novo-agendamento.js?v=20261104a';

function showError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.style.display = message ? 'block' : 'none';
}

/**
 * Monta um painel isolando a falha dele.
 *
 * Motivo: o painel do admin carregava com nove `await` em sequência. Bastava
 * UMA consulta falhar para todas as seguintes nunca rodarem — foi exatamente
 * o que aconteceu quando o KPI passou a pedir uma data inexistente ("-31" em
 * mês de 30 dias): dashboard, clientes, feedbacks, histórico, Realtime e
 * notificações morriam juntos, sem nenhuma mensagem.
 *
 * Aqui a falha fica contida no painel que falhou E aparece — no lugar dele e
 * no console. Nunca engolir: um erro invisível é o que tornou aquele bug tão
 * difícil de enxergar.
 */
async function safeRender(label, fn, containerId) {
  try {
    await fn();
    return true;
  } catch (err) {
    console.error(`[painel] falha ao carregar "${label}":`, err);
    const el = containerId && document.getElementById(containerId);
    if (el) {
      const box = emptyState('error', `Não foi possível carregar ${label}`, err.message || 'Tente atualizar a página.');
      // <tbody> não aceita <div> como filho: dentro de tabela o aviso precisa
      // vir embrulhado numa linha, senão o navegador descarta o conteúdo.
      el.innerHTML = el.tagName === 'TBODY' ? `<tr><td colspan="9">${box}</td></tr>` : box;
    }
    return false;
  }
}

/* ══ SITE PÚBLICO — Serviços/Equipe reais (substituem SVC/BAR mock) ══ */
renderPublicServices(rvObs);
renderPublicTeam(rvObs);

/* ══ ENTRAR NO PORTAL DO CLIENTE (após login/cadastro real) ══ */
async function enterPortal(profile) {
  applyClientProfileToUI(profile);
  setBookingSession(profile);
  // Mesmo isolamento do painel admin: uma consulta que falha não pode deixar
  // o cliente com a tela pela metade e sem explicação.
  await Promise.all([
    safeRender('os serviços', renderPortalServices, 'psrvgrid'),
    safeRender('seus agendamentos', () => renderClientAppointments(true), 'ptcprox'),
    safeRender('o calendário', renderMiniCalendar, 'mcgrid'),
    safeRender('a fidelidade', () => renderLoyaltyWidgets(profile.id)),
  ]);
  renderClientDashboardExtras();
  renderClientProfileExtras();
  subscribeClientAppointments(profile.id);
  setupNotifications({ prefix: 'p', userId: profile.id });
  enablePullToRefresh(document.getElementById('pmain'), async () => {
    await renderClientAppointments();
    await renderMiniCalendar();
    await renderLoyaltyWidgets(profile.id);
    renderClientDashboardExtras();
  });
  showV('vp');
  pGo('dashboard');
}

/* ══ ENTRAR NO PAINEL ADMIN (após login real) ══ */
async function enterAdmin(profile) {
  applyAdminProfileToUI(profile);
  showV('va');
  adminInit();

  // Cada painel é independente: se um falhar, o erro aparece só nele e os
  // outros continuam carregando. Rodam em paralelo porque não há dependência
  // entre eles — o que também deixa a entrada no painel visivelmente mais rápida.
  await Promise.all([
    safeRender('os serviços', renderCfgSvcReal, 'cfg-svc-list'),
    safeRender('a equipe', renderCfgEqReal, 'cfg-eq-list'),
    safeRender('a agenda', renderAdminAgenda, 'ag-tbody'),
    safeRender('os atendimentos do mês', renderAppointmentsKpi),
    safeRender('os indicadores financeiros', renderFinanceKpis),
    safeRender('os clientes', renderAdminClients, 'cli-grid'),
    safeRender('os melhores clientes', renderTopClients, 'top-cli'),
    safeRender('as avaliações', renderAdminFeedbacks, 'fb-list'),
    safeRender('o histórico', renderAdminHistorico, 'atl-list'),
  ]);

  // Estas três não fazem I/O; ficam fora do bloco acima de propósito, para que
  // Realtime, sininho e puxar-para-atualizar sejam ligados mesmo que algum
  // painel acima tenha falhado.
  subscribeAdminAgenda();
  setupNotifications({ prefix: 'a', userId: profile.id });
  enablePullToRefresh(document.getElementById('apmain'), async () => {
    await Promise.all([
      safeRender('a agenda', renderAdminAgenda, 'ag-tbody'),
      safeRender('os atendimentos do mês', renderAppointmentsKpi),
      safeRender('os indicadores financeiros', renderFinanceKpis),
      safeRender('os clientes', renderAdminClients, 'cli-grid'),
    ]);
  });
  aGo('dash');
}

/* ══ LOGIN CLIENTE ══ */
async function handleClientLogin() {
  showError('lerr', '');
  const email = document.getElementById('lemail')?.value.trim();
  const password = document.getElementById('lpw')?.value;
  if (!email || !password) return showError('lerr', 'Preencha e-mail e senha.');
  try {
    await signIn({ email, password });
    const profile = await getCurrentProfile();
    await enterPortal(profile);
  } catch (err) {
    showError('lerr', 'E-mail ou senha inválidos.');
  }
}

/* ══ CADASTRO CLIENTE ══ */
async function handleSignup() {
  showError('cerr', '');
  const name = document.getElementById('cname')?.value.trim();
  const email = document.getElementById('cemail')?.value.trim();
  const phone = document.getElementById('cphone')?.value.trim();
  const password = document.getElementById('cpw')?.value;
  const password2 = document.getElementById('cpw2')?.value;
  if (!name || !email || !password) return showError('cerr', 'Preencha nome, e-mail e senha.');
  if (password.length < 8) return showError('cerr', 'A senha deve ter no mínimo 8 caracteres.');
  if (password !== password2) return showError('cerr', 'As senhas não coincidem.');
  try {
    const data = await signUp({ name, email, phone, password });
    if (data.session) {
      const profile = await getCurrentProfile();
      await enterPortal(profile);
    } else {
      showError('cerr', 'Cadastro criado! Verifique seu e-mail para confirmar a conta antes de entrar.');
    }
  } catch (err) {
    showError('cerr', err.message || 'Não foi possível criar a conta.');
  }
}

/* ══ LOGIN ADMIN ══ */
async function handleAdminLogin() {
  showError('aerr', '');
  const email = document.getElementById('aemail')?.value.trim();
  const password = document.getElementById('apw')?.value;
  if (!email || !password) return showError('aerr', 'Preencha e-mail e senha.');
  // Login e montagem do painel são separados de propósito: juntos, um erro de
  // consulta ao carregar o painel virava "Acesso negado", mandando o admin
  // conferir uma senha que estava certa.
  let profile;
  try {
    ({ profile } = await signInAdmin({ email, password }));
  } catch (err) {
    return showError('aerr', 'Acesso negado. Verifique suas credenciais de administrador.');
  }
  try {
    await enterAdmin(profile);
  } catch (err) {
    console.error('[admin] falha ao montar o painel:', err);
    showError('aerr', 'Entrou, mas algo não carregou. Atualize a página — detalhes no console.');
  }
}

/* ══ RECUPERAÇÃO DE SENHA ══ */
async function handleForgotPassword() {
  const email = document.getElementById('lemail')?.value.trim();
  if (!email) return showError('lerr', 'Informe seu e-mail acima para recuperar a senha.');
  try {
    await resetPassword(email);
    showError('lerr', 'Enviamos um link de recuperação para o seu e-mail.');
  } catch (err) {
    showError('lerr', 'Não foi possível enviar o e-mail de recuperação.');
  }
}

/* ══ LOGOUT ══ */
async function handleClientLogout() {
  await signOut();
  setBookingSession(null);
  showV('vl');
}
async function handleAdminLogout() {
  await signOut();
  showV('val');
}

/**
 * Abre o agendamento do admin já dizendo o que recarregar ao salvar — assim a
 * agenda, os KPIs e os gráficos refletem o novo agendamento na hora, sem
 * depender do Realtime chegar.
 */
function adminNewAppointment() {
  openNewAppointmentModal(async () => {
    await Promise.all([
      safeRender('a agenda', renderAdminAgenda, 'ag-tbody'),
      safeRender('os atendimentos do mês', renderAppointmentsKpi),
      safeRender('os indicadores financeiros', renderFinanceKpis),
      safeRender('os clientes', renderAdminClients, 'cli-grid'),
    ]);
  });
}

Object.assign(window, {
  adminNewAppointment,
  handleClientLogin,
  handleSignup,
  handleAdminLogin,
  handleForgotPassword,
  handleClientLogout,
  handleAdminLogout,
  addNewService,
  addNewBarber,
});

/* ══ SESSÃO PERSISTENTE — restaura login automaticamente ao recarregar a página ══ */
(async function restoreSession() {
  let profile;
  try {
    profile = await getCurrentProfile();
  } catch {
    return; // sem sessão válida — mantém o site público visível, é o esperado
  }
  if (!profile) return;

  // A montagem do painel fica FORA do try acima de propósito. Antes um único
  // catch cobria as duas coisas, então uma falha ao montar o painel era
  // confundida com "não está logado" e sumia sem deixar rastro — foi assim que
  // o bug da data inválida ficou invisível.
  try {
    if (profile.role === 'admin') {
      await enterAdmin(profile);
    } else {
      await enterPortal(profile);
    }
  } catch (err) {
    console.error('[sessão] falha ao montar o painel:', err);
    showToast('Algo não carregou corretamente. Atualize a página.', 'err');
  }
})();
