import CustomerBag from "./customer-bag";
import Form from "next/form";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { departmentId, departmentName } from "@/lib/portal/config";
import { catalogConfig } from "@/lib/portal/customer-config";
import { createAdminClient } from "@/lib/supabase/admin";

type Listing = { id: string; title: string; label: string; price?: number; available?: number };
type Result = { items: Listing[]; access: { state: "active" | "inactive" | "unavailable"; endsAt?: string } | null };

const manila = new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Manila" });

export default async function CustomerCatalog({ id, displayName, query, page }: { id: string; displayName: string; query?: string; page?: string }) {
  const search = typeof query === "string" ? query.trim().slice(0,100) : "";
  const requested = typeof page === "string" && /^\d{1,6}$/.test(page) ? Number(page) : 1;
  const current = Math.max(1, Math.min(100000, requested));
  const client = createAdminClient();
  const response = await client?.rpc("department_customer_catalog", { p_actor: id, p_query: search, p_page: current });
  const data: Result | null = response?.error || !Array.isArray(response?.data?.items) ? null : response.data;
  const items = data?.items.slice(0,24) ?? [];
  const canAdvance = (data?.items.length ?? 0) > 24;
  const pageHref = (pageNumber: number) => "/portal?" + new URLSearchParams({ q: search, page: String(pageNumber) });
  const access = data?.access;

  return <main className="sr-shell sp-panel" data-dept={departmentId}>
    <header className="sr-top">
      <div><p className="sr-kicker">{departmentName}</p><h1>{catalogConfig.title}</h1><p>{displayName}</p></div>
      <form action={signOut}><button className="sp-signout" type="submit">Sign out</button></form>
    </header>
    {catalogConfig.config ? <section className="sr-card" aria-labelledby="plan">
      <h2 id="plan">Prepaid access</h2>
      <p>₱200 for 30 days. Renew manually after an active period ends.</p>
      {access?.state === "active" && access.endsAt ? <p>Active until {manila.format(new Date(access.endsAt))} PHT.</p>
        : access?.state === "inactive" ? <p>No active subscription.</p> : <p>Subscription status is unavailable.</p>}
      <p className="sr-note">Paid checkout isn’t available yet.</p>
    </section> : null}
    <section className="sr-card" aria-labelledby="browse">
      <h2 id="browse">{catalogConfig.label}</h2>
      <Form action="/portal" className="sr-filter">
        <label>Search by title<input type="search" name="q" defaultValue={search} maxLength={100} /></label>
        <button type="submit">Search</button>
        {search ? <Link className="sr-link" href="/portal">Clear search</Link> : null}
      </Form>
      {!data ? <p className="sr-alert" role="status">{catalogConfig.error}</p>
        : !items.length ? <p role="status">{current > 1 ? "There are no more results." : search ? "No matching results." : catalogConfig.empty}</p> : null}
      <CustomerBag user={id} items={items} />
      <p className="sr-note">{catalogConfig.action}</p>
      {data && (current > 1 || canAdvance) ? <nav className="sr-pages" aria-label="Catalog pages">
        {current > 1 ? <Link href={pageHref(current - 1)}>Previous</Link> : null}
        <span>Page {current}</span>
        {canAdvance ? <Link href={pageHref(current + 1)}>Next</Link> : null}
      </nav> : null}
    </section>
  </main>;
}
