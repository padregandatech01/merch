"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {requireAdmin} from "@/lib/auth/authorization";
import {requireSupplierIdentity,isUuid} from "@/lib/supplier-relations";

function target(id:string){return "/admin/relations/"+id;}
function adminDb(){const db=createAdminClient();if(!db)redirect("/admin/relations?error=configuration");return db;}
export async function sendRelationshipMessage(form:FormData){
 const id=String(form.get("relationship_id")??"");
 const body=String(form.get("body")??"").trim();
 if(!isUuid(id))redirect("/admin/relations");
 const userDb=await createClient();
 const {data:{user},error:uError}=await userDb.auth.getUser();
 if(uError||!user?.email_confirmed_at)redirect("/login");
 const {data:staff}=await userDb.from("staff_roles").select("role").eq("user_id",user.id).maybeSingle();
 const isAdmin=staff?.role==="dept_admin";
 const where=isAdmin?target(id):"/invitation";
 if(body.length<1||body.length>4000)redirect(where+"?error=message");
 let identity:null|Awaited<ReturnType<typeof requireSupplierIdentity>>=null;
 if(isAdmin)await requireAdmin();
 else identity=await requireSupplierIdentity();
 const db=adminDb();
 const {data:r,error:rError}=await db.from("supplier_relationships").select("id,user_id,status").eq("id",id).maybeSingle();
 if(rError||!r)redirect(where+"?error=missing");
 if(!isAdmin && (!identity?.relationship || identity.relationship.id!==id || r.user_id!==user.id))redirect("/portal");
 if(["revoked","declined"].includes(r.status))redirect(where+"?error=closed");
 const kind=isAdmin?"admin":"supplier";
 // Small server-side cooldown reduces accidental duplicate posts and automated flooding.
 const since=new Date(Date.now()-2500).toISOString();
 const {data:recent,error:rateError}=await db.from("supplier_messages").select("id").eq("relationship_id",id)
  .eq("sender_user_id",user.id).gte("created_at",since).limit(1);
 if(rateError)redirect(where+"?error=database");
 if(recent?.length)redirect(where+"?error=slow");
 const {error}=await db.from("supplier_messages").insert({relationship_id:id,sender_user_id:user.id,sender_kind:kind,body});
 if(error)redirect(where+"?error=database");
 if(!isAdmin&&r.status==="invited")await db.from("supplier_relationships").update({status:"discussing",updated_at:new Date().toISOString()}).eq("id",id).eq("status","invited");
 revalidatePath(target(id));revalidatePath("/admin/relations");
 revalidatePath("/invitation");revalidatePath("/portal/messages");
 const destination=isAdmin?target(id):r.status==="completed"?"/portal/messages":"/invitation";
 redirect(destination+"?notice=sent");
}
export async function decideInvitation(form:FormData){
 const choice=String(form.get("decision")??"");
 if(!["accept","decline"].includes(choice))redirect("/invitation?error=invalid");
 const {user,relationship}=await requireSupplierIdentity();
 if(!relationship||!["invited","discussing"].includes(relationship.status))redirect("/invitation?error=changed");
 const db=adminDb(),now=new Date().toISOString();
 const values=choice==="accept"?{status:"accepted",accepted_at:now,updated_at:now}:
   {status:"declined",declined_at:now,updated_at:now};
 const {data,error}=await db.from("supplier_relationships").update(values)
  .eq("id",relationship.id).eq("user_id",user.id).eq("status",relationship.status).select("id").maybeSingle();
 if(error||!data)redirect("/invitation?error=changed");
 revalidatePath("/admin/relations");revalidatePath("/invitation");
 redirect("/invitation?notice="+(choice==="accept"?"accepted":"declined"));
}
export async function chooseSupplierEmail(form:FormData){
 const {db,user,relationship}=await requireSupplierIdentity();
 if(!relationship||relationship.status!=="accepted")redirect("/invitation?error=changed");
 const email=String(form.get("email")??"").trim().toLowerCase();
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))redirect("/invitation?error=email");
 if(email===user.email?.toLowerCase())redirect("/invitation?notice=current-email");
 const origin=process.env.APP_ORIGIN;
 let emailRedirectTo:string;
 try{
  const u=new URL(origin||"");
  if(u.protocol!=="https:"&&!(u.protocol==="http:"&&["localhost","127.0.0.1"].includes(u.hostname)))throw Error();
  emailRedirectTo=new URL("/auth/confirm?next=/invitation",u).toString();
 }catch{redirect("/invitation?error=configuration");}
 const {error}=await db.auth.updateUser({email},{emailRedirectTo});
 if(error)redirect("/invitation?error=email-change");
 const service=adminDb();
 const {error:saveError}=await service.from("supplier_relationships").update({requested_email:email,updated_at:new Date().toISOString()})
  .eq("id",relationship.id).eq("user_id",user.id).eq("status","accepted");
 if(saveError)redirect("/invitation?error=database");
 revalidatePath("/invitation");
 redirect("/invitation?notice=verify-email");
}
export async function completeSupplierAccount(){
 const {user,relationship}=await requireSupplierIdentity();
 if(!relationship||relationship.status!=="accepted")redirect("/invitation?error=changed");
 if(!user.email_confirmed_at||user.new_email||relationship.requested_email&&relationship.requested_email!==user.email?.toLowerCase())
  redirect("/invitation?error=confirm-email");
 const db=adminDb();
 const now=new Date().toISOString();
 const {data,error}=await db.from("supplier_relationships").update({status:"completed",completed_at:now,updated_at:now})
  .eq("id",relationship.id).eq("user_id",user.id).eq("status","accepted").select("id").maybeSingle();
 if(error||!data)redirect("/invitation?error=changed");
 revalidatePath("/admin/relations");revalidatePath("/portal");
 redirect("/portal?notice=onboarded");
}
export async function manageRelationship(form:FormData){
 await requireAdmin();
 const id=String(form.get("relationship_id")??""),act=String(form.get("action")??"");
 if(!isUuid(id))redirect("/admin/relations");
 const db=adminDb();
 const {data:r}=await db.from("supplier_relationships").select("status").eq("id",id).maybeSingle();
 if(!r)redirect("/admin/relations?error=missing");
 let updated:string;
 if(act==="revoke"&&["invited","discussing","accepted"].includes(r.status))updated="revoked";
 else if(act==="reopen"&&["declined","revoked"].includes(r.status))updated="discussing";
 else redirect(target(id)+"?error=changed");
 const now=new Date().toISOString();
 const {data,error}=await db.from("supplier_relationships")
  .update({...updated==="revoked"?{revoked_at:now}:{revoked_at:null,declined_at:null},
    status:updated,updated_at:now})
  .eq("id",id).eq("status",r.status).select("id").maybeSingle();
 if(error||!data)redirect(target(id)+"?error=changed");
 revalidatePath(target(id));revalidatePath("/admin/relations");
 redirect(target(id)+"?notice="+updated);
}
export async function markRelationshipRead(form:FormData){
 const id=String(form.get("relationship_id")??"");
 if(!isUuid(id))redirect("/admin/relations");
 const dbUser=await createClient();
 const {data:{user},error}=await dbUser.auth.getUser();
 if(error||!user?.email_confirmed_at)redirect("/login");
 const {data:staff}=await dbUser.from("staff_roles").select("role").eq("user_id",user.id).maybeSingle();
 const admin=staff?.role==="dept_admin";
 const route=admin?target(id):"/invitation";
 if(admin)await requireAdmin();
 else{
  const identity=await requireSupplierIdentity();
  if(identity.relationship?.id!==id)redirect("/portal");
 }
 const db=adminDb();
 const {data:r}=await db.from("supplier_relationships").select("status,user_id").eq("id",id).maybeSingle();
 if(!r||!admin&&r.user_id!==user.id)redirect("/portal");
 const field=admin?"admin_read_at":"supplier_read_at";
 await db.from("supplier_relationships").update({[field]:new Date().toISOString()}).eq("id",id);
 revalidatePath("/admin/relations");revalidatePath(target(id));revalidatePath("/invitation");
 redirect((admin?route:r.status==="completed"?"/portal/messages":route)+"?notice=read");
}
