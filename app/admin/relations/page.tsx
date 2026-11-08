import Link from "next/link";
import Form from "next/form";
import {departmentId,departmentName,accountLabels} from "@/lib/portal/config";
import {getAdminRelations,relationsUrl,stages} from "@/lib/supplier-relations";
import SubmitButton from "@/app/admin/components/submit-button";
export default async function SupplierRelations({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const p=await searchParams;
 const d=await getAdminRelations(p);
 return <main className="sr-shell" data-dept={departmentId}>
  <div className="sr-top"><div><span className="sr-kicker">{departmentName} / Supplier relations</span>
   <h1>Supplier relationships</h1>
   <p>Manage invited contacts and ongoing conversations. Applications are reviewed separately in Onboarding.</p></div>
   <Link href="/admin/onboarding/invite">New invitation</Link>
  </div>
  {d.error&&<p className="sr-alert" role="alert">{d.error}</p>}
  {p.error&&<p className="sr-alert" role="alert">Unable to load this request.</p>}
  <section className="sr-card">
   <div className="sr-section-heading"><h2>Contacts and conversations</h2><span className="sr-chip">{d.total} matching</span></div>
   <Form action="/admin/relations" className="sr-filter">
    <label>Contact email<input name="q" type="search" maxLength={80} defaultValue={d.q} placeholder="Find a contact"/></label>
    <label>Relationship status<select name="status" defaultValue={d.status}>
     <option value="all">All stages</option>
     {Object.entries(stages).map(([k,v])=><option value={k} key={k}>{v}</option>)}
    </select></label>
    <SubmitButton label="Filter" pendingLabel="Updating..."/>
   </Form>
   <div className="sr-list">
    {d.rows.map(r=>{
     const unread=r.last_sender_kind==="supplier"&&!!r.last_message_at&&
      (!r.admin_read_at||new Date(r.last_message_at)>new Date(r.admin_read_at));
     return <article className="sr-list-item" key={r.id}>
      <div><strong>{r.invited_email}</strong>
       <small>{accountLabels[r.supplier_type]??r.supplier_type} · {stages[r.status]??r.status}
        {unread?" · New message":""}</small>
       <small>Last activity {new Date(r.updated_at).toLocaleDateString("en-PH")}</small></div>
      <Link className="sr-link" href={"/admin/relations/"+r.id}>Open relationship</Link>
     </article>;
    })}
    {!d.rows.length&&!d.error&&<p className="sr-note">No supplier relationships match this filter.</p>}
   </div>
   <nav className="sr-pages" aria-label="Supplier relation pages">
    {d.page>1?<Link href={relationsUrl(d.q,d.status,d.page-1)}>Previous</Link>:<span/>}
    <span>Page {d.page} / {d.pages}</span>
    {d.page<d.pages?<Link href={relationsUrl(d.q,d.status,d.page+1)}>Next</Link>:<span/>}
   </nav>
  </section>
 </main>;
}
