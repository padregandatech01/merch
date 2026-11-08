import Link from "next/link";
import {redirect} from "next/navigation";
import {departmentId,departmentName,accountLabels} from "@/lib/portal/config";
import {getSupplierRelationship,stages} from "@/lib/supplier-relations";
import SupplierConversation from "@/app/components/supplier-conversation";
export default async function SupplierMessages({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const p=await searchParams;
 const {relation:r,thread}=await getSupplierRelationship(p.page);
 if(r&&r.status!=="completed")redirect("/invitation");
 return <main className="sr-shell" data-dept={departmentId}>
  <Link className="sr-back" href="/portal">← Back to supplier portal</Link>
  <header className="sr-top" style={{marginTop:18}}><div>
   <span className="sr-kicker">{departmentName} / Supplier communication</span><h1>Messages with Loxada</h1>
   <p>Continue the same conversation you started during onboarding.</p>
  </div></header>
  {!r||!thread?<section className="sr-card"><h2>No conversation yet</h2>
   <p>Once your supplier application has been submitted, communication with the department appears here.</p>
  </section>:<>
   <section className="sr-card">
    <h2>Supplier relationship</h2>
    <p>{accountLabels[r.supplier_type]??r.supplier_type} · {stages[r.status]??r.status}</p>
    <p className="sr-note">Business contracts and commercial authorizations are handled separately.</p>
   </section>
   {p.error&&<p className="sr-alert" role="alert">This message could not be sent. Please check its content or the connection.</p>}
   {p.notice&&<p className="sr-alert" role="status">Conversation updated.</p>}
   <SupplierConversation relation={r} thread={thread} viewer="supplier" baseUrl="/portal/messages"/>
  </>}
 </main>;
}
