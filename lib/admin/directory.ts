import {requireAdmin} from "@/lib/auth/authorization";
import {createAdminClient} from "@/lib/supabase/admin";
import {customerType,supplierTypes} from "@/lib/portal/config";

export type PortalPerson={
 user_id:string;display_name:string;account_type:string;status:string;created_at:string
};
export type PartnerRequest={
 id:string;user_id:string;legal_name:string;organization_name:string|null;
 contact_email:string;capability_statement:string;status:string;reviewer_feedback:string|null
};
export type Directory={
 q:string;role:string;status:string;page:number;total:number;pages:number;
 people:PortalPerson[];requests:PartnerRequest[];pending:number;error:string|null
};
export function directoryUrl(data:Pick<Directory,"q"|"role"|"status">,page:number){
 const params=new URLSearchParams();
 if(data.q)params.set("q",data.q);
 if(data.role!=="all")params.set("role",data.role);
 if(data.status!=="all")params.set("status",data.status);
 if(page!==1)params.set("page",String(page));
 return "/admin/accounts"+(params.size?"?"+params.toString():"");
}
export async function loadDirectory(params:Record<string,string|undefined>):Promise<Directory>{
 await requireAdmin();
 const q=String(params.q??"").trim().replace(/[%_,]/g,"").slice(0,60);
 const roles=[customerType,...supplierTypes];
 const role=roles.includes(params.role??"")?params.role!:"all";
 const status=["active","suspended"].includes(params.status??"")?params.status!:"all";
 const n=Number(params.page??"1");
 const page=Number.isSafeInteger(n)&&n>=1&&n<=10000?n:1;
 const empty=(error:string):Directory=>({q,role,status,page,total:0,pages:1,people:[],requests:[],pending:0,error});
 const db=createAdminClient();
 if(!db)return empty("Account management is not configured.");
 const {data:staff,error:staffError}=await db.from("staff_roles").select("user_id");
 if(staffError)return empty("Staff permissions could not be checked.");
 let query=db.from("portal_accounts")
  .select("user_id,display_name,account_type,status,created_at",{count:"exact"})
  .order("created_at",{ascending:false});
 for(const member of staff??[])query=query.neq("user_id",member.user_id);
 if(q)query=query.ilike("display_name","%"+q+"%");
 if(role!=="all")query=query.eq("account_type",role);
 if(status!=="all")query=query.eq("status",status);
 const [peopleResult,requestsResult]=await Promise.all([
  query.range((page-1)*20,page*20-1),
  db.from("supplier_applications").select("id,user_id,legal_name,organization_name,contact_email,capability_statement,status,reviewer_feedback")
   .order("created_at",{ascending:false}).limit(30)
 ]);
 const people=(peopleResult.data??[]) as PortalPerson[];
 const requests=(requestsResult.data??[]) as PartnerRequest[];
 const total=peopleResult.count??0;
 return {q,role,status,page,total,pages:Math.max(1,Math.ceil(total/20)),
  people,requests,pending:requests.filter(a=>["pending","needs_info"].includes(a.status)).length,
  error:peopleResult.error||requestsResult.error?"Some records could not be loaded.":null};
}
