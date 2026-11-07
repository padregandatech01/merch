import Link from "next/link";
import {signOut} from "@/app/actions/auth";
import {submitSupplierApplication} from "@/app/actions/onboarding";
import {requirePortal} from "@/lib/auth/authorization";
import {accountLabels,departmentId,departmentName,isSupplier} from "@/lib/portal/config";
const errors:Record<string,string>={unauthorized:"This account cannot apply as a supplier.",invalid:"Check your application details and confirmation.",database:"The application could not be saved.",locked:"This application is already under review."};
const notes:Record<string,string>={submitted:"Your application information was saved. An administrator will review it."};
export default async function Portal({searchParams}:{searchParams:Promise<{error?:string;notice?:string}>}) {
 const {user,account,db}=await requirePortal();
 const params=await searchParams;
 const supplier=isSupplier(account.account_type);
 const {data:application,error:appError}=supplier
  ? await db.from("supplier_applications").select("id,status,legal_name,organization_name,contact_email,capability_statement,reviewer_feedback,updated_at").eq("user_id",user.id).maybeSingle()
  : {data:null,error:null};
 const editable=supplier && (!application || application.status==="needs_info");
 return <main className="portal-screen" data-brand={departmentId}>
  <div className="portal-card portal-wide">
   <header className="portal-top"><span className="portal-eyebrow">LOXADA / {departmentName}</span><form action={signOut}><button className="portal-outline" type="submit">Log out</button></form></header>
   <h1>{account.display_name}</h1>
   <p className="portal-account-type">{accountLabels[account.account_type]??"Account"} account · {user.email}</p>
   {params.error&&<p className="portal-alert" role="alert">{errors[params.error]??"Unable to complete request."}</p>}
   {params.notice&&<p className="portal-notice" role="status">{notes[params.notice]??""}</p>}
   {appError&&<p className="portal-alert">Could not load the supplier application.</p>}
   {!supplier
    ? <section className="portal-section"><h2>Account ready</h2><p>Your department account is active. The {accountLabels[account.account_type]?.toLowerCase()} business features will appear here when implemented; no sample purchases, subscriptions or reading records have been created.</p></section>
    : <section className="portal-section"><h2>Supplier application</h2>
      <p>Application review is separate from legal rights clearance, content approval and financial authorization.</p>
      {application&&<div className="portal-status"><strong>Status: {application.status.replaceAll("_"," ")}</strong>
      {application.reviewer_feedback&&<p>Reviewer feedback: {application.reviewer_feedback}</p>}</div>}
      {editable&&<form className="portal-application-form" action={submitSupplierApplication}>
       <label htmlFor="legal-name">Legal name / authorized representative</label>
       <input id="legal-name" name="legal_name" minLength={2} maxLength={160} defaultValue={application?.legal_name??""} required/>
       <label htmlFor="org-name">Organization name (if applicable)</label>
       <input id="org-name" name="organization_name" minLength={2} maxLength={160} defaultValue={application?.organization_name??""}/>
       <label htmlFor="contact-email">Business contact email</label>
       <input id="contact-email" name="contact_email" type="email" maxLength={254} defaultValue={application?.contact_email??user.email??""} required/>
       <label htmlFor="capability-statement">Explain your supplier role, relevant ownership or authorization, and what you intend to supply</label>
       <textarea id="capability-statement" name="capability_statement" minLength={20} maxLength={3000} rows={5} defaultValue={application?.capability_statement??""} required/>
       <label className="portal-check"><input type="checkbox" name="affirmed" required/> I confirm these details are accurate and understand that evidence may be requested during review.</label>
       <button className="portal-primary" type="submit">{application?"Save requested information":"Submit application"}</button>
      </form>}
     </section>}
   <p className="portal-hint"><Link className="portal-inline-link" href="/login">Account sign-in</Link></p>
  </div>
 </main>;
}
