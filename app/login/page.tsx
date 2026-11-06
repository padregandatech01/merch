import { signIn } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
const messages:Record<string,string>={invalid:"Invalid account or password.",unauthorized:"Not approved for merchandise administration.",configuration:"Sign-in is not configured."};
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
 const params=await searchParams;
 if(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY){
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
  if(user?.email_confirmed_at){const {data:r}=await supabase.from("staff_roles").select("role").eq("user_id",user.id).maybeSingle();if(r?.role==="dept_admin")redirect("/admin")}
 }
 const error=params.error?messages[params.error]??messages.invalid:null;
 return <main className="me-site"><header className="me-header"><b>LOXADA® <span>MERCH</span></b><small>OPERATIONS / BACK OFFICE</small><span className="me-pill">STAFF ONLY ↗</span></header><div className="me-main"><section className="me-showcase"><small>COLLECTION / OPERATIONS 001</small><h1>GOOD<br/>THINGS<br/><em>IN STORE.</em></h1><p>All the work behind what reaches the shelf.</p><div className="me-products"><div className="me-shirt">L.</div><div className="me-poster"><b>★</b><span>LOXADA PRINTS</span></div><div className="me-tag">NEW<br/>DROP<br/>↗</div></div></section><section className="me-receipt"><div className="me-receipt-head"><span>STAFF CHECK-IN</span><b>NO. 001</b></div><h2>Back office<br/>access.</h2><p>Approved department admins sign in here.</p>{error&&<p className="me-error" role="alert">{error}</p>}<form action={signIn}><label htmlFor="identity">EMAIL OR USERNAME</label><input id="identity" name="email" type="text" autoComplete="username" placeholder="admin" required/><label htmlFor="pass">PASSWORD</label><input id="pass" type="password" name="password" autoComplete="current-password" required/><button type="submit">CHECK IN →</button></form><div className="me-barcode">┃│┃┃│┃│┃┃┃│┃│┃│┃┃│</div><small>SECURE MERCHANDISE ADMINISTRATOR ENTRY</small></section></div><footer className="me-foot">DESIGNED FOR MAKING THINGS HAPPEN <span>LOXADA MERCH / V1.0</span></footer></main>;
}