import Form from "next/form";
import Link from "next/link";
import {loadDirectory,directoryUrl} from "@/lib/admin/directory";

const notices:Record<string,string>={invited:"Supplier invitation sent.",reviewed:"Supplier application decision saved."};
const errors:Record<string,string>={invalid:"Review the form details.",configuration:"Supplier invitations are not configured.",invite:"Could not send invitation.",profile:"Invitation sent, but supplier account setup needs attention.",database:"Could not save the decision.",protected:"Staff accounts are managed separately.",missing:"Account not found."};
const roles=[["all","All accounts"],["buyer","Buyers"],["wholesaler","Wholesale suppliers"],["manufacturer","Lead manufacturers"]];
const roleNames:Record<string,string>={buyer:"Buyer",wholesaler:"Wholesale supplier",manufacturer:"Lead manufacturer"};
export default async function StoreAccounts({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const p=await searchParams,d=await loadDirectory(p);
 return <main className="store-accounts">
  <header className="store-heading"><div><span className="store-label">STORE OPERATIONS / PEOPLE</span><h1>Customers &amp; suppliers</h1>
   <p>Find buyers, wholesale suppliers, and manufacturers; manage sign-in access and account recovery.</p></div>
   <div className="store-head-number"><strong>{d.total}</strong><span>accounts found</span></div>
  </header>
  {d.error&&<p className="store-message" role="alert">{d.error}</p>}
  {p.error&&<p className="store-message" role="alert">{errors[p.error]??"The request failed."}</p>}
  {p.notice&&<p className="store-message" role="status">{notices[p.notice]??""}</p>}
  <nav className="store-filters-links" aria-label="Account categories">
   {roles.map(([key,label])=><Link key={key} href={directoryUrl({...d,role:key},1)} aria-current={d.role===key?"page":undefined}>{label}</Link>)}
  </nav>
  <div className="store-board store-account-only">
   <section className="store-list-card"><div className="store-list-heading"><h2>Account list</h2><span>Page {d.page} of {d.pages}</span></div>
    <Form action="/admin/accounts" className="store-search-form">
     <input type="hidden" name="role" value={d.role}/>
     <label>Search customers or suppliers<input type="search" name="q" maxLength={60} defaultValue={d.q} placeholder="Enter account name"/></label>
     <label>Account access<select name="status" defaultValue={d.status}>
      <option value="all">All accounts</option><option value="active">Can sign in</option><option value="suspended">Suspended</option>
     </select></label>
     <button type="submit">Search</button>
    </Form>
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
   
  </div>
 </main>;
}
