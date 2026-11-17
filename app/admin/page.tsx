import Link from "next/link";
import {requireAdmin} from "@/lib/auth/authorization";
export default async function AdminHome(){
 await requireAdmin();
 return <main className="store-accounts"><header className="store-heading"><div><span className="store-label">LOXADA MERCH / STORE TEAM</span><h1>Store overview</h1><p>Manage buyer accounts and the suppliers who provide merchandise for the store.</p></div></header>
 <section className="store-list-card" style={{marginTop:18}}><h2>Account Access</h2><p>Find buyers, wholesale suppliers, and lead manufacturers. Manage sign-in, suspensions, and password recovery.</p><Link className="store-link" href="/admin/accounts">Manage account access →</Link></section>
 <section className="store-list-card" style={{marginTop:18}}><h2>Supplier Invitations &amp; Messages</h2><p>Send invitations, check whether suppliers accepted, and open private conversations.</p><Link className="store-link" href="/admin/relations">Open invitations and messages →</Link></section>
 <section className="store-list-card" style={{marginTop:18}}><h2>Supplier Applications</h2><p>Review submitted supplier information and record a verification decision.</p><Link className="store-link" href="/admin/onboarding">Review supplier applications →</Link></section>
 <section className="store-list-card" style={{marginTop:18}}><h2>Supplier Activity</h2><p>See which invitations need follow-up, which applications are waiting, and which accounts are suspended.</p><Link className="store-link" href="/admin/supplier-activity">Open supplier activity report →</Link></section>
 </main>;
}
