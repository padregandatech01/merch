"use client";
import {useMemo,useEffect,useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
import {departmentId,departmentName} from "@/lib/portal/config";
export default function SetPassword() {
 const db=useMemo(()=>createClient(),[]);
 const router=useRouter();
 const [authenticated,setAuthenticated]=useState(false);
 const [password,setPassword]=useState("");
 const [confirm,setConfirm]=useState("");
 const [show,setShow]=useState(false);
 const [message,setMessage]=useState("");
 const [saving,setSaving]=useState(false);
 useEffect(()=>{
  let mounted=true;
  void db.auth.getUser().then(({data})=>{if(mounted)setAuthenticated(!!data.user);});
  const {data:{subscription}}=db.auth.onAuthStateChange((_event,session)=>{if(mounted)setAuthenticated(!!session?.user);});
  return ()=>{mounted=false;subscription.unsubscribe();};
 },[db]);
 async function onSubmit(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if(password!==confirm || password.length<12 || password.length>128){setMessage("Passwords must match and contain at least 12 characters.");return;}
  setSaving(true);setMessage("");
  const {error}=await db.auth.updateUser({password});
  setSaving(false);
  if(error){setMessage("Could not set password. Open the latest invitation link and try again.");return;}
  router.replace("/portal");
 }
 return <main className="portal-screen" data-brand={departmentId}><div className="portal-card portal-form-card">
  <span className="portal-eyebrow">LOXADA / {departmentName}</span><h1>Set password</h1>
  <p>Complete your department supplier invitation before signing in.</p>
  {!authenticated?<p className="portal-alert" role="status">Open your invitation email link to establish a secure session. If you just opened it, check again shortly.</p>:null}
  <form onSubmit={onSubmit}>
   <label>New password<input type={show?"text":"password"} autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} required/></label>
   <label>Confirm password<input type={show?"text":"password"} autoComplete="new-password" minLength={12} maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)} required/></label>
   <button className="portal-link-button" type="button" onClick={()=>setShow(!show)} aria-pressed={show}>{show?"Hide passwords":"Show passwords"}</button>
   {message&&<p role="alert" className="portal-alert">{message}</p>}
   <button className="portal-primary" type="submit" disabled={!authenticated||saving}>{saving?"Saving…":"Save password"}</button>
  </form>
 </div></main>;
}
