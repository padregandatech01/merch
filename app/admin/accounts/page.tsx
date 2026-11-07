import {requireAdmin} from "@/lib/auth/authorization";
import {createClient} from "@/lib/supabase/server";
import {accountLabels,departmentId,departmentName,invitationTypes} from "@/lib/portal/config";
import {inviteSupplier,reviewSupplier} from "@/app/actions/admin-accounts";
const notices:Record<string,string>={invited:"Invitation requested. The invited user must accept and set a password.",reviewed:"Application decision saved."};
const errors:Record<string,string>={invalid:"Check the submitted details.",configuration:"Server-side invitation credentials or APP_ORIGIN are not configured.",invite:"Invitation failed. The address may already have an account.",profile:"Invitation was sent but role assignment failed. Investigate before re-inviting.",database:"Unable to update the application."};
export default async function AccountManagement({searchParams}:{searchParams:Promise<{error?:string;notice?:string}>}) {
 await requireAdmin();
 const db=await createClient();
 const [{data:accounts,error:accountError},{data:applications,error:applicationError}]=await Promise.all([
  db.from("portal_accounts").select("user_id,display_name,account_type,created_at").order("created_at",{ascending:false}).limit(100),
  db.from("supplier_applications").select("id,user_id,legal_name,organization_name,contact_email,capability_statement,status,reviewer_feedback,created_at").order("created_at",{ascending:false}).limit(100)
 ]);
 const params=await searchParams;
 return <main className="portal-admin" data-brand={departmentId}>
  <div className="portal-card portal-wide">
   <span className="portal-eyebrow">{departmentName} / Department Admin</span>
   <h1>Account management</h1>
   <p>Account identity, supplier application, and business authorization remain separate.</p>
   {params.error&&<p className="portal-alert" role="alert">{errors[params.error]??"Request failed."}</p>}
   {params.notice&&<p className="portal-notice" role="status">{notices[params.notice]??""}</p>}
   {(accountError||applicationError)&&<p className="portal-alert">Could not load all records; check the database policies.</p>}
   <section className="portal-section">
    <h2>Invite business supplier</h2>
    <p>Only department administrators can initiate supplier invitations.</p>
    <form action={inviteSupplier} className="portal-grid-form">
     <label>Display name<input name="display_name" minLength={2} maxLength={80} required/></label>
     <label>Email<input name="email" type="email" maxLength={254} required/></label>
     <label>Supplier category<select name="account_type" required>{invitationTypes.map(type=><option key={type} value={type}>{accountLabels[type]}</option>)}</select></label>
     <button className="portal-primary" type="submit">Send invitation</button>
    </form>
   </section>
   <section className="portal-section">
    <h2>Supplier reviews</h2>
    {!applications?.length&&<p>No supplier applications submitted.</p>}
    {applications?.map(app=><article className="portal-record" key={app.id}>
      <div><strong>{app.legal_name}</strong><span className="portal-pill">{app.status.replaceAll("_"," ")}</span></div>
      <p>{app.organization_name??"Individual"} · {app.contact_email}</p>
      <p>{app.capability_statement}</p>
      {app.reviewer_feedback&&<p>Feedback: {app.reviewer_feedback}</p>}
      <form className="portal-review" action={reviewSupplier}>
       <input type="hidden" name="application_id" value={app.id}/>
       <label>Decision<select name="status" defaultValue="needs_info">
        <option value="verified">Verified supplier application</option><option value="needs_info">Request more information</option><option value="rejected">Reject application</option><option value="suspended">Suspend supplier</option>
       </select></label>
       <label>Reviewer feedback<input name="reviewer_feedback" maxLength={1000} placeholder="Required for non-verified decisions"/></label>
       <button className="portal-outline" type="submit">Save decision</button>
      </form>
    </article>)}
   </section>
   <section className="portal-section"><h2>Department accounts</h2>
    {!accounts?.length&&<p>No accounts to display.</p>}
    <div className="portal-table-wrap"><table><thead><tr><th>Display name</th><th>Account</th><th>Created</th></tr></thead>
    <tbody>{accounts?.map(a=><tr key={a.user_id}><td>{a.display_name}</td><td>{accountLabels[a.account_type]??a.account_type}</td><td>{new Date(a.created_at).toLocaleDateString("en-PH")}</td></tr>)}</tbody></table></div>
   </section>
  </div>
 </main>;
}
