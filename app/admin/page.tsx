import { signOut } from "@/app/actions/auth";
import { requireAdmin } from "@/lib/auth/authorization";

export default async function AdminPage() {
  const user = await requireAdmin();
  return (<div className="me-admin"><header><strong className="me-header">LOXADA® MERCH</strong><form action={signOut}><button className="me-exit" type="submit">LOG OUT ↗</button></form></header><section><span className="me-tag">OPERATIONS / VERIFIED</span><h1>Good things<br/><span>in store.</span></h1><div className="me-box"><strong>Merchandise administrator</strong><p>Welcome, {user.email}. Your account has been authorized for the Merchandise admin workspace.</p><p>Store inventory and supplier operations will be built later.</p></div></section></div>);
}
