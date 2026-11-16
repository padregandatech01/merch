import Link from "next/link";
import InviteForm from "./invite-form";
import {inviteErrors} from "@/lib/supplier-invite";
export default async function InvitePartner({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const p=await searchParams;
 return <main className="store-accounts">
  <Link className="store-link" href="/admin/onboarding">← Back to applications</Link>
  <header className="store-heading" style={{marginTop:18}}><div>
   <span className="store-label">MERCHANDISE / NEW PARTNER</span>
   <h1>Invite a supplier</h1><p>Wholesale suppliers and lead manufacturers join the store team through an invitation.</p>
  </div></header>
  {p.error&&<p className="store-message" role="alert">{p.error==="profile"?inviteErrors.setup:inviteErrors.unavailable}</p>}
  <section className="store-list-card admin-work-detail" style={{marginTop:22}}>
   <h2>Invitation details</h2><p>The supplier receives an email to set up their own account and complete their application.</p>
    <InviteForm/>
  </section>
 </main>;
}
