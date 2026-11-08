import Link from "next/link";
import {requireAdmin} from "@/lib/auth/authorization";
export default async function AdminHome(){
 await requireAdmin();
 return <main className="store-accounts"><header className="store-heading"><div><span className="store-label">LOXADA MERCH / STORE TEAM</span><h1>Store overview</h1><p>Manage buyer accounts and the suppliers who provide merchandise for the store.</p></div></header>
 <section className="store-list-card"><span className="store-label">CUSTOMERS &amp; SOURCING</span><h2>Account management</h2><p>Find buyers, invite wholesale suppliers and lead manufacturers, and review supplier applications. Product approvals and purchasing are separate.</p><Link className="store-link" href="/admin/accounts">Open customers and suppliers →</Link></section>
 <section className="store-list-card" style={{marginTop:18}}><span className="store-label">SOURCING / ONBOARDING</span><h2>New supplier applications</h2><p>Invite wholesale suppliers and lead manufacturers and review submitted business information.</p><Link className="store-link" href="/admin/onboarding">Open supplier applications →</Link></section></main>;
}
