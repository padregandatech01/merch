import { signIn } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PasswordField from "./password-field";
const messages:Record<string,string>={invalid:"Incorrect email or password.",unauthorized:"This account is not approved for Merchandise.",configuration:"Login is not configured."};
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}) {
 const params=await searchParams;
 if(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY){
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
  if(user?.email_confirmed_at){const {data:staff}=await supabase.from("staff_roles").select("role").eq("user_id",user.id).maybeSingle();if(staff?.role==="dept_admin")redirect("/admin");}
 }
 const error=params.error?messages[params.error]??messages.invalid:null;
 return <main className="me-entry">
   <div className="me-entry-brand"><strong>LOXADA<span>®</span></strong><small>MERCHANDISE</small></div>
   <section className="me-entry-card"><h1>Staff sign in</h1>{error&&<p className="me-alert" role="alert">{error}</p>}
     <form action={signIn}><label htmlFor="me-email">Email or username</label><input id="me-email" name="email" type="text" autoComplete="username" required/><label htmlFor="me-pass">Password</label><PasswordField/><button className="me-submit" type="submit">Sign in</button></form>
   </section>
 </main>;
}
