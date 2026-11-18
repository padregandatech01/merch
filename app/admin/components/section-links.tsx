"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { departmentId } from "@/lib/portal/config";
import styles from "./supplier-tabs.module.css";

const supplierViews = [
  { href: "/admin/relations", label: "Invitations & Messages" },
  { href: "/admin/onboarding", label: "Applications" },
  { href: "/admin/supplier-activity", label: "Activity" },
] as const;

function within(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

function activeSupplierView(path: string) {
  if (within(path, "/admin/onboarding/invite")) return supplierViews[0];
  return supplierViews.find(view => within(path, view.href));
}

export default function SectionLinks({ homeLabel }: { homeLabel: string }) {
  const path = usePathname();
  return (
    <>
      <Link href="/admin" aria-current={path === "/admin" ? "page" : undefined}>{homeLabel}</Link>
      <Link href="/admin/accounts" aria-current={within(path, "/admin/accounts") ? "page" : undefined}>Account Access</Link>
      <Link href={supplierViews[0].href} aria-current={activeSupplierView(path) ? "page" : undefined}>Suppliers</Link>
    </>
  );
}

export function SupplierTabs() {
  const active = activeSupplierView(usePathname());
  if (!active) return null;

  return (
    <nav className={styles.tabs} data-dept={departmentId} aria-label="Suppliers">
      {supplierViews.map(view => (
        <Link key={view.href} href={view.href} aria-current={active === view ? "page" : undefined}>{view.label}</Link>
      ))}
    </nav>
  );
}
