import { createClient } from '@supabase/supabase-js';
import type { AdminUser } from '@/types/admin';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  throw new Error('[auth] SUPABASE_SERVICE_KEY is required for auth client');
}

const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export function getAuthCookieName(): string {
  const url = import.meta.env.PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  try {
    const hostname = new URL(url).hostname;
    if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
      const ref = hostname.split('.')[0];
      return `sb-${ref}-auth-token`;
    }
  } catch {}
  return 'sb-local-auth-token';
}

export async function signInAdmin(
  email: string,
  password: string,
): Promise<{ session: Record<string, unknown> | null; error: string | null }> {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const messages: Record<string, string> = {
      'Invalid login credentials': 'Email o contraseña incorrectos',
      'Email not confirmed': 'Email no confirmado',
      'Too many requests': 'Demasiados intentos. Intenta de nuevo en unos minutos',
    };
    return { session: null, error: messages[error.message] || error.message };
  }

  if (!data.session) {
    return { session: null, error: 'No se pudo crear la sesión' };
  }

  return { session: data.session as unknown as Record<string, unknown>, error: null };
}

export async function getAdminUser(request: Request): Promise<AdminUser | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return verifyToken(authHeader.slice(7));
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const token = extractTokenFromCookies(cookieHeader);
  if (token) {
    return verifyToken(token);
  }

  return null;
}

async function verifyToken(token: string): Promise<AdminUser | null> {
  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email!,
    role: 'admin',
  };
}

function extractTokenFromCookies(cookieHeader: string): string | null {
  const cookies = cookieHeader.split(';').map((c) => c.trim());

  for (const cookie of cookies) {
    const eqIndex = cookie.indexOf('=');
    if (eqIndex === -1) continue;

    const name = cookie.slice(0, eqIndex);
    const value = cookie.slice(eqIndex + 1);

    if (name.startsWith('sb-') && name.endsWith('-auth-token')) {
      try {
        const session = JSON.parse(decodeURIComponent(value));
        if (session?.access_token) return session.access_token;
      } catch {
        // not JSON — skip
      }
    }
  }

  return null;
}