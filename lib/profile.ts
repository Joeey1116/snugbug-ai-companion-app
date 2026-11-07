/**
 * Profile — the signed-in user's row in public.profiles.
 * Mirrors the Rewards ensureProfile pattern, minus loyalty fields.
 * Works against the real Supabase backend (see supabase/migrations/)
 * and no-ops in demo mode (no Supabase configured).
 */
import { isSupabaseConfigured, supabase } from './supabase';

export interface Profile {
  userId: string;
  email: string;
  displayName: string | null;
  companionName: string;
}

export async function ensureProfile(userId: string, email: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, email }, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, companion_name')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    userId: data.id,
    email: data.email ?? '',
    displayName: data.display_name ?? null,
    companionName: data.companion_name ?? 'Snugbug',
  };
}

export async function updateProfile(
  userId: string,
  patch: { display_name?: string | null; companion_name?: string },
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw new Error(error.message);
}
