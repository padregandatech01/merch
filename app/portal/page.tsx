import SupplierPanel from "@/app/components/supplier-panel";
import CustomerCatalog from "@/app/components/customer-catalog";
import {requirePortal} from "@/lib/auth/authorization";
import {isSupplier} from "@/lib/portal/config";

export default async function DepartmentPortal({searchParams}:{searchParams:Promise<{error?:string;notice?:string;q?:string;page?:string}>}){
 const identity=await requirePortal();
 const {user,account}=identity;
 const kind=account.account_type;
 if(isSupplier(kind)){
  const p=await searchParams;
  return <SupplierPanel identity={identity} description={kind==="wholesaler"?"Work with the store team on your wholesale application and sourcing questions.":"Work with the store team on your manufacturer application and production questions."}
   submitted={p.notice==="submitted"} failed={!!p.error}/>;
 }
 const params=await searchParams;
 return <CustomerCatalog id={user.id} displayName={account.display_name} query={params.q} page={params.page} />;
}
