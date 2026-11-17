import SupplierPanel from "@/app/components/supplier-panel";
import {signOut} from "@/app/actions/auth";
import {requirePortal} from "@/lib/auth/authorization";
import {isSupplier} from "@/lib/portal/config";

export default async function DepartmentPortal({searchParams}:{searchParams:Promise<{error?:string;notice?:string}>}){
 const identity=await requirePortal();
 const {user,account}=identity;
 const kind=account.account_type;
 if(isSupplier(kind)){
  const p=await searchParams;
  return <SupplierPanel identity={identity} description={kind==="wholesaler"?"Work with the store team on your wholesale application and sourcing questions.":"Work with the store team on your manufacturer application and production questions."}
   submitted={p.notice==="submitted"} failed={!!p.error}/>;
 }
 return <main className="store-portal"><div className="store-portal-wrap">
  <header className="store-portal-head"><strong>LOXADA / MERCH</strong><form action={signOut}><button type="submit">Sign out</button></form></header>
  <section className="store-portal-heading"><span className="store-label">BUYER ACCOUNT</span>
   <h1>Your store account</h1>
   <p>Welcome to your buyer profile. Your account is separate from Anime subscribers and Manga readers. Shopping and delivery features will appear when the store is available.</p>
  </section>
  <div className="store-portal-grid">
   <aside className="store-profile-card"><span className="store-label">SIGNED IN AS</span><h2>{account.display_name}</h2><p>Buyer</p><p>{user.email}</p></aside>
   <section className="store-portal-content"><h2>Buyer profile</h2><p>Your account is ready for sign-in. No order or payment has been created through registration.</p>
    <p>Our store will eventually let buyers shop qualified merchandise and track eligible orders.</p></section>
  </div>
 </div></main>;
}
