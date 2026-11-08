import Link from "next/link";
import {loadDirectory,directoryUrl} from "@/lib/admin/directory";
import {inviteSupplier,reviewSupplier} from "@/app/actions/admin-accounts";

const notices:Record<string,string>={invited:"Supplier invitation sent.",reviewed:"Supplier application decision saved."};
const errors:Record<string,string>={invalid:"Review the form details.",configuration:"Supplier invitations are not configured.",invite:"Could not send invitation.",profile:"Invitation sent, but supplier account setup needs attention.",database:"Could not save the decision.",protected:"Staff accounts are managed separately.",missing:"Account not found."};
const roles=[["all","All accounts"],["buyer","Buyers"],["wholesaler","Wholesale suppliers"],["manufacturer","Lead manufacturers"]];
const roleNames:Record<string,string>={buyer:"Buyer",wholesaler:"Wholesale supplier",manufacturer:"Lead manufacturer"};
const statuses:Record<string,string>={pending:"To review",needs_info:"More details requested",verified:"Supplier verified",rejected:"Declined",suspended:"Application suspended"};
export default async function StoreAccounts({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const p=await searchParams,d=await loadDirectory(p);
 return <main className="store-accounts">
  <header className="store-heading"><div><span className="store-label">STORE OPERATIONS / PEOPLE</span><h1>Customers &amp; suppliers</h1>
   <p>Manage buyer accounts and businesses supplying our merchandise store.</p></div>
   <div className="store-head-number"><strong>{d.total}</strong><span>accounts found</span></div>
  </header>
  {d.error&&<p className="store-message" role="alert">{d.error}</p>}
  {p.error&&<p className="store-message" role="alert">{errors[p.error]??"The request failed."}</p>}
  {p.notice&&<p className="store-message" role="status">{notices[p.notice]??""}</p>}
  <nav className="store-filters-links" aria-label="Account categories">
   {roles.map(([key,label])=><Link key={key} href={directoryUrl({...d,role:key},1)} aria-current={d.role===key?"page":undefined}>{label}</Link>)}
  </nav>
  <div className="store-board">
   <section className="store-list-card"><div className="store-list-heading"><h2>Account list</h2><span>Page {d.page} of {d.pages}</span></div>
    <form method="get" action="/admin/accounts" className="store-search-form">
     <input type="hidden" name="role" value={d.role}/>
     <label>Search customers or suppliers<input type="search" name="q" maxLength={60} defaultValue={d.q} placeholder="Enter account name"/></label>
     <label>Account access<select name="status" defaultValue={d.status}>
      <option value="all">All accounts</option><option value="active">Can sign in</option><option value="suspended">Suspended</option>
     </select></label>
     <button type="submit">Search</button>
    </form>
    <div className="store-table-scroll"><table className="store-table">
     <thead><tr><th>Account name</th><th>Group</th><th>Sign-in</th><th>Joined</th><th></th></tr></thead>
     <tbody>{d.people.map(person=><tr key={person.user_id}>
      <td><strong>{person.display_name}</strong></td>
      <td>{roleNames[person.account_type]??person.account_type}</td>
      <td><span className={"store-state "+(person.status==="active"?"is-active":"is-suspended")}>{person.status==="active"?"Allowed":"Suspended"}</span></td>
      <td>{new Date(person.created_at).toLocaleDateString("en-PH")}</td>
      <td><Link className="store-link" href={"/admin/accounts/"+person.user_id}>Manage</Link></td>
     </tr>)}</tbody>
    </table></div>
    {!d.people.length&&!d.error&&<p className="store-muted">No accounts match your filters.</p>}
    <div className="store-pages">
     {d.page>1?<Link href={directoryUrl(d,d.page-1)}>Previous</Link>:<span/>}<span>{d.page} / {d.pages}</span>
     {d.page<d.pages?<Link href={directoryUrl(d,d.page+1)}>Next</Link>:<span/>}
    </div>
   </section>
   <aside className="store-taskbar">
    <section className="store-task-card"><span className="store-label">NEW BUSINESS CONTACT</span><h2>Invite a supplier</h2>
     <p>Wholesale suppliers and lead manufacturers join through an invitation from the store team.</p>
     <details><summary>Invite supplier</summary>
      <form action={inviteSupplier} className="store-task-form">
       <label>Contact name<input name="display_name" minLength={2} maxLength={80} required/></label>
       <label>Contact email<input type="email" name="email" maxLength={254} required/></label>
       <label>Supplier type<select name="account_type" required>
        <option value="wholesaler">Wholesale supplier</option>
        <option value="manufacturer">Lead manufacturer</option>
       </select></label>
       <button type="submit">Send invite</button>
      </form>
     </details>
    </section>
    <section className="store-task-card"><span className="store-label">SUPPLIER CHECKS</span><h2>Review applications</h2>
     <p>{d.pending} of the latest {d.requests.length} applications are waiting for a decision or missing information.</p>
     {!d.requests.length&&<p className="store-muted">No supplier applications yet.</p>}
     {d.requests.map(req=><details key={req.id} className="store-application">
      <summary><span><strong>{req.legal_name}</strong><small>{statuses[req.status]??req.status}</small></span><span aria-hidden="true">+</span></summary>
      <p>{req.organization_name??"Independent applicant"} · {req.contact_email}</p>
      <p className="store-supplier-description">{req.capability_statement}</p>
      {req.reviewer_feedback&&<p>Feedback: {req.reviewer_feedback}</p>}
      <Link className="store-link" href={"/admin/accounts/"+req.user_id}>View supplier account</Link>
      <form className="store-task-form" action={reviewSupplier}>
       <input type="hidden" name="application_id" value={req.id}/>
       <label>Decision<select name="status" defaultValue="needs_info">
        <option value="verified">Verify supplier</option><option value="needs_info">Ask for details</option>
        <option value="rejected">Decline application</option><option value="suspended">Suspend application</option>
       </select></label>
       <label>Message to supplier<input name="reviewer_feedback" maxLength={1000} placeholder="Required unless verified"/></label>
       <button type="submit">Save review</button>
      </form>
     </details>)}
    </section>
   </aside>
  </div>
 </main>;
}
