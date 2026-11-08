"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
export default function SectionLinks({items}:{items:{href:string;label:string}[]}){
 const path=usePathname();
 return <>{items.map(item=>{
  const active=item.href==="/admin"?path==="/admin":path===item.href||path.startsWith(item.href+"/");
  return <Link key={item.href} href={item.href} aria-current={active?"page":undefined}>{item.label}</Link>;
 })}</>;
}
