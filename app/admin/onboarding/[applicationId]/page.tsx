import Link from "next/link";
import {loadApplication} from "@/lib/admin/onboarding";
import {accountLabels} from "@/lib/portal/config";
import {reviewSupplier} from "@/app/actions/admin-accounts";
import SubmitButton from "@/app/admin/components/submit-button";
const labels:Record<string,string>={pending:"Waiting for review",needs_info:"More information requested",verified:"Applicant verified",rejected:"Application declined",suspended:"Application suspended"};
const errors:Record<string,string>={invalid:"Choose a decision and provide feedback when required.",configuration:"The application cannot be updated until admin settings are configured.",database:"Could not save the decision.",changed:"This application was updated by someone else. Review its current status and try again."};
export default async function ReviewApplication({params,searchParams}:{params:Promise<{applicationId:string}>;searchParams:Promise<Record<string,string|undefined>>}){
 const {applicationId}=await params;
 const {application,account}=await loadApplication(applicationId);
 const p=await searchParams;
 return <main className="store-accounts">
  <Link className="store-link" href="/admin/onboarding">← Back to applications</Link>
  <header className="store-heading" style={{marginTop:18}}>
   <div><span className="store-label">MERCHANDISE / APPLICATION REVIEW</span>
    <h1>{application.legal_name}</h1>
    <p>Merchandise supplier · {labels[application.status]??application.status}</p></div>
  </header>
  {p.error&&<p className="store-message" role="alert">{errors[p.error]??"This application could not be updated."}</p>}
  {p.notice==="reviewed"&&<p className="store-message" role="status">Review decision saved.</p>}
  <section className="store-list-card admin-work-detail" style={{marginTop:22}}>
   <h2>Applicant details</h2>
   <div className="admin-work-facts">
    <div><strong>Contact email</strong><p>{application.contact_email}</p></div>
    <div><strong>Organization</strong><p>{application.organization_name??"Individual applicant"}</p></div>
    <div><strong>Account type</strong><p>{account?accountLabels[account.account_type]??account.account_type:"Unavailable"}</p></div>
    <div><strong>Account sign-in</strong><p>{account?.status==="active"?"Allowed":account?.status==="suspended"?"Suspended":"Unavailable"}</p></div>
   </div>
   <h2>Applicant statement</h2><p>{application.capability_statement}</p>
   {application.reviewer_feedback&&<p><strong>Previous feedback:</strong> {application.reviewer_feedback}</p>}
   <p>Verifying an applicant is separate from approving licenses, contracts, products, or content.</p>
   <div className="admin-work-actions">
    <Link className="store-link" href={"/admin/accounts/"+application.user_id}>View account access</Link>
   </div>
  </section>
  <section className="store-list-card admin-work-detail" style={{marginTop:18}}>
   <h2>Review supplier</h2>
   <p>Choose a decision and provide clear feedback. A verification does not grant business or staff permissions.</p>
   <form className="admin-work-review" action={reviewSupplier}>
    <input type="hidden" name="application_id" value={application.id}/>
    <input type="hidden" name="expected_status" value={application.status}/>
    <label>Decision<select name="status" required defaultValue="">
     <option value="" disabled>Choose a decision</option>
     <option value="verified">Verify applicant</option>
     <option value="needs_info">Request more information</option>
     <option value="rejected">Decline application</option>
     <option value="suspended">Suspend application</option>
    </select></label>
    <label>Message to applicant<textarea name="reviewer_feedback" rows={4} maxLength={1000} placeholder="Required for requests, declines, or suspensions"/></label>
    <SubmitButton label="Save decision" pendingLabel="Saving decision..."/>
   </form>
  </section>
 </main>;
}
