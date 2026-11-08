import Link from "next/link";
import {signOut} from "@/app/actions/auth";
import {submitSupplierApplication} from "@/app/actions/onboarding";
import {requirePortal} from "@/lib/auth/authorization";
import {isSupplier} from "@/lib/portal/config";
const states:Record<string,string>={pending:"Waiting for review",needs_info:"More details requested",verified:"Supplier verified",rejected:"Application declined",suspended:"Application suspended"};
const errors:Record<string,string>={unauthorized:"This account cannot send a supplier application.",invalid:"Please check the supplier details.",database:"Could not save your application.",locked:"Your application is already under review."};
export default async function StorePortal({searchParams}:{searchParams:Promise<{error?:string;notice?:string}>}){
 const {user,account,db}=await requirePortal();
 const p=await searchParams;
 const type=account.account_type;
 const supplier=isSupplier(type);
 const {data:app,error:appError}=supplier
  ? await db.from("supplier_applications").select("status,legal_name,organization_name,contact_email,capability_statement,reviewer_feedback").eq("user_id",user.id).maybeSingle()
  : {data:null,error:null};
 const editable=supplier&&(!app||app.status==="needs_info");
 const role=type==="wholesaler"?"Wholesale supplier":type==="manufacturer"?"Lead manufacturer":"Buyer";
 return <main className="store-portal"><div className="store-portal-wrap">
  <header className="store-portal-head"><strong>LOXADA / MERCH</strong><form action={signOut}><button type="submit">Sign out</button></form></header>
  <section className="store-portal-heading">
   {supplier&&<Link className="sr-portal-message-link" href="/portal/messages">Messages with the store team</Link>}
   <span className="store-label">{supplier?"SUPPLIER ACCOUNT":"BUYER ACCOUNT"}</span>
   <h1>{supplier?"Supplier details":"Your store account"}</h1>
   <p>{supplier?"Complete your company details for the store team to review. Supplier verification does not approve any product listing or purchase order.":"Welcome to your buyer profile. Your account is separate from Anime subscribers and Manga readers. Shopping and delivery features will appear when the store is available."}</p>
  </section>
  {p.error&&<p className="store-message" role="alert">{errors[p.error]??"Unable to complete the request."}</p>}
  {p.notice==="submitted"&&<p className="store-message" role="status">Supplier application sent for review.</p>}
  {appError&&<p className="store-message" role="alert">Could not load the supplier application.</p>}
  <div className="store-portal-grid">
   <aside className="store-profile-card"><span className="store-label">SIGNED IN AS</span><h2>{account.display_name}</h2><p>{role}</p><p>{user.email}</p></aside>
   <section className="store-portal-content">
    {supplier
     ? <><h2>{type==="wholesaler"?"Wholesale supplier application":"Lead manufacturer application"}</h2>
       <p>{type==="wholesaler"?"Tell us about the authorized products your business can supply.":"Tell us about your manufacturing services and production coordination."}</p>
       {app&&<p className="store-portal-status">Status: {states[app.status]??app.status}</p>}
       {app?.reviewer_feedback&&<p>Store team feedback: {app.reviewer_feedback}</p>}
       {editable
        ? <form action={submitSupplierApplication}>
           <label>Business contact / authorized representative<input name="legal_name" minLength={2} maxLength={160} defaultValue={app?.legal_name??""} required/></label>
           <label>Business name (if applicable)<input name="organization_name" minLength={2} maxLength={160} defaultValue={app?.organization_name??""}/></label>
           <label>Contact email<input name="contact_email" type="email" maxLength={254} defaultValue={app?.contact_email??user.email??""} required/></label>
           <label>{type==="wholesaler"?"Describe the products, brands and authorized sources you represent":"Describe your production capabilities, coordination and quality processes"}
            <textarea name="capability_statement" rows={5} minLength={20} maxLength={3000} defaultValue={app?.capability_statement??""} required/></label>
           <label className="store-portal-checkbox"><input type="checkbox" name="affirmed" required/> I confirm the details are accurate and understand that sourcing, authenticity or compliance documents may be required.</label>
           <button type="submit">{app?"Resubmit supplier details":"Submit supplier application"}</button>
          </form>
        : <p>This application cannot be edited at its current review stage.</p>}
       <p>Approved business identity is separate from product authorization, manufacturing contracts and stock acceptance.</p>
      </>
     : <><h2>Buyer profile</h2><p>Your account is ready for sign-in. No order or payment has been created through registration.</p>
        <p>Our store will eventually let buyers shop qualified merchandise and track eligible orders.</p></>}
   </section>
  </div>
 </div></main>;
}
