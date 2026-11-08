import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {invitationTypes} from "@/lib/portal/config";
function assertConfigured() {
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) redirect("/login?error=configuration");
}
export async function requireAdmin() {
 assertConfigured();
 const db=await createClient();
 const {data:{user},error}=await db.auth.getUser();
 if(error || !user?.email_confirmed_at) redirect("/login");
 const {data:staff,error:roleError}=await db.from("staff_roles").select("role").eq("user_id",user.id).maybeSingle();
 if(roleError || staff?.role!=="dept_admin") redirect("/login?error=unauthorized");
 return user;
}
export async function requirePortal() {
 assertConfigured();
 const db=await createClient();
 const {data:{user},error}=await db.auth.getUser();
 if(error || !user?.email_confirmed_at) redirect("/login");
 const {data:staff}=await db.from("staff_roles").select("role").eq("user_id",user.id).maybeSingle();
 if(staff?.role==="dept_admin") redirect("/admin");
 const {data:account,error:accountError}=await db.from("portal_accounts")
 .select("user_id,account_type,display_name,status").eq("user_id",user.id).maybeSingle();
 if(accountError || !account) redirect("/login?error=unauthorized");
 if(account.status!=="active") redirect("/login?error=suspended");
 // The relationship stage is the authority for invited suppliers, not client-supplied auth metadata.
 if(invitationTypes.includes(account.account_type)){
  const {data:relation,error:relationError}=await db.from("supplier_relationships").select("status").eq("user_id",user.id).maybeSingle();
  if(relationError || relation?.status!=="completed")redirect("/invitation");
 }
 return {user,account,db};
}
export async function redirectSignedIn() {
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return;
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user?.email_confirmed_at) return;
 const {data:staff}=await db.from("staff_roles").select("role").eq("user_id",user.id).maybeSingle();
 if(staff?.role==="dept_admin") redirect("/admin");
 const {data:account}=await db.from("portal_accounts").select("user_id,account_type,status").eq("user_id",user.id).maybeSingle();
 if(account?.status==="active") {
  if(invitationTypes.includes(account.account_type)){
   const {data:relation}=await db.from("supplier_relationships").select("status").eq("user_id",user.id).maybeSingle();
   if(relation?.status!=="completed")redirect("/invitation");
  }
  redirect("/portal");
 }
}
