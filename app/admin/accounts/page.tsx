import Link from "next/link";
import {requireAdmin} from "@/lib/auth/authorization";
import {createAdminClient} from "@/lib/supabase/admin";
import {accountLabels,customerType,departmentId,departmentName,invitationTypes,supplierTypes} from "@/lib/portal/config";
import {inviteSupplier,reviewSupplier} from "@/app/actions/admin-accounts";

const PAGE=20;
const messages:Record<string,string>={invited:"Invitation requested. The user must accept it.",reviewed:"Supplier decision saved."};
const errors:Record<string,string>={invalid:"Check the submitted details.",configuration:"Account management needs server configuration.",invite:"Invitation failed.",profile:"Invitation sent but profile assignment failed.",database:"Database operation failed.",protected:"Staff accounts are managed separately.",missing:"Account not found."};
export default async function Accounts({searchParams}:{searchParams:Promise<{q?:string;type?:string;status?:string;page?:string;notice?:string;error?:string}>}){
 await requireAdmin();
 const p=await searchParams,db=createAdminClient();
 const q=String(p.q??"").trim().replace(/[%_,]/g,"").slice(0,60);
 const type=["customer","supplier"].includes(p.type??"")?p.type:"all";
 const status=["active","suspended"].includes(p.status??"")?p.status:"all";
 const n=Number(p.page??"1"),page=Number.isSafeInteger(n)&&n>=1&&n<=10000?n:1;
 const filters=new URLSearchParams();
 if(q)filters.set("q",q);
 if(type!=="all")filters.set("type",type??"all");
 if(status!=="all")filters.set("status",status??"all");
 function urlForPage(x:number){const u=new URLSearchParams(filters);u.set("page",String(x));return "/admin/accounts?"+u.toString();}
 if(!db)return <main className="portal-admin" data-brand={departmentId}><div className="portal-card portal-wide"><h1>Account management</h1><p className="portal-alert">Server credentials are not configured.</p></div></main>;
 const {data:staff,error:staffError}=await db.from("staff_roles").select("user_id");
 if(staffError)return <main className="portal-admin" data-brand={departmentId}><div className="portal-card portal-wide"><h1>Account management</h1><p className="portal-alert">Cannot confirm staff permissions.</p></div></main>;
 let query=db.from("portal_accounts").select("user_id,display_name,account_type,status,created_at",{count:"exact"}).order("created_at",{ascending:false});
 for(const member of staff??[])query=query.neq("user_id",member.user_id);
 if(q)query=query.ilike("display_name","%"+q+"%");
 if(type==="customer")query=query.eq("account_type",customerType);
 if(type==="supplier")query=query.in("account_type",[...supplierTypes]);
 if(status!=="all")query=query.eq("status",status);
 const [accountsResult,appsResult]=await Promise.all([
  query.range((page-1)*PAGE,page*PAGE-1),
  db.from("supplier_applications").select("id,user_id,legal_name,organization_name,contact_email,capability_statement,status,reviewer_feedback").order("created_at",{ascending:false}).limit(30)
 ]);
 const accounts=accountsResult.data??[],apps=appsResult.data??[];
 const count=accountsResult.count??0;
 const pages=Math.max(1,Math.ceil(count/PAGE));
 const pending=apps.filter(a=>a.status==="pending"||a.status==="needs_info").length;
 return <main className="portal-admin" data-brand={departmentId}><div className="portal-card portal-wide">
  <span className="portal-eyebrow">{departmentName} / Department Admin</span><h1>Account management</h1>
  <p>Manage customer and supplier identities for this department. Staff privileges and business rights are separate.</p>
  {p.error&&<p className="portal-alert" role="alert">{errors[p.error]??"Could not complete the request."}</p>}
  {p.notice&&<p className="portal-notice" role="status">{messages[p.notice]??""}</p>}
  {(accountsResult.error||appsResult.error)&&<p className="portal-alert">Some records could not be loaded.</p>}
  <section className="portal-section">
   <div className="portal-section-heading"><h2>Accounts</h2><span className="portal-muted">{count} matching</span></div>
   <form action="/admin/accounts" method="get" className="portal-filter-form">
    <label>Search name<input type="search" name="q" defaultValue={q} placeholder="Search accounts"/></label>
    <label>Account type<select name="type" defaultValue={type}>
     <option value="all">All accounts</option><option value="customer">Customers</option><option value="supplier">Suppliers</option>
    </select></label>
    <label>Status<select name="status" defaultValue={status}>
     <option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option>
    </select></label>
    <button className="portal-outline" type="submit">Apply</button>
   </form>
   <div className="portal-table-wrap"><table className="portal-account-table"><thead>
    <tr><th>Name</th><th>Type</th><th>Status</th><th>Created</th><th></th></tr>
   </thead><tbody>
    {accounts.map(a=><tr key={a.user_id}>
     <td><strong>{a.display_name}</strong></td><td>{accountLabels[a.account_type]??a.account_type}</td>
     <td><span className="portal-pill">{a.status}</span></td><td>{new Date(a.created_at).toLocaleDateString("en-PH")}</td>
     <td><Link className="portal-inline-link" href={"/admin/accounts/"+a.user_id}>Manage</Link></td>
    </tr>)}
   </tbody></table></div>
   {!accounts.length&&!accountsResult.error&&<p>No matching accounts.</p>}
   <div className="portal-pagination">
    {page>1&&<Link className="portal-outline" href={urlForPage(page-1)}>Previous</Link>}
    <span>Page {page} of {pages}</span>
    {page<pages&&<Link className="portal-outline" href={urlForPage(page+1)}>Next</Link>}
   </div>
  </section>
  <section className="portal-section"><details className="portal-management-disclosure"><summary>Invite business supplier</summary>
   <p>Invitations are administrator-initiated; public supplier signup remains restricted.</p>
   <form action={inviteSupplier} className="portal-grid-form">
    <label>Display name<input name="display_name" minLength={2} maxLength={80} required/></label>
    <label>Email<input name="email" type="email" maxLength={254} required/></label>
    <label>Supplier type<select name="account_type">{invitationTypes.map(t=><option key={t} value={t}>{accountLabels[t]}</option>)}</select></label>
    <button className="portal-primary" type="submit">Send invitation</button>
   </form>
  </details></section>
  <section className="portal-section"><details className="portal-management-disclosure">
   <summary>Supplier applications {pending?"("+pending+" need review)":""}</summary>
   {!apps.length&&<p>No supplier applications yet.</p>}
   {apps.map(a=><article className="portal-record" key={a.id}>
    <div><strong>{a.legal_name}</strong><span className="portal-pill">{a.status.replaceAll("_"," ")}</span></div>
    <p>{a.organization_name??"Individual"} · {a.contact_email}</p><p>{a.capability_statement}</p>
    {a.reviewer_feedback&&<p>Feedback: {a.reviewer_feedback}</p>}
    <form className="portal-review" action={reviewSupplier}>
     <input type="hidden" name="application_id" value={a.id}/>
     <label>Decision<select name="status" defaultValue="needs_info">
      <option value="verified">Verified</option><option value="needs_info">More information</option>
      <option value="rejected">Reject</option><option value="suspended">Suspend application</option>
     </select></label>
     <label>Feedback<input name="reviewer_feedback" maxLength={1000} placeholder="Required unless verified"/></label>
     <button className="portal-outline" type="submit">Save decision</button>
    </form>
   </article>)}
  </details></section>
 </div></main>;
}
