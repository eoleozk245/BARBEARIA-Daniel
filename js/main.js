import { signUp, signIn, signInAdmin, signOut, resetPassword, getCurrentProfile } from './auth/auth.js';
import { renderPublicServices, renderPublicTeam } from './pages/public.js';
import { renderPortalServices, applyClientProfileToUI } from './pages/portal.js';
import {
  renderCfgSvcReal,
  renderCfgEqReal,
  addNewService,
  addNewBarber,
  applyAdminProfileToUI,
} from './pages/admin/configuracoes.js';
import { rvObs, showV, pGo, aGo, adminInit } from './legacy.js';

function showError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.style.display = message ? 'block' : 'none';
}

/* ══ SITE PÚBLICO — Serviços/Equipe reais (substituem SVC/BAR mock) ══ */
renderPublicServices(rvObs);
renderPublicTeam(rvObs);

/* ══ ENTRAR NO PORTAL DO CLIENTE (após login/cadastro real) ══ */
async function enterPortal(profile) {
  applyClientProfileToUI(profile);
  await renderPortalServices();
  showV('vp');
  pGo('dashboard');
}

/* ══ ENTRAR NO PAINEL ADMIN (após login real) ══ */
async function enterAdmin(profile) {
  applyAdminProfileToUI(profile);
  showV('va');
  adminInit();
  await renderCfgSvcReal();
  await renderCfgEqReal();
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
  try {
    const { profile } = await signInAdmin({ email, password });
    await enterAdmin(profile);
  } catch (err) {
    showError('aerr', 'Acesso negado. Verifique suas credenciais de administrador.');
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
  showV('vl');
}
async function handleAdminLogout() {
  await signOut();
  showV('val');
}

Object.assign(window, {
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
  try {
    const profile = await getCurrentProfile();
    if (!profile) return;
    if (profile.role === 'admin') {
      await enterAdmin(profile);
    } else {
      await enterPortal(profile);
    }
  } catch {
    /* sem sessão válida — mantém o site público visível */
  }
})();
