import {redirect} from "next/navigation";
import {departmentId} from "@/lib/portal/config";
import {getSupplierRelationship} from "@/lib/supplier-relations";
import SupplierConversation from "@/app/components/supplier-conversation";
import SupplierPanelHeader from "@/app/components/supplier-panel-header";

export const metadata={title:"Supplier messages"};
export default async function SupplierMessages({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const p=await searchParams;
 const {account,relation,thread}=await getSupplierRelationship(p.page);
 if(relation&&relation.status!=="completed")redirect("/invitation");
 return <main className="sr-shell sp-panel" data-dept={departmentId}>
  <SupplierPanelHeader current="messages" displayName={account.display_name} accountType={account.account_type}
   canMessage={!!relation} title="Messages" description="Your private conversation with the store team."/>
  {!relation||!thread?<section className="sr-card"><h2>No conversation yet</h2>
   <p>Once your supplier application has been submitted, communication with the department appears here.</p>
  </section>:<>
   {p.error?<p className="sr-alert" role="alert">This message could not be sent. Please check its content or the connection.</p>:null}
   {p.notice?<p className="sr-alert" role="status">{p.notice==="sent"?"Message sent.":p.notice==="read"?"Conversation marked as read.":"Conversation updated."}</p>:null}
   <SupplierConversation relation={relation} thread={thread} viewer="supplier" baseUrl="/portal/messages"/>
  </>}
 </main>;
}
