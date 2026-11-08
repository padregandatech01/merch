import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { requireAdmin } from "@/lib/auth/authorization";
export default async function MerchandiseLayout({children}:{children:React.ReactNode}) {
 const user=await requireAdmin();
 const username=user.email?.split("@")[0]??"Staff";
 return <div className="me-app">
   <aside className="me-app-nav"><div className="me-app-brand">LOXADA <span>MERCH</span></div><nav aria-label="Merchandise navigation"><Link href="/admin" >Overview</Link><Link href="/admin/accounts">Accounts</Link></nav></aside>
   <div className="me-app-body"><header className="me-account-head"><div className="me-account-name"><b title={user.email}>{username}</b><span>Department Admin</span></div><form action={signOut}><button type="submit">Log out</button></form></header>{children}</div>
 </div>;
}
