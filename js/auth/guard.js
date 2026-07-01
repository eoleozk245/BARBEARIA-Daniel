import { getCurrentProfile } from './auth.js';

/** Retorna o profile se houver sessão válida de cliente, senão null. */
export async function ensureClientSession() {
  const profile = await getCurrentProfile();
  return profile || null;
}

/** Retorna o profile só se houver sessão válida E role === 'admin', senão null. */
export async function ensureAdminSession() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') return null;
  return profile;
}
