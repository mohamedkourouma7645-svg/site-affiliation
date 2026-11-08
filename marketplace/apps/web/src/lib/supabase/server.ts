import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, isSupabaseConfigured } from "../env";

/**
 * Supabase client bound to the visitor's session (anon key + auth cookie).
 * All queries are subject to Row Level Security. Returns null when the
 * project is not configured yet, so pages can render an honest empty state.
 */
export async function getSupabase() {
  if (!isSupabaseConfigured) return null;
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there. Session refresh happens in middleware (Phase 1b).
        }
      },
    },
  });
}
