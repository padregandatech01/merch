"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createClient as createServiceClient} from "@supabase/supabase-js";
import {requireAdmin} from "@/lib/auth/authorization";
import {invitationTypes} from "@/lib/portal/config";
import {inviteErrorFor,type InviteState} from "@/lib/supplier-invite";
function service() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key)return null;
 return createServiceClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}
export async function inviteSupplier(_previous:InviteState,form:FormData):Promise<InviteState> {
 const actor=await requireAdmin();
 const email=String(form.get("email")??"").trim().toLowerCase();
 const displayName=String(form.get("display_name")??"").trim();
 const accountType=String(form.get("account_type")??"");
 const message=String(form.get("message")??"").trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||
  displayName.length<2||displayName.length>80||!invitationTypes.includes(accountType)||
  message.length<40||message.length>3000)return {error:"invalid"};
 const origin=process.env.APP_ORIGIN,admin=service();
 if(!origin||!admin)return {error:"configuration"};
 let inviteUrl:string;
 try{
  const base=new URL(origin);
  const local=base.protocol==="http:"&&["localhost","127.0.0.1"].includes(base.hostname);
  if(base.protocol!=="https:"&&!(local&&process.env.VERCEL_ENV!=="production"))return {error:"configuration"};
  inviteUrl=new URL("/set-password",base).toString();
 }catch{return {error:"configuration"};}

 // This query also checks that the relationship schema exists before any email is sent.
 const {data:prior,error:check}=await admin.from("supplier_relationships").select("id")
  .eq("invited_email",email).order("created_at",{ascending:false}).limit(1).maybeSingle();
 if(check){
  console.warn("supplier_invite_failed",{step:"lookup",code:check.code});
  return {error:check.code==="42P01"||check.code==="PGRST205"?"configuration":"unavailable"};
 }
 if(prior)return {error:"relationship_exists",relationshipId:prior.id};

 const {data,error}=await admin.auth.admin.inviteUserByEmail(email,{
  data:{display_name:displayName,invitation_message:message,invitation_supplier_type:accountType},
  redirectTo:inviteUrl
 });
 if(error||!data?.user){
  const reason=inviteErrorFor(error);
  console.warn("supplier_invite_failed",{step:"auth",reason,code:error?.code,status:error?.status});
  return {error:reason};
 }
 const userId=data.user.id;
 const {data:profile,error:profileError}=await admin.from("portal_accounts")
  .update({account_type:accountType,display_name:displayName}).eq("user_id",userId).select("user_id").single();
 if(profileError||!profile){
  console.warn("supplier_invite_failed",{step:"profile",code:profileError?.code});
  return {error:"setup"};
 }
 const {data:relation,error:relationError}=await admin.from("supplier_relationships")
  .insert({user_id:userId,supplier_type:accountType,invited_email:email,invited_by:actor.id,status:"invited"})
  .select("id").single();
 if(relationError||!relation){
  if(relationError?.code==="23505"){
   const {data:existing}=await admin.from("supplier_relationships").select("id").eq("user_id",userId).maybeSingle();
   if(existing)return {error:"relationship_exists",relationshipId:existing.id};
  }
  console.warn("supplier_invite_failed",{step:"relationship",code:relationError?.code});
  return {error:"setup"};
 }
 const {error:messageError}=await admin.from("supplier_messages")
  .insert({relationship_id:relation.id,sender_user_id:actor.id,sender_kind:"admin",body:message});
 revalidatePath("/admin/relations");
 if(messageError){
  console.warn("supplier_invite_failed",{step:"message",code:messageError.code});
  return {error:"setup",relationshipId:relation.id};
 }
 redirect("/admin/relations/"+relation.id+"?notice=invited");
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
