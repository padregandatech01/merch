"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasRecoverySession, isRecoveryConfigured, recoveryCookie, recoveryCookieOptions } from "@/lib/auth/password-recovery";

function recoveryRedirect() {
  try {
    const url = new URL(process.env.APP_ORIGIN ?? "https://merch-three-fawn.vercel.app");
    const local = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    return url.protocol === "https:" || local ? new URL("/", url).href : null;
  } catch {
    return null;
  }
}

export async function requestPasswordRecovery(form: FormData) {
  const value = form.get("email");
  const email = typeof value === "string" ? value.trim() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/forgot-password?error=email");
  }
  const redirectTo = recoveryRedirect();
  if (!isRecoveryConfigured() || !redirectTo) redirect("/forgot-password?error=unavailable");

  const db = await createClient();
  try {
    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) console.warn("password_recovery_request_failed", { code: error.code, status: error.status });
  } catch {
    console.warn("password_recovery_request_failed");
  }
  // Use the same public response regardless of account existence or email delivery.
  redirect("/forgot-password?notice=sent");
}

export async function resetPassword(form: FormData) {
  if (!isRecoveryConfigured()) redirect("/forgot-password?error=unavailable");
  const db = await createClient();
  if (!await hasRecoverySession(db)) redirect("/forgot-password?error=invalid-link");

  const password = form.get("password");
  if (typeof password !== "string" || password.length < 12 || password.length > 128 ||
      password !== form.get("confirm_password")) {
    redirect("/reset-password?error=password");
  }

  const { error } = await db.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") redirect("/reset-password?error=same");
    if (error.code === "weak_password") redirect("/reset-password?error=weak");
    if (error.status === 401 || error.status === 403) redirect("/forgot-password?error=invalid-link");
    redirect("/reset-password?error=retry");
  }

  const store = await cookies();
  store.set(recoveryCookie, "", { ...recoveryCookieOptions, maxAge: 0 });
  const { error: signOutError } = await db.auth.signOut();
  if (signOutError) {
    console.warn("password_recovery_sign_out_failed", { code: signOutError.code, status: signOutError.status });
    await db.auth.signOut({ scope: "local" });
  }
  redirect("/login?notice=password-reset");
}
