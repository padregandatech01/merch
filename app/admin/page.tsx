import Link from "next/link";
import {requireAdmin} from "@/lib/auth/authorization";
export default async function AdminPage() {
 await requireAdmin();
 return <main className="portal-admin"><div className="portal-card"><span className="portal-eyebrow">Department Admin</span><h1>Overview</h1>
  <p>Account management is available. Other operational modules have not been implemented.</p>
  <Link className="portal-primary" href="/admin/accounts">Manage accounts and supplier applications</Link>
 </div></main>;
}
