import { SupabaseClient } from '@supabase/supabase-js';
import { ENV } from './env.ts';

export function parseEmailWhitelist(whitelistStr: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!whitelistStr) return map;
  for (const entry of whitelistStr.split(',')) {
    const [email, role] = entry.split(':');
    if (email && role) {
      map.set(email.trim().toLowerCase(), role.trim());
    }
  }
  return map;
}

export async function getUserRole(supabaseAdmin: SupabaseClient, userId: string, email?: string): Promise<string> {
  if (email) {
    const whitelistedRole = checkEmailWhitelist(email);
    if (whitelistedRole) {
      await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: userId, role: whitelistedRole }, { onConflict: 'user_id' });
      return whitelistedRole;
    }
  }

  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: userId, role: 'user' }, { onConflict: 'user_id' });
    return 'user';
  }

  return data.role;
}

export async function assignUserRole(supabaseAdmin: SupabaseClient, userId: string, role: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('user_roles')
    .upsert({ user_id: userId, role }, { onConflict: 'user_id' });

  if (error) {
    throw new Error(`Failed to assign role: ${error.message}`);
  }
}

export function checkEmailWhitelist(email: string): string | null {
  const whitelist = parseEmailWhitelist(ENV.AUTH_EMAIL_WHITELIST);
  return whitelist.get(email.trim().toLowerCase()) || null;
}
