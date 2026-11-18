import SubmitButton from "@/app/admin/components/submit-button";
import Form from "next/form";
import Link from "next/link";
import AccountAnalysis from "@/app/admin/components/account-analysis";
import {accountCubeFields,accountRoute,inlineCubeUrl,parseInlineCubeView,type CubeParams} from "@/lib/admin/account-cube-model";
import {loadAccountCube} from "@/lib/admin/account-cube";
import {accountLabels,customerType,supplierTypes} from "@/lib/portal/config";
import {loadDirectory,directoryUrl} from "@/lib/admin/directory";

const notices:Record<string,string>={invited:"Supplier invitation sent.",reviewed:"Supplier application decision saved."};
const errors:Record<string,string>={invalid:"Review the form details.",configuration:"Supplier invitations are not configured.",invite:"Could not send invitation.",profile:"Invitation sent, but supplier account setup needs attention.",database:"Could not save the decision.",protected:"Staff accounts are managed separately.",missing:"Account not found."};
const roles=[["all","All accounts"],["buyer","Buyers"],["wholesaler","Wholesale suppliers"],["manufacturer","Lead manufacturers"]];
const roleNames:Record<string,string>={buyer:"Buyer",wholesaler:"Wholesale supplier",manufacturer:"Lead manufacturer"};
export default async function StoreAccounts({searchParams}:{searchParams:Promise<CubeParams>}){
 const params=await searchParams;
 const p=Object.fromEntries(Object.entries(params).filter((entry):entry is [string,string]=>typeof entry[1]==="string"));
 const view=parseInlineCubeView(params,[customerType,...supplierTypes]);
 const [d,cells]=await Promise.all([loadDirectory(p),loadAccountCube()]);
 const recordUrl=(data:Parameters<typeof directoryUrl>[0],page:number)=>inlineCubeUrl(view,directoryUrl(data,page),"account-records");
 const listUrl=directoryUrl(d,d.page);
 const listFilters=[d.q&&("Name: "+d.q),d.role!=="all"?(accountLabels[d.role]??d.role):d.roles.map(role=>accountLabels[role]??role).join(", "),d.period&&("Registered "+d.period),d.status==="active"?"Not suspended":d.status==="suspended"?"Suspended":""].filter(Boolean);
 return <main className="store-accounts">
  <header className="store-heading"><div><span className="store-label">STORE OPERATIONS / PEOPLE</span><h1>Account Access</h1>
   <p>Find buyers, wholesale suppliers, and lead manufacturers. Manage sign-in access and password recovery.</p></div>
   <div className="store-head-number"><strong>{d.error?"—":d.total}</strong><span>{d.error?"count unavailable":"accounts found"}</span></div>
  </header>
  <AccountAnalysis view={view} cells={cells} listUrl={listUrl} checkedAt={cells===null?null:new Date().toISOString()}/>
  <div id="account-records" tabIndex={-1}>
  {listFilters.length?<div className="ac-account-filter"><span>Account list filters: {listFilters.join(" · ")}</span>
   <Link className="sr-link" href={recordUrl({q:"",role:"all",roles:[],period:"",status:"all"},1)}>Clear list filters</Link></div>:null}
  {d.error&&<p className="store-message" role="alert">{d.error}</p>}
  {p.error&&<p className="store-message" role="alert">{errors[p.error]??"The request failed."}</p>}
  {p.notice&&<p className="store-message" role="status">{notices[p.notice]??""}</p>}
  <nav className="store-filters-links" aria-label="Account categories">
   {roles.map(([key,label])=><Link key={key} href={recordUrl({...d,role:key,roles:[]},1)} aria-current={d.role===key&&!d.roles.length?"page":undefined}>{label}</Link>)}
  </nav>
  <div className="store-board store-account-only">
   <section className="store-list-card"><div className="store-list-heading"><h2>Accounts</h2><span>Page {d.page} of {d.pages}</span></div>
    <Form action={accountRoute+"#account-records"} key={listUrl} className="store-search-form">
     {Array.from(accountCubeFields(view),([name,value])=><input type="hidden" key={name} name={name} value={value}/>)}
     <input type="hidden" name="role" value={d.role}/>
     {d.roles.length?<input type="hidden" name="roles" value={d.roles.join(",")}/>:null}
     {d.period?<input type="hidden" name="period" value={d.period}/>:null}
     <label>Search customers or suppliers<input type="search" name="q" maxLength={60} defaultValue={d.q} placeholder="Enter account name"/></label>
     <label>Account access<select name="status" defaultValue={d.status}>
      <option value="all">All accounts</option><option value="active">Not suspended</option><option value="suspended">Suspended</option>
     </select></label>
     <SubmitButton label="Search" pendingLabel="Searching..."/>
    </Form>
    <div className="store-table-scroll"><table className="store-table">
     <thead><tr><th>Account name</th><th>Group</th><th>Sign-in</th><th>Joined</th><th></th></tr></thead>
     <tbody>{d.people.map(person=><tr key={person.user_id}>
      <td><strong>{person.display_name}</strong></td>
      <td>{roleNames[person.account_type]??person.account_type}</td>
      <td><span className={"store-state "+(person.status==="active"?"is-active":"is-suspended")}>{person.status==="active"?"Not suspended":"Suspended"}</span></td>
      <td>{new Date(person.created_at).toLocaleDateString("en-PH",{timeZone:"Asia/Manila"})}</td>
      <td><Link className="store-link" href={"/admin/accounts/"+person.user_id}>Manage account</Link></td>
     </tr>)}</tbody>
    </table></div>
    {!d.people.length&&!d.error&&<p className="store-muted">No accounts match your filters.</p>}
    <div className="store-pages">
     {d.page>1?<Link href={recordUrl(d,d.page-1)}>Previous</Link>:<span/>}<span>{d.page} / {d.pages}</span>
     {d.page<d.pages?<Link href={recordUrl(d,d.page+1)}>Next</Link>:<span/>}
    </div>
   </section>
   
  </div>
  </div>
 </main>;
}
