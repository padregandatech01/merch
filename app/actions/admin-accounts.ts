"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createClient as createServiceClient} from "@supabase/supabase-js";
import {requireAdmin} from "@/lib/auth/authorization";
import {invitationTypes} from "@/lib/portal/config";
function service() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SECRET_KEY;
 if(!url || !key) return null;
 return createServiceClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}
export async function inviteSupplier(form:FormData) {
 await requireAdmin();
 const email=String(form.get("email")??"").trim().toLowerCase();
 const displayName=String(form.get("display_name")??"").trim();
 const accountType=String(form.get("account_type")??"");
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254 ||
   displayName.length<2 || displayName.length>80 || !invitationTypes.includes(accountType)) redirect("/admin/onboarding/invite?error=invalid");
 const origin=process.env.APP_ORIGIN;
 const admin=service();
 if(!origin || !admin) redirect("/admin/onboarding/invite?error=configuration");
 let inviteUrl:string;
 try {
  const base=new URL(origin);
  if(base.protocol!=="https:" && !(base.protocol==="http:" && ["localhost","127.0.0.1"].includes(base.hostname))) throw Error("Invalid origin");
  inviteUrl=new URL("/set-password",base).toString();
 }catch{redirect("/admin/onboarding/invite?error=configuration");}
 const {data,error}=await admin.auth.admin.inviteUserByEmail(email,{
  data:{display_name:displayName},redirectTo:inviteUrl
 });
 if(error || !data.user) redirect("/admin/onboarding/invite?error=invite");
 const {data:profile,error:profileError}=await admin.from("portal_accounts").update({
  account_type:accountType,display_name:displayName
 }).eq("user_id",data.user.id).select("user_id").single();
 if(profileError || !profile) redirect("/admin/onboarding/invite?error=profile");
 revalidatePath("/admin/onboarding");
 redirect("/admin/onboarding?notice=invited");
}
export async function reviewSupplier(form:FormData) {
 await requireAdmin();
 const id=String(form.get("application_id")??"");
 const status=String(form.get("status")??"");
 const expected=String(form.get("expected_status")??"");
 const target=/^[0-9a-f-]{36}$/i.test(id)?"/admin/onboarding/"+id:"/admin/onboarding";
 const feedback=String(form.get("reviewer_feedback")??"").trim();
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(id) || !["pending","needs_info","verified","rejected","suspended"].includes(expected) ||
   !["verified","needs_info","rejected","suspended"].includes(status) || feedback.length>1000 ||
   (status!=="verified" && feedback.length<5)) redirect(target+"?error=invalid");
 const admin=service();
 if(!admin) redirect(target+"?error=configuration");
 const {data:reviewed,error}=await admin.from("supplier_applications")
  .update({status,reviewer_feedback:feedback||null,reviewed_at:new Date().toISOString()})
  .eq("id",id).eq("status",expected).select("id").single();
 if(error || !reviewed) redirect(target+"?error=changed");
 revalidatePath("/admin/onboarding");
 revalidatePath(target);
 redirect(target+"?notice=reviewed");
}
