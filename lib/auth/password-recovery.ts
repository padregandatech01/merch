import "server-only";

import { createHash, randomBytes } from "node:crypto";
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

export function recoverySite() {
  try {
    const url = new URL(process.env.APP_ORIGIN ?? "https://merch-three-fawn.vercel.app");
    const local = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    return url.protocol === "https:" || local ? new URL("/", url) : null;
  } catch {
    return null;
  }
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

// Keep the verifier out of the portal's request URL. The email link delivers
// it in the fragment, while Supabase issues a separate, single-use PKCE code.
export async function sendRecoveryLink(email: string, site: URL) {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  site.hash = new URLSearchParams({ verifier }).toString();
  return authPost("recover?" + new URLSearchParams({ redirect_to: site.href }), {
    email,
    code_challenge: challenge,
    code_challenge_method: "s256",
  });
}

export async function exchangeRecoveryCode(db: AuthClient, code: string, verifier: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(verifier)) return null;
  const response = await authPost("token?grant_type=pkce", { auth_code: code, code_verifier: verifier });
  if (!response.ok) return null;

  const tokens: { access_token?: unknown; refresh_token?: unknown } = await response.json();
  const { access_token, refresh_token } = tokens;
  if (typeof access_token !== "string" || typeof refresh_token !== "string") return null;

  const { data, error } = await db.auth.getClaims(access_token);
  const id = data?.claims.session_id;
  const methods = data?.claims.amr;
  const isRecovery = Array.isArray(methods) &&
    methods.some(method => (typeof method === "string" ? method : method.method) === "recovery");
  if (error || !isRecovery || typeof id !== "string") return null;

  const { error: sessionError } = await db.auth.setSession({ access_token, refresh_token });
  return sessionError ? null : id;
}

function authPost(path: string, body: Record<string, string>) {
  const url = new URL("/auth/v1/" + path, process.env.NEXT_PUBLIC_SUPABASE_URL);
  return fetch(url, {
    method: "POST",
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(12000),
  });
}
