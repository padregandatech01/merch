"use server";
import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth/authorization";
import {createAdminClient} from "@/lib/supabase/admin";

const isUuid=(s:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(s);
const detail=(id:string)=>"/admin/accounts/"+id;
async function target(form:FormData){
 const actor=await requireAdmin();
 const id=String(form.get("user_id")??"");
 if(!isUuid(id))redirect("/admin/accounts?error=invalid");
 const db=createAdminClient();
 if(!db)redirect("/admin/accounts?error=configuration");
 const [{data:account,error:aError},{data:staff,error:sError}]=await Promise.all([
  db.from("portal_accounts").select("user_id,display_name,account_type,status").eq("user_id",id).maybeSingle(),
  db.from("staff_roles").select("role").eq("user_id",id).maybeSingle()
 ]);
 if(aError||sError)redirect("/admin/accounts?error=database");
 if(staff)redirect("/admin/accounts?error=protected");
 if(!account)redirect("/admin/accounts?error=missing");
 return {actor,id,account,db};
}
export async function renameAccount(form:FormData){
 const {actor,id,account,db}=await target(form);
 const name=String(form.get("display_name")??"").trim();
 if(name.length<2||name.length>80)redirect(detail(id)+"?error=invalid");
 if(name===account.display_name)redirect(detail(id)+"?notice=unchanged");
 const {data,error}=await db.from("portal_accounts").update({
  display_name:name,updated_at:new Date().toISOString(),updated_by:actor.id
 }).eq("user_id",id).eq("display_name",account.display_name).select("user_id").single();
 if(error||!data)redirect(detail(id)+"?error=changed");
 redirect(detail(id)+"?notice=renamed");
}
export async function setAccountStatus(form:FormData){
 const {actor,id,account,db}=await target(form);
 const desired=String(form.get("status")??"");
 const expected=String(form.get("expected_status")??"");
 const reason=String(form.get("reason")??"").trim();
 if(!["active","suspended"].includes(desired)||desired===expected||expected!==account.status)
  redirect(detail(id)+"?error=changed");
 if(desired==="suspended"&&(reason.length<8||reason.length>500||form.get("confirm")!=="on"))
  redirect(detail(id)+"?error=reason");
 const {data,error}=await db.from("portal_accounts").update({
  status:desired,suspension_reason:desired==="suspended"?reason:null,
  updated_at:new Date().toISOString(),updated_by:actor.id
 }).eq("user_id",id).eq("status",expected).select("user_id").single();
 if(error||!data)redirect(detail(id)+"?error=changed");
 redirect(detail(id)+"?notice="+(desired==="active"?"reactivated":"suspended"));
}
export async function sendRecoveryEmail(form:FormData){
 const {actor,id,db}=await target(form);
 const origin=process.env.APP_ORIGIN;
 let redirectTo:string;
 try{
  const u=new URL(origin||"");
  if(u.protocol!=="https:"&&!(u.protocol==="http:"&&["localhost","127.0.0.1"].includes(u.hostname)))throw Error("Invalid origin");
  redirectTo=new URL("/set-password",u).toString();
 }catch{redirect(detail(id)+"?error=configuration");}
 const {data:last,error:historyError}=await db.from("portal_account_audit")
  .select("created_at").eq("subject_user_id",id).eq("action","recovery_email_sent")
  .order("created_at",{ascending:false}).limit(1).maybeSingle();
 if(historyError)redirect(detail(id)+"?error=database");
 if(last&&Date.now()-new Date(last.created_at).getTime()<300000)redirect(detail(id)+"?error=cooldown");
 const {data:userResult,error:userError}=await db.auth.admin.getUserById(id);
 const email=userResult?.user?.email;
 if(userError||!email)redirect(detail(id)+"?error=email");
 const {error:resetError}=await db.auth.resetPasswordForEmail(email,{redirectTo});
 if(resetError)redirect(detail(id)+"?error=email");
 const {error:auditError}=await db.from("portal_account_audit").insert({
  subject_user_id:id,actor_user_id:actor.id,action:"recovery_email_sent"
 });
 redirect(detail(id)+"?notice="+(auditError?"recovery_unlogged":"recovery"));
}
