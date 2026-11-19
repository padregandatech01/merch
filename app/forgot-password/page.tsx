import Link from "next/link";
import AuthCard from "@/app/components/auth-card";
import { requestPasswordRecovery } from "@/app/actions/password-recovery";

export const metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage({ searchParams }: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;
  const sent = notice === "sent";
  const message = error === "email" ? "Enter a valid email address."
    : error === "invalid-link" ? "This reset link is invalid or expired. Request a new link and open it in the same browser."
    : error === "unavailable" ? "Password reset is temporarily unavailable." : null;

  return (
    <AuthCard>
      <h1>Forgot password?</h1>
      {message ? <p className="me-alert" role="alert">{message}</p> : null}
      {sent ? (
        <p role="status">If an account uses that email, you’ll receive a reset link. Open it in this browser.</p>
      ) : (
        <form action={requestPasswordRecovery}>
          <label htmlFor="recovery-email">Sign-in email</label>
          <input id="recovery-email" name="email" type="email" autoComplete="email" maxLength={254} required />
          <button className="me-submit" type="submit">Send reset link</button>
        </form>
      )}
      <Link className="mt-3 inline-block text-sm font-semibold underline underline-offset-4" href="/login">Back to sign in</Link>
    </AuthCard>
  );
}
