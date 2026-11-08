import {notFound,redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {requireAdmin} from "@/lib/auth/authorization";
import {invitationTypes,isSupplier} from "@/lib/portal/config";

export const isUuid=(v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export type Relationship={
 id:string;user_id:string;supplier_type:string;invited_email:string;status:string;
 requested_email:string|null;created_at:string;updated_at:string;accepted_at:string|null;
 last_message_at:string|null;last_sender_kind:string|null;admin_read_at:string|null;supplier_read_at:string|null
};
export type RelationMessage={id:string;relationship_id:string;sender_user_id:string;sender_kind:string;body:string;created_at:string};
export const stages:Record<string,string>={
 invited:"Invited",discussing:"In conversation",accepted:"Accepted — account setup",
 completed:"Full account",declined:"Declined",revoked:"Invitation revoked"
};
export async function requireSupplierIdentity(){
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)redirect("/login?error=configuration");
 const db=await createClient();
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user?.email_confirmed_at)redirect("/login");
 const {data:staff}=await db.from("staff_roles").select("role").eq("user_id",user.id).maybeSingle();
 if(staff?.role==="dept_admin")redirect("/admin");
 const {data:account,error:aError}=await db.from("portal_accounts")
  .select("user_id,account_type,display_name,status").eq("user_id",user.id).maybeSingle();
 if(aError||!account)redirect("/login?error=unauthorized");
 if(account.status!=="active")redirect("/login?error=suspended");
 if(!isSupplier(account.account_type))redirect("/portal");
 const {data:relationship,error:rError}=await db.from("supplier_relationships")
  .select("id,user_id,supplier_type,invited_email,status,requested_email,created_at,updated_at,accepted_at,last_message_at,last_sender_kind,admin_read_at,supplier_read_at")
  .eq("user_id",user.id).maybeSingle();
 if(rError)redirect("/login?error=configuration");
 if(!relationship&&!invitationTypes.includes(account.account_type))redirect("/portal");
 return {db,user,account,relationship:relationship as Relationship|null};
}
export async function getMessages(db:Awaited<ReturnType<typeof createClient>>,id:string,rawPage?:string){
 const n=Number(rawPage??"1"),page=Number.isSafeInteger(n)&&n>=1&&n<=100000?n:1;
 const {data,error,count}=await db.from("supplier_messages")
  .select("id,relationship_id,sender_user_id,sender_kind,body,created_at",{count:"exact"})
  .eq("relationship_id",id).order("created_at",{ascending:false}).order("id",{ascending:false})
  .range((page-1)*30,page*30-1);
 return {messages:((data??[]) as RelationMessage[]).reverse(),page,pages:Math.max(1,Math.ceil((count??0)/30)),error:error?"Could not load the conversation.":null};
}
export async function getAdminRelations(params:Record<string,string|undefined>){
 await requireAdmin();
 const db=createAdminClient();
 if(!db)redirect("/admin/relations?error=configuration");
 const q=String(params.q??"").trim().replace(/[%_,]/g,"").slice(0,80);
 const status=Object.keys(stages).includes(params.status??"")?params.status!:"all";
 const n=Number(params.page??"1"),page=Number.isSafeInteger(n)&&n>=1&&n<=100000?n:1;
 let query=db.from("supplier_relationships")
  .select("id,user_id,supplier_type,invited_email,status,requested_email,created_at,updated_at,accepted_at,last_message_at,last_sender_kind,admin_read_at,supplier_read_at",{count:"exact"})
  .order("updated_at",{ascending:false});
 if(q)query=query.ilike("invited_email","%"+q+"%");
 if(status!=="all")query=query.eq("status",status);
 const {data,error,count}=await query.range((page-1)*15,page*15-1);
 return {rows:(data??[]) as Relationship[],q,status,page,pages:Math.max(1,Math.ceil((count??0)/15)),
 total:count??0,error:error?"Unable to load supplier relationships.":null};
}
export function relationsUrl(q:string,status:string,page:number){
 const p=new URLSearchParams();
 if(q)p.set("q",q);if(status!=="all")p.set("status",status);
 if(page!==1)p.set("page",String(page));
 return "/admin/relations"+(p.size?"?"+p.toString():"");
}
export async function getAdminRelationship(id:string,page?:string){
 await requireAdmin();
 if(!isUuid(id))notFound();
 const db=createAdminClient();if(!db)notFound();
 const {data,error}=await db.from("supplier_relationships")
  .select("id,user_id,supplier_type,invited_email,status,requested_email,created_at,updated_at,accepted_at,last_message_at,last_sender_kind,admin_read_at,supplier_read_at")
  .eq("id",id).maybeSingle();
 if(error||!data)notFound();
 const p=await getMessages(db as Awaited<ReturnType<typeof createClient>>,id,page);
 return {relation:data as Relationship,thread:p};
}
export async function getSupplierRelationship(page?:string){
 const {db,user,account,relationship}=await requireSupplierIdentity();
 const thread=relationship?await getMessages(db,relationship.id,page):null;
 return {db,user,account,relation:relationship,thread};
}
