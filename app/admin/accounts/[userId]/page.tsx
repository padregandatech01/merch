import Link from "next/link";
import {loadAccount} from "@/lib/admin/account-detail";
import {renameAccount,setAccountStatus,sendRecoveryEmail} from "@/app/actions/admin-account-controls";

const labels:Record<string,string>={buyer:"Buyer",wholesaler:"Wholesale supplier",manufacturer:"Lead manufacturer"};
const messages:Record<string,string>={renamed:"Account name saved.",unchanged:"No changes were needed.",suspended:"Account sign-in suspended.",reactivated:"Account access restored.",recovery:"Password reset email requested.",recovery_unlogged:"Email requested, but the activity record could not be saved."};
const errors:Record<string,string>={invalid:"Check the account name.",changed:"The account changed. Review its status and try again.",reason:"Enter a reason of at least 8 characters and confirm.",configuration:"Password recovery is not configured.",database:"The change could not be saved.",email:"Could not send the reset email.",cooldown:"A reset email was requested recently."};
const decisions:Record<string,string>={pending:"Waiting for review",needs_info:"More details required",verified:"Supplier verified",rejected:"Declined",suspended:"Application suspended"};
export default async function StoreAccount({params,searchParams}:{params:Promise<{userId:string}>;searchParams:Promise<Record<string,string|undefined>>}){
 const {userId}=await params;
 const {account,authUser,history,application}=await loadAccount(userId);
 const p=await searchParams;
 return <main className="store-detail">
  <Link href="/admin/accounts" className="store-link">← Back to customers &amp; suppliers</Link>
  <header className="store-detail-head"><div><span className="store-label">STORE ACCOUNT RECORD</span><h1>{account.display_name}</h1>
    <p>{labels[account.account_type]??account.account_type} · {authUser?.email??"Email unavailable"}</p></div>
   <span className={"store-state "+(account.status==="active"?"is-active":"is-suspended")}>{account.status==="active"?"Can sign in":"Suspended"}</span>
  </header>
  {p.notice&&<p className="store-message" role="status">{messages[p.notice]??""}</p>}
  {p.error&&<p className="store-message" role="alert">{errors[p.error]??"Could not complete the action."}</p>}
  <div className="store-detail-grid">
   <section className="store-record-sheet">
    <h2>Customer or supplier details</h2>
    <dl className="store-facts"><div><dt>Account type</dt><dd>{labels[account.account_type]??account.account_type}</dd></div>
      <div><dt>Joined</dt><dd>{new Date(account.created_at).toLocaleDateString("en-PH")}</dd></div>
      <div><dt>Email address</dt><dd>{authUser?.email_confirmed_at?"Verified":"Not verified"}</dd></div>
      <div><dt>Last sign-in</dt><dd>{authUser?.last_sign_in_at?new Date(authUser.last_sign_in_at).toLocaleDateString("en-PH"):"Not recorded"}</dd></div></dl>
    <form className="store-rename-form" action={renameAccount}><input type="hidden" name="user_id" value={userId}/>
     <label>Account display name<input name="display_name" defaultValue={account.display_name} minLength={2} maxLength={80} required/></label>
     <button type="submit">Save name</button>
    </form>
    {application&&<section className="store-subsection"><h2>Supplier application</h2>
      <p>{application.legal_name} · {decisions[application.status]??application.status}</p>
      {application.reviewer_feedback&&<p>Review notes: {application.reviewer_feedback}</p>}
      <p className="store-muted">Supplier verification does not approve an item for sale or authorize purchase orders.</p>
      <Link className="store-link" href="/admin/accounts">Review supplier applications</Link>
     </section>}
    <section className="store-subsection"><h2>Account change history</h2>
     {!history.length&&<p className="store-muted">No changes recorded.</p>}
     <ol className="store-history">{history.map(h=><li key={h.id}><strong>{({account_suspended:"Account suspended",account_reactivated:"Account reactivated",display_name_changed:"Name changed",recovery_email_sent:"Password email requested"} as Record<string,string>)[h.action]??h.action}</strong>
      <small>{new Date(h.created_at).toLocaleString("en-PH")}</small>{h.note&&<p>{h.note}</p>}</li>)}</ol>
    </section>
   </section>
   <aside className="store-record-actions">
    <section className="store-task-card"><span className="store-label">SIGN-IN CONTROL</span><h2>{account.status==="active"?"Suspend access":"Restore access"}</h2>
     <p>Controls whether the buyer or supplier can sign in. Existing orders, contracts, and review decisions are not deleted.</p>
     {account.status==="suspended"&&<p><strong>Current reason:</strong> {account.suspension_reason}</p>}
     <form className="store-task-form" action={setAccountStatus}>
      <input type="hidden" name="user_id" value={userId}/><input type="hidden" name="expected_status" value={account.status}/>
      {account.status==="active"?<><input type="hidden" name="status" value="suspended"/>
       <label>Reason for suspension<textarea name="reason" rows={3} minLength={8} maxLength={500} required/></label>
       <label className="store-checkbox"><input type="checkbox" name="confirm" required/> Stop this account from signing in.</label>
       <button type="submit" className="store-danger">Suspend sign-in</button>
      </>:<><input type="hidden" name="status" value="active"/><button type="submit">Restore sign-in</button></>}
     </form>
    </section>
    <section className="store-task-card"><span className="store-label">ACCOUNT HELP</span><h2>Reset password</h2>
     <p>Send the account owner a reset email. Store administrators do not see passwords.</p>
     <form action={sendRecoveryEmail}><input type="hidden" name="user_id" value={userId}/>
      <button disabled={!authUser?.email} type="submit">Send reset email</button></form>
    </section>
   </aside>
  </div>
 </main>;
}
