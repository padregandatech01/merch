import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  authSessionId,
  exchangeRecoveryCode,
  isRecoveryConfigured,
  recoveryCookie,
  recoveryCookieOptions,
  recoverySite,
} from "@/lib/auth/password-recovery";

const invalidLink = "/forgot-password?error=invalid-link";
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

function reply(path: string) {
  return new NextResponse(null, { status: 303, headers: { ...headers, Location: path } });
}

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (!params.has("code")) return reply(params.has("error_code") ? invalidLink : "/login");
  if (!isRecoveryConfigured()) return reply("/forgot-password?error=unavailable");

  const nonce = randomBytes(18).toString("base64");
  return new NextResponse(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Opening password reset</title></head>
<body>
<p>Opening your password reset link…</p>
<noscript>Enable JavaScript to continue or <a href="/forgot-password">request a new link</a>.</noscript>
<form id="recovery" method="post" action="/">
  <input type="hidden" name="code">
  <input type="hidden" name="verifier">
  <input type="hidden" name="flow_id">
</form>
<script nonce="${nonce}">
  const url = new URL(window.location.href);
  const form = document.getElementById("recovery");
  form.elements.namedItem("code").value = url.searchParams.get("code") || "";
  form.elements.namedItem("verifier").value = new URLSearchParams(url.hash.slice(1)).get("verifier") || "";
  form.elements.namedItem("flow_id").value = url.searchParams.get("sb_flow_id") || "";
  window.history.replaceState(null, "", "/");
  form.submit();
</script>
</body>
</html>`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      // Send only the origin on the form POST, without the code or fragment.
      "Referrer-Policy": "origin",
      "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
    },
  });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== recoverySite()?.origin) return reply(invalidLink);
  if (!isRecoveryConfigured()) return reply("/forgot-password?error=unavailable");

  let sessionId: string | null;
  try {
    const form = await request.formData();
    const code = form.get("code");
    const verifier = form.get("verifier");
    const flowId = form.get("flow_id");
    if (typeof code !== "string" || !/^[A-Za-z0-9_-]{1,256}$/.test(code)) return reply(invalidLink);

    const db = await createClient();
    sessionId = typeof verifier === "string" && verifier
      ? await exchangeRecoveryCode(db, code, verifier)
      : await exchangeOlderLink(db, code, typeof flowId === "string" && flowId ? flowId : undefined);
  } catch {
    return reply(invalidLink);
  }

  if (!sessionId) return reply(invalidLink);
  const response = reply("/reset-password");
  response.cookies.set(recoveryCookie, sessionId, { ...recoveryCookieOptions, maxAge: 10 * 60 });
  return response;
}

async function exchangeOlderLink(db: Awaited<ReturnType<typeof createClient>>, code: string, flowId?: string) {
  // Let links issued before cross-device recovery continue using their original browser.
  let recovery = false;
  const { data: { subscription } } = db.auth.onAuthStateChange(event => {
    if (event === "PASSWORD_RECOVERY") recovery = true;
  });
  const { error } = await db.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined)
    .finally(() => subscription.unsubscribe());
  if (error) return null;
  if (recovery) return authSessionId(db);
  await db.auth.signOut({ scope: "local" });
  return null;
}
