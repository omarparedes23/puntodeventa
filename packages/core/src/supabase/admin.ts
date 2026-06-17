import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// SOLO importar en Server Actions y API Routes.
// NUNCA exponer al cliente — usa SUPABASE_SERVICE_ROLE_KEY (sin NEXT_PUBLIC_).
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
