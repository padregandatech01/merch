import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import SupplierPanelHeader from "@/app/components/supplier-panel-header";
import SupplyForm from "@/app/components/supply-work-form";
import { requirePortal } from "@/lib/auth/authorization";
import { departmentId, supplierWorkPanelName } from "@/lib/portal/config";
import { displayValue, formatReceiptDate, integer, optionalId, supplyLabel, type SupplyRead } from "@/lib/portal/supply-model";
import { profiles } from "@/lib/portal/supply-profiles";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Supplier work" };
const panel = "/portal/supply";
type Params = Record<string, string | string[] | undefined>;

export default async function SupplierWorkPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { user, account } = await requirePortal();
  const title = supplierWorkPanelName(account.account_type);
  const profile = profiles[account.account_type];
  if (!title || !profile) redirect("/portal");

  const params = await searchParams;
  const later = params.view === "activity";
  const itemId = optionalId(params.item);
  const requestedInvite = optionalId(params.invitation);
  const page = integer(params.page, 100000) ?? 1;
  const requestedVersion = integer(params.version, 2147483647);
  const service = createAdminClient();
  const result = !later && service ? await service.rpc("supplier_work_read", {
    p_actor: user.id, p_item: itemId, p_version: requestedVersion, p_page: page,
  }) : null;
  const work: SupplyRead | null = result?.error ? null : result?.data ?? null;
  const item = work?.selected ?? null;
  const invitation = work?.invitations.find(entry => entry.id === requestedInvite);
  const start = params.start === "yes" && work?.hasApplication && (!profile.invited || invitation);
  const canSubmit = account.account_type === "creator" || Boolean(work?.qualified);
  const editable = work?.hasApplication && item?.writable && item.revision === item.head;
  const notice = params.notice === "draft" ? "Draft saved." : params.notice === "submit" ? profile.receipt + "." : null;

  return (
    <main className="sr-shell sp-panel" data-dept={departmentId}>
      <SupplierPanelHeader current="supply" displayName={account.display_name} accountType={account.account_type} title={title} />
      <nav className="sp-nav sp-subnav" aria-label={title + " sections"}>
        <Link href={panel} aria-current={!later ? "page" : undefined}>{profile.primary}</Link>
        <Link href={panel + "?view=activity"} aria-current={later ? "page" : undefined}>{profile.nextTab}</Link>
      </nav>
      {later ? <section className="sr-card"><h2>{profile.nextTab}</h2><p>{profile.pending}</p></section>
        : !work ? <p className="sr-alert">Supplier work is temporarily unavailable.</p>
        : <>
          {notice ? <p role="status" className="sr-alert">{notice}</p> : null}
          {!work.hasApplication ? <section className="sr-card">
            <h2>Supplier application required</h2>
            <p>Open your supplier account to check your application.</p>
            <Link className="sr-link" href="/portal/application">View application</Link>
          </section> : null}
          {work.hasApplication && !canSubmit && !profile.invited ? <p className="sr-alert">You can save drafts. Department staff must verify your supply qualification before you can submit.</p> : null}
          {itemId && !item ? <p className="sr-alert">This version is unavailable. <Link className="sr-link" href={panel}>Back to {profile.primary.toLowerCase()}</Link></p> : null}
          {!itemId && requestedInvite && !invitation ? <p className="sr-alert">This invitation is unavailable.</p> : null}
          {item ? <section className="sr-card">
            <Link className="sr-link" href={panel}>Back to {profile.primary.toLowerCase()}</Link>
            <h2 className="mt-3">{item.title}</h2>
            <p className="sr-note">{supplyLabel(item.state)} · Version {item.revision}</p>
            {item.feedback ? <p className="sr-alert sp-statement"><strong>Clarification requested.</strong> {item.feedback}</p> : null}
            {editable && (item.state === "draft" || params.revise === "yes") ? <>
              {item.state === "submitted" ? <p>Save a new version. The submitted version stays in the department’s review history.</p> : null}
              <SupplyForm key={item.id + "/" + item.revision} profile={profile} item={item.id} invitation={item.invitation}
                revision={item.head} title={item.title} values={item.fields} canSubmit={canSubmit} />
            </> : <>
              <dl className="sr-facts">{profile.fields.flatMap(field => item.fields[field.key] === undefined ? [] : [
                <div key={field.key}><dt>{field.label}</dt><dd className="sp-statement">{field.choices?.[String(item.fields[field.key])] ?? displayValue(field, item.fields[field.key])}</dd></div>,
              ])}</dl>
              {editable ? <Link className="sr-link" href={`${panel}?item=${item.id}&revise=yes`}>Prepare a new version</Link> : null}
              {item.revision !== item.head ? <Link className="sr-link" href={`${panel}?item=${item.id}`}>Open latest version</Link> : null}
              {!item.writable ? <p className="sr-note">This invitation is no longer open to changes.</p> : null}
            </>}
            <details className="mt-4">
              <summary>Version history</summary>
              <ul className="sr-list">{item.versions.map(version => <li key={version.revision}>
                <Link className="sr-link" href={`${panel}?item=${item.id}&version=${version.revision}`}>
                  Version {version.revision} · {supplyLabel(version.state)}
                </Link> · {formatReceiptDate(version.date)}
              </li>)}</ul>
            </details>
          </section> : start ? <section className="sr-card">
            <Link className="sr-link" href={panel}>Back to {profile.primary.toLowerCase()}</Link>
            <h2 className="mt-3">New {profile.singular}</h2>
            {invitation ? <><p>{invitation.title} · Brief version {invitation.revision}</p><p className="sp-statement">{invitation.scope}</p></> : null}
            <p className="sr-note">Use approved evidence references in these fields. Keep protected files and personal details in their authorized source.</p>
            <SupplyForm profile={profile} item={randomUUID()} invitation={invitation?.id ?? null} revision={0} title="" values={{}} canSubmit={canSubmit} />
          </section> : <section className="sr-card">
            <h2>{profile.primary}</h2>
            {!profile.invited && work.hasApplication ? <Link className="sr-link" href={panel + "?start=yes"}>New {profile.singular}</Link> : null}
            {profile.invited ? <>
              <h3 className="mt-3">Open invitations</h3>
              {work.invitations.length ? <ul className="sr-list">{work.invitations.map(entry => <li className="sr-list-item" key={entry.id}>
                <div><strong>{entry.title}</strong><small>Brief version {entry.revision} · Closes {formatReceiptDate(entry.expiresAt)} PHT</small></div>
                <Link className="sr-link" href={`${panel}?start=yes&invitation=${entry.id}`}>Open brief</Link>
              </li>)}</ul> : <p>No open invitations. Proposals require a department invitation for an approved brief.</p>}
            </> : null}
            <h3 className="mt-3">Your records</h3>
            {work.items.length ? <ul className="sr-list">{work.items.slice(0,25).map(entry => <li className="sr-list-item" key={entry.id}>
              <div><strong>{entry.title}</strong><small>{supplyLabel(entry.state)} · Version {entry.revision} · {formatReceiptDate(entry.updated_at)} PHT</small></div>
              <Link className="sr-link" href={`${panel}?item=${entry.id}`}>Open record<span className="sr-only"> {entry.title}</span></Link>
            </li>)}</ul> : <p>You haven’t saved any records yet.</p>}
            {page > 1 || work.items.length > 25 ? <nav className="sr-pages" aria-label="Supplier record pages">
              {page > 1 ? <Link href={panel + "?page=" + (page - 1)}>Previous</Link> : null}
              <span>Page {page}</span>
              {work.items.length > 25 ? <Link href={panel + "?page=" + (page + 1)}>Next</Link> : null}
            </nav> : null}
          </section>}
        </>}
    </main>
  );
}
