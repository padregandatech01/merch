import {redirect} from "next/navigation";
import {signOut} from "@/app/actions/auth";
import {decideInvitation,chooseSupplierEmail,completeSupplierAccount} from "@/app/actions/supplier-relationships";
import SubmitButton from "@/app/admin/components/submit-button";
import SupplierConversation from "@/app/components/supplier-conversation";
import {departmentId,departmentName,accountLabels} from "@/lib/portal/config";
import {getSupplierRelationship,stages} from "@/lib/supplier-relations";
const notices:Record<string,string>={
 accepted:"Invitation accepted. Choose your permanent login email and finish account setup.",
 declined:"You declined the invitation. You can still read the existing conversation.",
 sent:"Message sent.",read:"Conversation marked as read.",
 "current-email":"Your invited email is already verified. You can complete your account.",
 "verify-email":"Please complete the email verification steps before finishing your account."
};
const errors:Record<string,string>={
 message:"Write a message before sending.",database:"Unable to save. Please retry.",
 slow:"Your last message is still recent. Please check the thread.",
 closed:"This conversation is closed.",changed:"The relationship stage changed. Reload this page.",
 invalid:"Choose a valid decision.",email:"Enter a valid email address.", "email-change":"Could not request an email change.",
 "confirm-email":"Your new email must be confirmed before your account can be completed.",
 configuration:"Account configuration needs attention. Contact the department.",
 missing:"We could not find that invitation."
};
export default async function InvitationWorkspace({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const p=await searchParams;
 const {user,account,relation:r,thread}=await getSupplierRelationship(p.page);
 if(r?.status==="completed")redirect("/portal/messages");
 return <main className="sr-shell" data-dept={departmentId}>
  <header className="sr-top"><div><span className="sr-kicker">{departmentName} / Private invitation workspace</span>
   <h1>Welcome, {account.display_name}</h1>
   <p>Discuss the proposal with our team before deciding whether to become a supplier.</p></div>
   <form action={signOut}><button type="submit" className="sr-link">Sign out</button></form>
  </header>
  {p.error&&<p className="sr-alert" role="alert">{errors[p.error]??"Unable to complete the request."}</p>}
  {p.notice&&<p className="sr-alert" role="status">{notices[p.notice]??"Your request was saved."}</p>}
  {!r||!thread?<section className="sr-card"><h2>Invitation not available</h2>
   <p>We could not find an active supplier invitation for this account. Please contact the Loxada department that invited you.</p>
  </section>:<>
   <section className="sr-card">
    <div className="sr-section-heading"><h2>Your invitation</h2><span className="sr-chip">{stages[r.status]??r.status}</span></div>
    <dl className="sr-facts">
     <div><dt>Supplier role</dt><dd>{accountLabels[r.supplier_type]??r.supplier_type}</dd></div>
     <div><dt>Contact email</dt><dd>{r.invited_email}</dd></div>
    </dl>
    {["invited","discussing"].includes(r.status)&&<>
     <p>We can answer questions here. Accepting allows you to complete your account, but does not approve contracts or supplier qualifications.</p>
     <div className="sr-actions">
      <form action={decideInvitation}><input type="hidden" name="decision" value="accept"/>
       <SubmitButton label="Accept and continue" pendingLabel="Accepting..."/></form>
      <form action={decideInvitation}><input type="hidden" name="decision" value="decline"/>
       <SubmitButton label="Decline invitation" pendingLabel="Declining..."/></form>
     </div>
    </>}
    {r.status==="accepted"&&<div>
     <h2>Complete your supplier account</h2>
     <p>Keep <strong>{user.email}</strong> as your permanent login email, or choose another address. We preserve your conversations either way.</p>
     <form action={chooseSupplierEmail} className="sr-email-form">
      <label>New email (optional)<input type="email" name="email" maxLength={254} required
        defaultValue={r.requested_email??user.email??""}/></label>
      <SubmitButton label="Request email change" pendingLabel="Requesting..."/>
     </form>
     {r.requested_email&&<p className="sr-note">Requested: {r.requested_email}. Confirm the email change through the verification email(s). Signed-in email: {user.email}.</p>}
     <form className="sr-actions" action={completeSupplierAccount}>
      <SubmitButton label="Finish account setup" pendingLabel="Completing..."/>
     </form>
     <p className="sr-note">Once completed, this invitation-only workspace becomes part of your permanent supplier portal. The conversation is retained.</p>
    </div>}
    {r.status==="declined"&&<p>The invitation was declined. The team can reopen the conversation if you wish to reconsider.</p>}
    {r.status==="revoked"&&<p>This invitation has been revoked. Contact the inviting department if this was unexpected.</p>}
   </section>
   <SupplierConversation relation={r} thread={thread} viewer="supplier" baseUrl="/invitation"/>
  </>}
 </main>;
}
