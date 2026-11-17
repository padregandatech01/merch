import Link from "next/link";
import {departmentId,departmentName,accountLabels} from "@/lib/portal/config";
import {getAdminRelationship,stages} from "@/lib/supplier-relations";
import SupplierConversation from "@/app/components/supplier-conversation";
import {manageRelationship} from "@/app/actions/supplier-relationships";
import SubmitButton from "@/app/admin/components/submit-button";
const errors:Record<string,string>={
 message:"A message is required (maximum 4,000 characters).",database:"Could not save. Please retry.",
 slow:"A message was just sent. Check the conversation before posting again.",
 closed:"This relationship is closed.",changed:"This relationship changed. Refresh and try again.",missing:"Relationship not found."
};
export default async function RelationDetail({params,searchParams}:{
 params:Promise<{relationId:string}>;searchParams:Promise<Record<string,string|undefined>>
}){
 const {relationId}=await params;
 const p=await searchParams;
 const {relation:r,thread}=await getAdminRelationship(relationId,p.page);
 const isOpen=["invited","discussing","accepted"].includes(r.status);
 const canReopen=["declined","revoked"].includes(r.status);
 return <main className="sr-shell" data-dept={departmentId}>
  <Link className="sr-back" href="/admin/relations">← Back to Supplier Invitations &amp; Messages</Link>
  <header className="sr-top" style={{marginTop:18}}><div>
    <span className="sr-kicker">{departmentName} / Supplier conversation</span><h1>{r.invited_email}</h1>
    <p>{accountLabels[r.supplier_type]??r.supplier_type} · {stages[r.status]??r.status}</p>
   </div><span className="sr-chip">{stages[r.status]??r.status}</span>
  </header>
  {p.error&&<p role="alert" className="sr-alert">{errors[p.error]??"This action could not be completed."}</p>}
  {p.notice&&<p role="status" className="sr-alert">{p.notice==="invited"?"Invitation sent and conversation started.":p.notice==="revoked"?"Invitation revoked.":p.notice==="discussing"?"Conversation reopened.":p.notice==="read"?"Conversation marked as read.":"Conversation updated."}</p>}
  <section className="sr-card">
   <h2>Invitation and account details</h2>
   <dl className="sr-facts">
    <div><dt>Contact email</dt><dd>{r.invited_email}</dd></div>
    <div><dt>Invitation or account status</dt><dd>{stages[r.status]??r.status}</dd></div>
    <div><dt>Supplier type</dt><dd>{accountLabels[r.supplier_type]??r.supplier_type}</dd></div>
    <div><dt>Conversation opened</dt><dd>{new Date(r.created_at).toLocaleDateString("en-PH")}</dd></div>
    {r.requested_email&&<div><dt>Requested permanent email</dt><dd>{r.requested_email}</dd></div>}
   </dl>
   <div className="sr-actions">
    <Link className="sr-link" href="/admin/onboarding">Review supplier applications</Link>
    {isOpen&&<form action={manageRelationship}>
     <input type="hidden" name="relationship_id" value={r.id}/><input type="hidden" name="action" value="revoke"/>
     <SubmitButton label="Revoke invitation" pendingLabel="Revoking..."/>
    </form>}
    {canReopen&&<form action={manageRelationship}>
     <input type="hidden" name="relationship_id" value={r.id}/><input type="hidden" name="action" value="reopen"/>
     <SubmitButton label="Reopen conversation" pendingLabel="Reopening..."/>
    </form>}
   </div>
   <p className="sr-note">Accepting an invitation is separate from submitting a supplier application. Neither approves a contract.</p>
  </section>
  <SupplierConversation relation={r} thread={thread} viewer="admin" baseUrl={"/admin/relations/"+r.id}/>
 </main>;
}
