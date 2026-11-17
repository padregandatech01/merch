import {requireAdmin} from "@/lib/auth/authorization";
import {createAdminClient} from "@/lib/supabase/admin";
import {customerType,supplierTypes} from "@/lib/portal/config";
import {accountPeriod,adminRole,manilaMonth,periodDepth,type AccountCell} from "./account-cube-model";

async function loadAdminTotals(db:NonNullable<ReturnType<typeof createAdminClient>>){
 const size=200,totals=new Map<string,number>();
 for(let offset=0,expected:number|null=null;;){
  const {data,error,count}=await db.from("staff_roles").select("created_at",offset===0?{count:"exact"}:undefined)
   .eq("role",adminRole).order("created_at").order("user_id").range(offset,offset+size-1);
  if(error||!data)return null;
  if(offset===0)expected=count;
  for(const row of data){
   const date=new Date(row.created_at);
   if(!row.created_at||!Number.isFinite(date.getTime()))return null;
   const month=manilaMonth(date);
   totals.set(month,(totals.get(month)??0)+1);
  }
  offset+=data.length;
  if(expected!==null?offset>=expected:data.length<size)break;
  if(!data.length)return null;
 }
 return Array.from(totals,([month,total]):AccountCell=>({account_type:adminRole,status:"not_tracked",month,total}));
}

export async function loadAccountCube(){
 await requireAdmin();
 const db=createAdminClient();
 if(!db)return null;
 const [{data,error},staff]=await Promise.all([db.rpc("department_account_cube"),loadAdminTotals(db)]);
 if(error||!Array.isArray(data)||!staff)return null;
 const allowed=[customerType,...supplierTypes];
 const rows=data as AccountCell[];
 if(rows.some(row=>!row||!allowed.includes(row.account_type)||!accountPeriod(row.month)||periodDepth(row.month)!==3||
   !["active","suspended"].includes(row.status)||!Number.isSafeInteger(row.total)||row.total<0))return null;
 return [...rows,...staff];
}
