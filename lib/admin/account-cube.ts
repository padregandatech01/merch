import {requireAdmin} from "@/lib/auth/authorization";
import {createAdminClient} from "@/lib/supabase/admin";
import {customerType,supplierTypes} from "@/lib/portal/config";
import {accountPeriod,type AccountCell} from "./account-cube-model";

export async function loadAccountCube(){
 await requireAdmin();
 const db=createAdminClient();
 if(!db)return null;
 const {data,error}=await db.rpc("department_account_cube");
 if(error||!Array.isArray(data))return null;
 const allowed=[customerType,...supplierTypes];
 const rows=data as AccountCell[];
 if(rows.some(row=>!row||!allowed.includes(row.account_type)||!accountPeriod(row.month)||row.month.length!==7||
   !["active","suspended"].includes(row.status)||!Number.isSafeInteger(row.total)||row.total<0))return null;
 return rows;
}
