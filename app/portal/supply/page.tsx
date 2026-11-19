import { redirect } from "next/navigation";
import SupplierPanelHeader from "@/app/components/supplier-panel-header";
import { requirePortal } from "@/lib/auth/authorization";
import { departmentId, supplierWorkPanelName } from "@/lib/portal/config";

export const metadata = { title: "Supplier work" };

export default async function SupplierWorkPage() {
  const { account } = await requirePortal();
  const title = supplierWorkPanelName(account.account_type);
  if (!title) redirect("/portal");

  return (
    <main className="sr-shell sp-panel" data-dept={departmentId}>
      <SupplierPanelHeader
        current="supply"
        displayName={account.display_name}
        accountType={account.account_type}
        title={title}
      />
      <div className="sr-card">
        <p>Work management isn’t available yet.</p>
      </div>
    </main>
  );
}
