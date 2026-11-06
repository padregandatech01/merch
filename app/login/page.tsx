import { signIn } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const messages: Record<string, string> = {
 invalid: "The email or password could not be verified.",
 unauthorized: "This account does not have permission to enter the admin area.",
 configuration: "Sign-in is not configured for this environment.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{error?: string}> }) {
  const params = await searchParams;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: record } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle();
      if (record?.role === "dept_admin" && user.email_confirmed_at) redirect("/admin");
    }
  }
  const error = params.error ? messages[params.error] ?? messages.invalid : null;
  return (<div className="me-shell"><section className="me-left"><div className="me-header">LOXADA® MERCH</div><div className="me-stage"><span className="me-tag">THE BACK OFFICE</span><h2>Make.<br/>Stock.<br/>Sell.</h2><div className="me-object" aria-hidden="true"/></div><div className="me-foot">YOUR PRODUCTS. OUR WORKSPACE.</div></section><section className="me-right"><div className="me-form"><div className="me-tag">TEAM LOGIN</div><h1>Behind the<br/>storefront.</h1><p>Welcome back to Merchandise operations. This entry is for approved department administrators only.</p>{error && <div className="me-alert" role="alert">{error}</div>}<form action={signIn}><label htmlFor="email">Business email</label><input type="email" name="email" id="email" required autoComplete="username" placeholder="team@example.com"/><label htmlFor="password">Your password</label><input id="password" type="password" name="password" required autoComplete="current-password"/><button type="submit">GO TO WORKSPACE ↗</button></form></div></section></div>);
}
