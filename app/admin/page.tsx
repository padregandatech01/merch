import { requireAdmin } from "@/lib/auth/authorization";
export default async function AdminPage() {
 await requireAdmin();
 return <main className="me-admin-empty"><h1>Merchandise dashboard</h1><p>No modules added yet.</p></main>;
}
