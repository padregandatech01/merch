import {requireAdmin} from "@/lib/auth/authorization";
import {createAdminClient} from "@/lib/supabase/admin";
import {customerType,supplierTypes} from "@/lib/portal/config";
import {applicationMetrics,countOrNull,invitationMetrics,reportWindows} from "./supplier-activity-metrics";

export async function loadSupplierActivity(){
 await requireAdmin();
 const db=createAdminClient();
 if(!db)return null;
 const now=new Date();
 const {currentStart,previousStart,end}=reportWindows(now);
 const roles=[customerType,...supplierTypes];

 const invitations=Promise.all(invitationMetrics.map(async metric=>{
  const result=await db.from("supplier_relationships").select("id",{head:true,count:"exact"}).eq("status",metric.status);
  return {...metric,count:countOrNull(result)};
 }));
 const applications=Promise.all(applicationMetrics.map(async metric=>{
  const query=db.from("supplier_applications").select("created_at",{count:"exact",head:metric.status!=="pending"}).eq("status",metric.status);
  const result=await (metric.status==="pending"?query.order("created_at",{ascending:true}).limit(1):query);
  return {...metric,count:countOrNull(result),oldestSubmittedAt:result.error?null:result.data?.[0]?.created_at??null};
 }));
 const intake=Promise.all([[currentStart,end],[previousStart,currentStart]].map(async ([from,to])=>{
  const result=await db.from("supplier_applications").select("id",{head:true,count:"exact"}).gte("created_at",from).lt("created_at",to);
  return countOrNull(result);
 }));
 const accounts=(async()=>{
  // Mirror Account Access, where staff are not manageable portal accounts.
  const staff=await db.from("staff_roles").select("user_id");
  if(staff.error)return roles.map(role=>({role,active:null,suspended:null}));
  return Promise.all(roles.map(async role=>{
   const count=async(status:"active"|"suspended")=>{
    let query=db.from("portal_accounts").select("user_id",{head:true,count:"exact"}).eq("account_type",role).eq("status",status);
    for(const member of staff.data??[])query=query.neq("user_id",member.user_id);
    return countOrNull(await query);
   };
   const [active,suspended]=await Promise.all([count("active"),count("suspended")]);
   return {role,active,suspended};
  }));
 })();

 const [inviteRows,applicationRows,[currentIntake,previousIntake],accountRows]=await Promise.all([invitations,applications,intake,accounts]);
 return {now,inviteRows,applicationRows,accountRows,currentIntake,previousIntake};
}
