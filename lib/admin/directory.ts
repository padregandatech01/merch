import {requireAdmin} from "@/lib/auth/authorization";
import {createAdminClient} from "@/lib/supabase/admin";
import {customerType,supplierTypes} from "@/lib/portal/config";

export type PortalPerson={
 user_id:string;display_name:string;account_type:string;status:string;created_at:string
};
export type Directory={
 q:string;role:string;status:string;page:number;total:number;pages:number;
 people:PortalPerson[];error:string|null
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
 const empty=(error:string):Directory=>({q,role,status,page,total:0,pages:1,people:[],error});
 const db=createAdminClient();
 if(!db)return empty("Account management is not configured.");
 // Staff identities never appear as manageable customer/supplier accounts.
 const {data:staff,error:staffError}=await db.from("staff_roles").select("user_id");
 if(staffError)return empty("Staff permissions could not be checked.");
 let query=db.from("portal_accounts")
  .select("user_id,display_name,account_type,status,created_at",{count:"exact"})
  .order("created_at",{ascending:false});
 for(const member of staff??[])query=query.neq("user_id",member.user_id);
 if(q)query=query.ilike("display_name","%"+q+"%");
 if(role!=="all")query=query.eq("account_type",role);
 if(status!=="all")query=query.eq("status",status);
 const {data,error,count}=await query.range((page-1)*20,page*20-1);
 const total=count??0;
 return {q,role,status,page,total,pages:Math.max(1,Math.ceil(total/20)),
  people:(data??[]) as PortalPerson[],error:error?"Account records could not be loaded.":null};
}
