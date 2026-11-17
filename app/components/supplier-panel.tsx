import Link from "next/link";
import SupplierPanelHeader from "@/app/components/supplier-panel-header";
import type {requirePortal} from "@/lib/auth/authorization";
import {accountLabels,departmentId} from "@/lib/portal/config";
import {readSupplierConversation} from "@/lib/portal/supplier-panel";
import {applicationStep,hasUnreadSupplierActivity} from "@/lib/portal/supplier-panel-state";

type PortalIdentity=Awaited<ReturnType<typeof requirePortal>>;
const timeFormat=new Intl.DateTimeFormat("en-PH",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Manila"});

export default async function SupplierPanel({identity,description,submitted,failed}:{
 identity:PortalIdentity;description:string;submitted:boolean;failed:boolean;
}){
 const {account,user,db}=identity;
 const [application,conversation]=await Promise.all([
  db.from("supplier_applications").select("status").eq("user_id",user.id).maybeSingle(),
  readSupplierConversation(identity)
 ]);
 const step=applicationStep(application.data?.status??null,!!application.error);
 const relation=conversation.data;
 const unread=hasUnreadSupplierActivity(relation);
 return <main className="sr-shell sp-panel" data-dept={departmentId}>
  <SupplierPanelHeader current="overview" displayName={account.display_name} accountType={account.account_type}
   canMessage={!!relation} title="Supplier overview" description={description}/>
  {submitted?<p className="sr-alert" role="status">Application submitted for review.</p>:null}
  {failed?<p className="sr-alert" role="alert">The application could not be updated. Check its current status before trying again.</p>:null}
  <div className="sp-grid">
   <section className="sr-card" aria-labelledby="sp-next">
    <h2 id="sp-next">Supplier application</h2>
    <span className="sr-chip">{step.label}</span>
    <p>{step.next}</p>
    <Link className="sr-link" href="/portal/application">{step.action} →</Link>
   </section>
   <section className="sr-card" aria-labelledby="sp-messages">
    <h2 id="sp-messages">Messages</h2>
    {conversation.error?<p>Could not check your conversation. Reload this page to try again.</p>:relation?<>
     {unread?<span className="sr-chip">Unread activity</span>:null}
     <p>Open your private conversation with the department.</p>
     {relation.last_message_at?<p className="sr-note">Last activity <time dateTime={relation.last_message_at}>{timeFormat.format(new Date(relation.last_message_at))}</time> PHT</p>:null}
     <Link className="sr-link" href="/portal/messages">Open messages →</Link>
    </>:<p>Your conversation opens when you submit your first supplier application.</p>}
   </section>
   <section className="sr-card" aria-labelledby="sp-account">
    <h2 id="sp-account">Your account</h2>
    <dl className="sr-facts">
     <div><dt>Supplier type</dt><dd>{accountLabels[account.account_type]??"Supplier"}</dd></div>
     <div><dt>Sign-in email</dt><dd>{user.email??"Unavailable"}</dd></div>
    </dl>
    <p className="sr-note">Your application contact email is listed separately on your application.</p>
   </section>
  </div>
 </main>;
}
