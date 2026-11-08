import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
});

const parsed = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export const env = {
  supabaseUrl: parsed.NEXT_PUBLIC_SUPABASE_URL || null,
  supabaseAnonKey: parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY || null,
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
