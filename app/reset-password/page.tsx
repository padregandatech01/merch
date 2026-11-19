import { redirect } from "next/navigation";
import AuthCard from "@/app/components/auth-card";
import { resetPassword } from "@/app/actions/password-recovery";
import { hasRecoverySession, isRecoveryConfigured } from "@/lib/auth/password-recovery";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Reset password" };

export default async function ResetPasswordPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!isRecoveryConfigured()) redirect("/forgot-password?error=unavailable");
  if (!await hasRecoverySession(await createClient())) redirect("/forgot-password?error=invalid-link");
  const { error } = await searchParams;
  const message = error === "password" ? "Enter matching passwords between 12 and 128 characters."
    : error === "same" ? "Choose a password different from your current one."
    : error === "weak" ? "Choose a stronger password."
    : error === "retry" ? "The password could not be saved. Please try again." : null;

  return (
    <AuthCard>
      <h1>Reset password</h1>
      {message ? <p className="me-alert" role="alert">{message}</p> : null}
      <form action={resetPassword}>
        <label htmlFor="new-password">New password</label>
        <input id="new-password" name="password" type="password" autoComplete="new-password"
          minLength={12} maxLength={128} aria-describedby="password-length" required />
        <small id="password-length">Use at least 12 characters.</small>
        <label htmlFor="confirm-password">Confirm new password</label>
        <input id="confirm-password" name="confirm_password" type="password" autoComplete="new-password"
          minLength={12} maxLength={128} required />
        <button className="me-submit" type="submit">Save password</button>
      </form>
    </AuthCard>
  );
}
