import Link from "next/link";
import {notFound} from "next/navigation";
import {requireAdmin} from "@/lib/auth/authorization";
import {createAdminClient} from "@/lib/supabase/admin";
import {accountLabels,departmentId,departmentName} from "@/lib/portal/config";
import {renameAccount,setAccountStatus,sendRecoveryEmail} from "@/app/actions/admin-account-controls";

const isUuid=(s:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(s);
const messages:Record<string,string>={renamed:"Display name updated.",unchanged:"No changes needed.",suspended:"Account suspended. Portal access is blocked.",reactivated:"Account reactivated.",recovery:"Password-recovery email requested.",recovery_unlogged:"Recovery email requested, but its audit entry could not be saved."};
const errors:Record<string,string>={invalid:"Check the display name.",changed:"The account has changed. Review the current state and retry.",reason:"Provide an 8–500 character suspension reason and confirmation.",configuration:"Email configuration is missing.",database:"Database operation failed.",email:"Recovery email could not be sent.",cooldown:"A recovery email was requested recently. Try again later."};
export default async function ManageAccount({params,searchParams}:{params:Promise<{userId:string}>;searchParams:Promise<{error?:string;notice?:string}>}){
 await requireAdmin();
 const {userId}=await params;
 if(!isUuid(userId))notFound();
 const db=createAdminClient();
 if(!db)return <main className="portal-admin" data-brand={departmentId}><div className="portal-card portal-wide"><h1>Account management</h1><p className="portal-alert">Server settings are missing.</p></div></main>;
 const [{data:account,error:aError},{data:staff,error:sError}]=await Promise.all([
  db.from("portal_accounts").select("user_id,display_name,account_type,status,suspension_reason,created_at").eq("user_id",userId).maybeSingle(),
  db.from("staff_roles").select("user_id").eq("user_id",userId).maybeSingle()
 ]);
 if(aError||sError||staff||!account)notFound();
 const [{data:authUser},{data:history},{data:application}]=await Promise.all([
  db.auth.admin.getUserById(userId),
  db.from("portal_account_audit").select("id,action,note,created_at").eq("subject_user_id",userId).order("created_at",{ascending:false}).limit(25),
  db.from("supplier_applications").select("status,legal_name,reviewer_feedback").eq("user_id",userId).maybeSingle()
 ]);
 const p=await searchParams,email=authUser?.user?.email;
 return <main className="portal-admin" data-brand={departmentId}><div className="portal-card portal-wide">
  <Link href="/admin/accounts" className="portal-inline-link">← Accounts</Link>
  <div className="portal-account-detail-heading">
   <div><span className="portal-eyebrow">{departmentName} / Account</span>
    <h1>{account.display_name}</h1><p>{accountLabels[account.account_type]??account.account_type} · {email??"Email unavailable"}</p></div>
   <span className="portal-pill">{account.status}</span>
  </div>
  {p.notice&&<p role="status" className="portal-notice">{messages[p.notice]??""}</p>}
  {p.error&&<p role="alert" className="portal-alert">{errors[p.error]??"Request failed."}</p>}
  <div className="portal-summary-grid">
   <div><small>Created</small><strong>{new Date(account.created_at).toLocaleDateString("en-PH")}</strong></div>
   <div><small>Email</small><strong>{authUser?.user?.email_confirmed_at?"Verified":"Not verified"}</strong></div>
   <div><small>Last login</small><strong>{authUser?.user?.last_sign_in_at?new Date(authUser.user.last_sign_in_at).toLocaleDateString("en-PH"):"No recorded sign-in"}</strong></div>
  </div>
  {account.status==="suspended"&&<p className="portal-alert"><strong>Reason:</strong> {account.suspension_reason}</p>}
  <section className="portal-section"><h2>Display name</h2><p>Identity type and staff permissions are not editable here.</p>
   <form action={renameAccount} className="portal-inline-form">
    <input type="hidden" name="user_id" value={userId}/>
    <label>Name<input name="display_name" defaultValue={account.display_name} minLength={2} maxLength={80} required/></label>
    <button type="submit" className="portal-outline">Save</button>
   </form>
  </section>
  <section className="portal-section"><h2>Portal access</h2>
   <p>Suspension blocks department access and supplier submissions, but does not delete business records or supplier decisions.</p>
   <form action={setAccountStatus}><input type="hidden" name="user_id" value={userId}/>
    <input type="hidden" name="expected_status" value={account.status}/>
    {account.status==="active"
     ? <><input type="hidden" name="status" value="suspended"/>
       <label>Suspension reason<textarea name="reason" minLength={8} maxLength={500} rows={3} required/></label>
       <label className="portal-check"><input type="checkbox" name="confirm" required/> Block this account's department access.</label>
       <button type="submit" className="portal-danger">Suspend account</button></>
     : <><input type="hidden" name="status" value="active"/><button type="submit" className="portal-primary">Reactivate account</button></>}
   </form>
  </section>
  <section className="portal-section"><h2>Password recovery</h2>
   <p>Request a recovery email for the account holder. Administrators cannot see or set their password.</p>
   <form action={sendRecoveryEmail}><input type="hidden" name="user_id" value={userId}/>
    <button type="submit" disabled={!email} className="portal-outline">Send recovery email</button>
   </form>
  </section>
  {application&&<section className="portal-section"><h2>Supplier application</h2>
   <p>{application.legal_name} · {application.status.replaceAll("_"," ")}</p>
   {application.reviewer_feedback&&<p>{application.reviewer_feedback}</p>}
   <Link className="portal-inline-link" href="/admin/accounts">Supplier reviews</Link>
  </section>}
  <section className="portal-section"><h2>Recent account changes</h2>
   {!history?.length&&<p>None recorded.</p>}
   <ol className="portal-audit-list">{history?.map(h=><li key={h.id}>
    <strong>{h.action.replaceAll("_"," ")}</strong><span>{new Date(h.created_at).toLocaleString("en-PH")}</span>
    {h.note&&<p>{h.note}</p>}
   </li>)}</ol>
  </section>
 </div></main>;
}
