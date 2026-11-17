import Link from "next/link";
import {signOut} from "@/app/actions/auth";
import {accountLabels,departmentName} from "@/lib/portal/config";

export default function SupplierPanelHeader({current,displayName,accountType,canMessage,title,description}:{
 current:"overview"|"application"|"messages";displayName:string;accountType:string;canMessage:boolean;title:string;description:string;
}){
 const links=[{key:"overview",href:"/portal",label:"Overview"},{key:"application",href:"/portal/application",label:"Application"}];
 if(canMessage)links.push({key:"messages",href:"/portal/messages",label:"Messages"});
 return <>
  <header className="sr-top sp-head">
   <div><span className="sr-kicker">{departmentName} / Supplier panel</span><h1>{title}</h1>
    <p>{displayName} · {accountLabels[accountType]??"Supplier"}</p>
    <p>{description}</p>
   </div>
   <form action={signOut}><button type="submit" className="sp-signout">Sign out</button></form>
  </header>
  <nav className="sp-nav" aria-label="Supplier panel navigation">
   {links.map(link=><Link key={link.key} href={link.href} aria-current={link.key===current?"page":undefined}>{link.label}</Link>)}
  </nav>
 </>;
}
