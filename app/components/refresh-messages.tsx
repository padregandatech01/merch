"use client";
import {useRouter} from "next/navigation";
import {useTransition} from "react";
export default function RefreshMessages(){
 const router=useRouter(),[pending,start]=useTransition();
 return <button type="button" disabled={pending} onClick={()=>start(()=>router.refresh())}
  aria-busy={pending} className="sr-refresh">{pending?"Checking…":"Check for replies"}</button>;
}
