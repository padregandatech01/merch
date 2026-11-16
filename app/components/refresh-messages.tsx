"use client";
import {useRouter} from "next/navigation";
import {useEffect,useRef,useState,useTransition} from "react";
import {createClient} from "@/lib/supabase/client";

type Connection = "connecting" | "live" | "retrying";

export default function RefreshMessages({relationshipId,latestMessageId,page}:{
 relationshipId:string;latestMessageId:string|undefined;page:number
}){
 const router=useRouter();
 const [pending,start]=useTransition();
 const [connection,setConnection]=useState<Connection>("connecting");

 const followLatest=useRef(true);
 useEffect(()=>{
  const timeline=document.getElementById("supplier-timeline-"+relationshipId);
  if(!timeline||page!==1)return;
  followLatest.current=true;
  const onScroll=()=>{followLatest.current=timeline.scrollHeight-timeline.clientHeight-timeline.scrollTop<80;};
  timeline.addEventListener("scroll",onScroll,{passive:true});
  return ()=>timeline.removeEventListener("scroll",onScroll);
 },[relationshipId,page]);

 useEffect(()=>{
  if(page!==1||!followLatest.current)return;
  const timeline=document.getElementById("supplier-timeline-"+relationshipId);
  if(timeline)timeline.scrollTop=timeline.scrollHeight;
 },[relationshipId,latestMessageId,page]);

 useEffect(()=>{
  const db=createClient();
  let disposed=false,live=false;
  let queued:ReturnType<typeof setTimeout>|undefined;
  const refresh=()=>{
   if(disposed||document.visibilityState!=="visible"||queued!==undefined)return;
   queued=setTimeout(()=>{
    queued=undefined;
    if(!disposed&&document.visibilityState==="visible")start(()=>router.refresh());
   },150);
  };
  const channel=db.channel("supplier-conversation:"+relationshipId)
   .on("postgres_changes",{
    event:"INSERT",schema:"public",table:"supplier_messages",filter:"relationship_id=eq."+relationshipId
   },refresh)
   .subscribe(status=>{
    if(disposed)return;
    live=status==="SUBSCRIBED";
    setConnection(live?"live":"retrying");
    // Close the gap between the server render and (re)subscribing.
    refresh();
   });
  const fallback=setInterval(()=>{if(!live)refresh();},15000);
  document.addEventListener("visibilitychange",refresh);
  window.addEventListener("online",refresh);
  return ()=>{
   disposed=true;
   if(queued!==undefined)clearTimeout(queued);
   clearInterval(fallback);
   document.removeEventListener("visibilitychange",refresh);
   window.removeEventListener("online",refresh);
   void db.removeChannel(channel);
  };
 },[relationshipId,router]);

 return <div className="sr-live-controls">
  <span className="sr-live-state" role="status">{connection==="live"?"Live":connection==="connecting"?"Connecting…":"Reconnecting…"}</span>
  <button type="button" disabled={pending} onClick={()=>start(()=>router.refresh())}
   aria-busy={pending} className="sr-refresh">{pending?"Checking…":"Refresh"}</button>
 </div>;
}
