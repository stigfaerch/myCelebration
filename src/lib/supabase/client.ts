import { createClient, type SupabaseClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Singleton browser client for Realtime subscriptions.
// Lazily instantiated so the same socket is reused across components.
//
// IMPORTANT: there must be exactly ONE browser-side Supabase client per page.
// Two clients with the same anon key share the same GoTrue storage key
// ("sb-<ref>-auth-token") and clobber each other's session state — that
// surfaces as "Multiple GoTrueClient instances detected" in the console
// AND silently breaks Realtime channel auth so postgres_changes events
// never arrive. Do not add another `createClient(url, anonKey)` to this file
// (or to any other module on the client side) — always import this getter.
let browserClient: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  if (!anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')

  browserClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  })
  return browserClient
}
