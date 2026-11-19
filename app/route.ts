import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authSessionId, isRecoveryConfigured, recoveryCookie, recoveryCookieOptions } from "@/lib/auth/password-recovery";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const reply = (path: string) => NextResponse.redirect(new URL(path, request.url), {
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
  if (!code) return reply(params.has("error_code") ? "/forgot-password?error=invalid-link" : "/login");
  if (!isRecoveryConfigured()) return reply("/forgot-password?error=unavailable");

  const db = await createClient();
  const flowId = params.get("sb_flow_id");
  let recovery = false;
  const { data: { subscription } } = db.auth.onAuthStateChange(event => {
    if (event === "PASSWORD_RECOVERY") recovery = true;
  });
  const { error } = await db.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined)
    .finally(() => subscription.unsubscribe());
  if (error) return reply("/forgot-password?error=invalid-link");

  const sessionId = recovery ? await authSessionId(db) : null;
  if (!sessionId) {
    await db.auth.signOut({ scope: "local" });
    return reply("/forgot-password?error=invalid-link");
  }

  // Finish the email redirect chain before the browser requests the form with its new cookies.
  const response = new NextResponse(
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta http-equiv="refresh" content="0;url=/reset-password"><title>Password reset</title></head>' +
    '<body><a href="/reset-password">Continue to reset password</a></body></html>',
    { headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    } },
  );
  response.cookies.set(recoveryCookie, sessionId, { ...recoveryCookieOptions, maxAge: 10 * 60 });
  return response;
}
