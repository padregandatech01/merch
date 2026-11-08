import Link from "next/link";
import Form from "next/form";
import {loadOnboarding,onboardingUrl} from "@/lib/admin/onboarding";
const labels:Record<string,string>={pending:"Waiting for review",needs_info:"More information requested",verified:"Applicant verified",rejected:"Application declined",suspended:"Application suspended"};
const notices:Record<string,string>={invited:"Invitation requested. The recipient must accept the email to finish setting up their account."};
export default async function OnboardingQueue({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const p=await searchParams;
 const d=await loadOnboarding(p);
 return <main className="store-accounts">
  <header className="store-heading admin-work-header">
   <div><span className="store-label">MERCHANDISE / ONBOARDING</span>
    <h1>Supplier onboarding</h1>
    <p>Review wholesale suppliers and lead manufacturers. Invite new businesses on their own page.</p></div>
   <Link className="store-link" href="/admin/onboarding/invite">Invite a supplier</Link>
  </header>
  {d.error&&<p className="store-message" role="alert">{d.error}</p>}
  {p.notice&&<p className="store-message" role="status">{notices[p.notice]??""}</p>}
  <section className="store-list-card" style={{marginTop:20}}>
   <div className="admin-work-header"><h2>Applications to review</h2><span>{d.pending} waiting for action</span></div>
   <Form className="store-search-form admin-work-filter" action="/admin/onboarding">
    <label>Find an applicant<input type="search" name="q" defaultValue={d.q} placeholder="Search legal name" maxLength={60}/></label>
    <label>Review status<select name="status" defaultValue={d.status}>
     <option value="action">Needs attention</option>
     <option value="all">All applications</option>
     <option value="pending">New applications</option>
     <option value="needs_info">Waiting for more details</option>
     <option value="verified">Verified applicants</option>
     <option value="rejected">Declined</option>
     <option value="suspended">Suspended applications</option>
    </select></label>
    <button type="submit">Apply</button>
   </Form>
   <div className="admin-work-queue">
    {d.requests.map(req=><article key={req.id} className="admin-work-request">
     <div><strong>{req.legal_name}</strong>
      <small>{req.organization_name??"Supplier"} · {labels[req.status]??req.status}</small>
      <small>Submitted {new Date(req.created_at).toLocaleDateString("en-PH")}</small></div>
     <Link className="store-link" href={"/admin/onboarding/"+req.id}>Open application</Link>
    </article>)}
    {!d.requests.length&&!d.error&&<p>No applications match these filters.</p>}
   </div>
   <nav aria-label="Application pages" className="store-pages">
    {d.page>1?<Link href={onboardingUrl(d,d.page-1)}>Previous</Link>:<span/>}
    <span>Page {d.page} of {d.pages} · {d.total} matching</span>
    {d.page<d.pages?<Link href={onboardingUrl(d,d.page+1)}>Next</Link>:<span/>}
   </nav>
  </section>
 </main>;
}
