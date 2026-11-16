"use client";
import Link from "next/link";
import {useActionState,useState} from "react";
import {accountLabels,invitationTypes} from "@/lib/portal/config";
import {inviteSupplier} from "@/app/actions/admin-accounts";
import SubmitButton from "@/app/admin/components/submit-button";
import {inviteErrors,type InviteState} from "@/lib/supplier-invite";

const initial:InviteState={};
export default function InviteForm(){
 const [state,submit]=useActionState(inviteSupplier,initial);
 const [name,setName]=useState("");
 const [email,setEmail]=useState("");
 const [category,setCategory]=useState("");
 const [message,setMessage]=useState("");
 return (
  <form action={submit} className="admin-work-review">
    {state.error&&<div className="store-message" role="alert">
     <p>{inviteErrors[state.error]}</p>
     {state.relationshipId&&<Link href={"/admin/relations/"+state.relationshipId}>Open supplier relationship</Link>}
    </div>}
    <label>Contact name<input name="display_name" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={80} required/></label>
    <label>Contact email<input name="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254} required/></label>
    <label>Partner category<select name="account_type" required value={category} onChange={e=>setCategory(e.target.value)}>
     <option value="" disabled>Choose a category</option>
     {invitationTypes.map(t=><option key={t} value={t}>{accountLabels[t]??t}</option>)}
    </select></label>
    <label>Initial sourcing message<textarea name="message" value={message} onChange={e=>setMessage(e.target.value)} rows={6} minLength={40} maxLength={3000} required
     placeholder="Introduce the store, explain the wholesale or manufacturing opportunity, and invite a response."/></label>
    <p className="sr-note">This becomes the first private message. The Supabase invitation email template determines whether the message also appears in email.</p>
    <SubmitButton label="Send invitation" pendingLabel="Sending invitation..."/>
   </form>
 );
}
