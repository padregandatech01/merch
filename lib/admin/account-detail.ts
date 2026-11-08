import {notFound} from "next/navigation";
import {requireAdmin} from "@/lib/auth/authorization";
import {createAdminClient} from "@/lib/supabase/admin";
export const validAccountId=(id:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id);
export async function loadAccount(id:string){
 await requireAdmin();
 if(!validAccountId(id))notFound();
 const db=createAdminClient();
 if(!db)notFound();
 const [{data:account,error:accountError},{data:staff,error:staffError}]=await Promise.all([
  db.from("portal_accounts").select("user_id,display_name,account_type,status,suspension_reason,created_at").eq("user_id",id).maybeSingle(),
  db.from("staff_roles").select("user_id").eq("user_id",id).maybeSingle()
 ]);
 if(accountError||staffError||staff||!account)notFound();
 const [{data:authUser},{data:history},{data:application}]=await Promise.all([
  db.auth.admin.getUserById(id),
  db.from("portal_account_audit").select("id,action,note,created_at").eq("subject_user_id",id).order("created_at",{ascending:false}).limit(25),
  db.from("supplier_applications").select("status,legal_name,reviewer_feedback").eq("user_id",id).maybeSingle()
 ]);
 return {account,authUser:authUser?.user??null,history:history??[],application};
}
