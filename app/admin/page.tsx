import Link from "next/link";
import {requireAdmin} from "@/lib/auth/authorization";
export default async function AdminHome(){
 await requireAdmin();
 return <main className="store-accounts"><header className="store-heading"><div><span className="store-label">LOXADA MERCH / STORE TEAM</span><h1>Store overview</h1><p>Manage buyer accounts and the suppliers who provide merchandise for the store.</p></div></header>
 <section className="store-list-card" style={{marginTop:18}}><h2>Account Access</h2><p>Find buyers, wholesale suppliers, and lead manufacturers. Manage sign-in, suspensions, and password recovery.</p><Link className="store-link" href="/admin/accounts">Manage account access →</Link></section>
 <section className="store-list-card" style={{marginTop:18}}><h2>Suppliers</h2><p>Send invitations, review applications, and check supplier activity.</p><Link className="store-link" href="/admin/relations">Open Suppliers →</Link></section>
 </main>;
}
