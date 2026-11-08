import {notFound} from "next/navigation";
import {requireAdmin} from "@/lib/auth/authorization";
import {createAdminClient} from "@/lib/supabase/admin";
export type PartnerRequest={
 id:string;user_id:string;legal_name:string;organization_name:string|null;
 contact_email:string;capability_statement:string;status:string;reviewer_feedback:string|null;
 created_at:string;updated_at:string;reviewed_at:string|null
};
export type OnboardingQueue={
 q:string;status:string;page:number;pages:number;total:number;pending:number;
 requests:PartnerRequest[];error:string|null
};
const PAGE_SIZE=10;
const allowed=["all","action","pending","needs_info","verified","rejected","suspended"];
export function onboardingUrl(d:Pick<OnboardingQueue,"q"|"status">,page:number){
 const p=new URLSearchParams();
 if(d.q)p.set("q",d.q);
 if(d.status!=="action")p.set("status",d.status);
 if(page!==1)p.set("page",String(page));
 return "/admin/onboarding"+(p.size?"?"+p.toString():"");
}
export async function loadOnboarding(params:Record<string,string|undefined>):Promise<OnboardingQueue>{
 await requireAdmin();
 const q=String(params.q??"").trim().replace(/[%_,]/g,"").slice(0,60);
 const status=allowed.includes(params.status??"")?params.status!:"action";
 const n=Number(params.page??"1"),page=Number.isSafeInteger(n)&&n>=1&&n<=10000?n:1;
 const empty=(error:string):OnboardingQueue=>({q,status,page,pages:1,total:0,pending:0,requests:[],error});
 const db=createAdminClient();
 if(!db)return empty("Partner onboarding is not configured.");
 let query=db.from("supplier_applications")
  .select("id,user_id,legal_name,organization_name,contact_email,capability_statement,status,reviewer_feedback,created_at,updated_at,reviewed_at",{count:"exact"})
  .order("created_at",{ascending:false});
 if(q)query=query.ilike("legal_name","%"+q+"%");
 if(status==="action")query=query.in("status",["pending","needs_info"]);
 else if(status!=="all")query=query.eq("status",status);
 const [list,queueCount]=await Promise.all([
  query.range((page-1)*PAGE_SIZE,page*PAGE_SIZE-1),
  db.from("supplier_applications").select("id",{count:"exact",head:true}).in("status",["pending","needs_info"])
 ]);
 const total=list.count??0;
 return {q,status,page,pages:Math.max(1,Math.ceil(total/PAGE_SIZE)),total,pending:queueCount.count??0,
  requests:(list.data??[]) as PartnerRequest[],
  error:list.error||queueCount.error?"Some applications could not be loaded.":null};
}
export async function loadApplication(id:string){
 await requireAdmin();
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))notFound();
 const db=createAdminClient();
 if(!db)notFound();
 const {data,error}=await db.from("supplier_applications")
  .select("id,user_id,legal_name,organization_name,contact_email,capability_statement,status,reviewer_feedback,created_at,updated_at,reviewed_at")
  .eq("id",id).maybeSingle();
 if(error||!data)notFound();
 const {data:account}=await db.from("portal_accounts")
  .select("display_name,account_type,status").eq("user_id",data.user_id).maybeSingle();
 return {application:data as PartnerRequest,account};
}
