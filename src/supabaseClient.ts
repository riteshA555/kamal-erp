/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function createStubClient(message: string) {
  const err = { message }
  const asyncErr = async () => ({ data: null, error: err })
  const chain = () => ({ select: asyncErr, insert: asyncErr, update: asyncErr, delete: asyncErr, upsert: asyncErr })
  return {
    auth: { getUser: asyncErr, signInWithPassword: asyncErr, signOut: async () => ({ error: err }) },
    from: (_: string) => chain(),
    rpc: async (_: string, _args?: any) => ({ data: null, error: err }),
    // generic fallback: any other property access returns an async function which yields an error-shaped response
    ...new Proxy({}, { get: () => asyncErr })
  }
}

let _supabase: any
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Supabase disabled for this build. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  _supabase = createStubClient('Missing Supabase environment variables')
} else {
  _supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = _supabase as any
