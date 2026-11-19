import "server-only";

import { cookies } from "next/headers";
import type { createClient } from "@/lib/supabase/server";

type AuthClient = Awaited<ReturnType<typeof createClient>>;

export const recoveryCookie = "loxada-password-recovery";
export const recoveryCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/reset-password",
} as const;

export function isRecoveryConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export async function authSessionId(db: AuthClient) {
  const { data, error } = await db.auth.getClaims();
  const id = data?.claims.session_id;
  return !error && typeof id === "string" ? id : null;
}

export async function hasRecoverySession(db: AuthClient) {
  const store = await cookies();
  const recoverySession = store.get(recoveryCookie)?.value;
  return !!recoverySession && recoverySession === await authSessionId(db);
}
