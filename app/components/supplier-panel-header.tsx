import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { accountLabels, departmentName, supplierWorkPanelName } from "@/lib/portal/config";

type SupplierPanelHeaderProps = {
  current: "overview" | "supply" | "application" | "messages";
  displayName: string;
  accountType: string;
  canMessage?: boolean;
  title: string;
  description?: string;
};

export default function SupplierPanelHeader({
  current,
  displayName,
  accountType,
  canMessage,
  title,
  description,
}: SupplierPanelHeaderProps) {
  const workPanel = supplierWorkPanelName(accountType);
  const inAccount = current === "application" || current === "messages";

  return <>
    <header className="sr-top sp-head">
      <div>
        <span className="sr-kicker">{departmentName} / Supplier panel</span>
        <h1>{title}</h1>
        <p>{displayName} · {accountLabels[accountType] ?? "Supplier"}</p>
        {description ? <p>{description}</p> : null}
      </div>
      <form action={signOut}>
        <button type="submit" className="sp-signout">Sign out</button>
      </form>
    </header>
    <nav className="sp-nav" aria-label="Supplier panel navigation">
      <Link href="/portal" aria-current={current === "overview" ? "page" : undefined}>Overview</Link>
      {workPanel ? (
        <Link href="/portal/supply" aria-current={current === "supply" ? "page" : undefined}>{workPanel}</Link>
      ) : null}
      <Link href="/portal/application" aria-current={inAccount ? "location" : undefined}>Supplier account</Link>
    </nav>
    {inAccount && canMessage ? (
      <nav className="sp-nav sp-subnav" aria-label="Supplier account sections">
        <Link href="/portal/application" aria-current={current === "application" ? "page" : undefined}>Application</Link>
        <Link href="/portal/messages" aria-current={current === "messages" ? "page" : undefined}>Messages</Link>
      </nav>
    ) : null}
  </>;
}
