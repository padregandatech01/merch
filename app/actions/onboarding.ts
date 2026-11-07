"use server";
import {redirect} from "next/navigation";
import {requirePortal} from "@/lib/auth/authorization";
import {isSupplier} from "@/lib/portal/config";
const str=(form:FormData,key:string)=>String(form.get(key)??"").trim();
export async function submitSupplierApplication(form:FormData) {
 const {user,account,db}=await requirePortal();
 if(!isSupplier(account.account_type)) redirect("/portal?error=unauthorized");
 const legalName=str(form,"legal_name");
 const contactEmail=str(form,"contact_email").toLowerCase();
 const organizationName=str(form,"organization_name");
 const statement=str(form,"capability_statement");
 if(legalName.length<2 || legalName.length>160 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) || contactEmail.length>254 ||
    (organizationName.length>0 && (organizationName.length<2 || organizationName.length>160)) ||
    statement.length<20 || statement.length>3000 || form.get("affirmed")!=="on") redirect("/portal?error=invalid");
 const values={legal_name:legalName,contact_email:contactEmail,
  organization_name:organizationName||null,capability_statement:statement,affirmed:true,updated_at:new Date().toISOString()};
 const {data:current,error:lookupError}=await db.from("supplier_applications").select("id,status").eq("user_id",user.id).maybeSingle();
 if(lookupError) redirect("/portal?error=database");
 if(current && current.status!=="needs_info") redirect("/portal?error=locked");
 const result=current
  ? await db.from("supplier_applications").update(values).eq("user_id",user.id).eq("status","needs_info")
  : await db.from("supplier_applications").insert({...values,user_id:user.id});
 if(result.error) redirect("/portal?error=database");
 redirect("/portal?notice=submitted");
}
