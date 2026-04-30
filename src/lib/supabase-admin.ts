import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  throw new Error('[supabase-admin] SUPABASE_SERVICE_KEY is required for admin client');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});