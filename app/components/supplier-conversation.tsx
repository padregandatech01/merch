import Link from "next/link";
import SubmitButton from "@/app/admin/components/submit-button";
import {markRelationshipRead,sendRelationshipMessage} from "@/app/actions/supplier-relationships";
import type {Relationship,RelationMessage} from "@/lib/supplier-relations";
type Thread={messages:RelationMessage[];page:number;pages:number;error:string|null};
export default function SupplierConversation({relation,thread,viewer,baseUrl}:{
 relation:Relationship;thread:Thread;viewer:"admin"|"supplier";baseUrl:string
}){
 const canReply=!["revoked","declined"].includes(relation.status);
 const unread=!!relation.last_message_at &&
  relation.last_sender_kind!==(viewer==="admin"?"admin":"supplier") &&
  (!((viewer==="admin"?relation.admin_read_at:relation.supplier_read_at))||
  new Date(relation.last_message_at).getTime()>new Date((viewer==="admin"?relation.admin_read_at:relation.supplier_read_at)!).getTime());
 return <section className="sr-card sr-conversation">
  <div className="sr-section-heading"><div><h2>Conversation</h2><p>Private messages between this supplier and the department team.</p></div>
   {unread&&<form action={markRelationshipRead}><input type="hidden" name="relationship_id" value={relation.id}/>
    <SubmitButton label="Mark as read" pendingLabel="Updating..."/></form>}
  </div>
  {thread.error&&<p className="sr-alert" role="alert">{thread.error}</p>}
  <div className="sr-messages" aria-label="Supplier conversation">
   {thread.messages.map(m=><article key={m.id} className={"sr-bubble "+(m.sender_kind===viewer?"sr-mine":"sr-theirs")}>
     <div className="sr-message-meta"><strong>{m.sender_kind==="admin"?"Loxada department":"Supplier"}</strong>
      <time dateTime={m.created_at}>{new Date(m.created_at).toLocaleString("en-PH",{dateStyle:"medium",timeStyle:"short"})}</time></div>
     <p>{m.body}</p>
    </article>)}
   {!thread.messages.length&&!thread.error&&<p className="sr-empty">No messages yet.</p>}
  </div>
  <div className="sr-pages">
   {thread.page<thread.pages?<Link href={baseUrl+"?page="+(thread.page+1)}>Older messages</Link>:<span/>}
   <span>Page {thread.page} of {thread.pages}</span>
   {thread.page>1?<Link href={baseUrl+(thread.page===2?"":"?page="+(thread.page-1))}>Newer messages</Link>:<span/>}
  </div>
  {canReply?<form action={sendRelationshipMessage} className="sr-compose">
   <input type="hidden" name="relationship_id" value={relation.id}/>
   <label>Send a message<textarea name="body" minLength={1} maxLength={4000} rows={4}
      placeholder="Write a question, reply, or proposal…" required/></label>
   <SubmitButton label="Send message" pendingLabel="Sending..."/>
  </form>:<p className="sr-note">This conversation is closed. Previous messages remain available for reference.</p>}
 </section>;
}
