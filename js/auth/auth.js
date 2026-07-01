import { supabase } from '../supabaseClient.js';

/** Cadastro de cliente. Cria a sessão e dispara o trigger que cria a linha em `profiles`. */
export async function signUp({ name, email, phone, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, phone } },
  });
  if (error) throw error;
  return data;
}

/** Login padrão (cliente ou admin — a checagem de role acontece em signInAdmin). */
export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Login administrativo: autentica normalmente e então confere `profiles.role`.
 * Se não for admin, a sessão é encerrada imediatamente (tela de admin fica separada
 * na prática, mesmo usando o mesmo backend de auth).
 */
export async function signInAdmin({ email, password }) {
  const data = await signIn({ email, password });
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    await signOut();
    throw new Error('Acesso restrito a administradores.');
  }
  return { ...data, profile };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Retorna a linha de `profiles` do usuário logado, ou null se não houver sessão. */
export async function getCurrentProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  if (error) throw error;
  return data;
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => callback(event, session));
}
