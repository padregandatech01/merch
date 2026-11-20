import Link from "next/link";
import { qualifySupply, requestSupplyClarification } from "@/app/actions/supply-work";
import { requireAdmin } from "@/lib/auth/authorization";
import { accountLabels, departmentId } from "@/lib/portal/config";
import { displayValue, formatReceiptDate, inputText, integer, optionalId, type ReviewRead } from "@/lib/portal/supply-model";
import { profiles } from "@/lib/portal/supply-profiles";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Supply submissions" };
const path = "/admin/supply-work";
const notices: Record<string, string> = {
  saved: "Qualification decision recorded.",
  "feedback-saved": "Clarification request recorded.",
  "feedback-invalid": "Enter a clarification between 5 and 1,500 characters.",
  changed: "The application or qualification changed. Read the current record and try again.",
  invalid: "Enter an evidence reference and a written assessment.",
  denied: "This qualification is unavailable to your account.",
  unavailable: "The decision could not be recorded. Try again.",
};
type Params = Record<string, string | string[] | undefined>;

export default async function SupplyReviewPage({ searchParams }: { searchParams: Promise<Params> }) {
  const staff = await requireAdmin();
  const params = await searchParams;
  const qualification = params.view === "qualification";
  const page = integer(params.page, 100000) ?? 1;
  const id = optionalId(params.item);
  const version = integer(params.version, 2147483647);
  const db = createAdminClient();
  const result = await db?.rpc("supplier_work_review_list", { p_staff: staff.id, p_item: id, p_version: version, p_page: page });
  const work: ReviewRead | null = result?.error ? null : result?.data ?? null;
  const profile = work?.selected ? profiles[work.selected.supplier_role] : null;
  const count = qualification ? work?.supplierApplications.length : work?.submissions.length;
  const nav = path + "?view=" + (qualification ? "qualification" : "submissions");
  const notice = notices[inputText(params.result)];

  return <main className="sr-shell" data-dept={departmentId}>
    <header className="sr-top"><h1>Supply submissions</h1></header>
    <nav className="sp-nav sp-subnav" aria-label="Supply submissions sections">
      <Link href={path} aria-current={!qualification ? "page" : undefined}>Submitted versions</Link>
      <Link href={path + "?view=qualification"} aria-current={qualification ? "page" : undefined}>Supply qualification</Link>
    </nav>
    {notice ? <p role="status" className="sr-alert">{notice}</p> : null}
    {!work ? <p className="sr-alert">Supply submissions are temporarily unavailable.</p>
      : qualification ? <section className="sr-card">
        <h2>Supply qualification</h2>
        <p>Review the exact application and the evidence for the supplier’s representation and capacity before recording an intake qualification.</p>
        {work.supplierApplications.length ? work.supplierApplications.slice(0,25).map(application => <details key={application.id} className="mt-4">
          <summary>{application.display_name} · {accountLabels[application.account_type]} · {application.qualification_id ? "Qualified for intake" : "Needs qualification"}</summary>
          <p className="sr-note">Application revision from {formatReceiptDate(application.updated_at)} PHT</p>
          <Link className="sr-link" href={"/admin/onboarding/" + application.id}>Open supplier application</Link>
          <form className="sp-form" action={qualifySupply}>
            <input type="hidden" name="application" value={application.id} />
            <input type="hidden" name="applicationRevision" value={application.updated_at} />
            {application.qualification_id ? <>
              <input type="hidden" name="revoke" value={application.qualification_id} />
              <button>Revoke supply qualification</button>
            </> : <>
              <label>Protected evidence reference<input name="evidence" minLength={3} maxLength={240} required /></label>
              <label>Qualification assessment<textarea name="assessment" minLength={10} maxLength={1500} rows={3} required /></label>
              <label className="sp-check"><input type="checkbox" required name="confirmed" value="yes" />
                I independently verified the current representation, capability and applicable qualification evidence.
              </label>
              <button>Record qualification</button>
            </>}
          </form>
        </details>) : <p>No verified supplier applications are eligible for a qualification review.</p>}
      </section> : id ? <section className="sr-card">
        <Link className="sr-link" href={path}>Back to submitted versions</Link>
        {work.selected && profile ? <>
          <h2 className="mt-3">{work.selected.title}</h2>
          <p>{profile.receipt} · Version {work.selected.revision} · {formatReceiptDate(work.selected.recordedAt)} PHT</p>
          <p className="sr-note">This submission is the supplier’s version for review.</p>
          <Link className="sr-link" href={"/admin/onboarding/" + work.selected.applicationId}>Open supplier application</Link>
          <dl className="sr-facts mt-3">{profile.fields.map(field => <div key={field.key}>
            <dt>{field.label}</dt>
            <dd className="sp-statement">{field.choices?.[String(work.selected!.fields[field.key])]
              ?? (displayValue(field, work.selected!.fields[field.key]) || "Not provided")}</dd>
          </div>)}</dl>
          {work.selected.feedback ? <p className="sr-alert sp-statement"><strong>Clarification requested.</strong> {work.selected.feedback}</p>
            : work.selected.current ? <form action={requestSupplyClarification} className="sp-form">
              <input type="hidden" name="item" value={work.selected.id} />
              <input type="hidden" name="version" value={work.selected.revision} />
              <label>Clarification needed<textarea name="feedback" minLength={5} maxLength={1500} rows={3} required /></label>
              <button>Request clarification</button>
            </form> : null}
        </> : <p>This submission version is unavailable.</p>}
      </section> : <section className="sr-card">
        <h2>Submitted versions</h2>
        {work.submissions.length ? <ul className="sr-list">{work.submissions.slice(0,25).map(item => <li className="sr-list-item" key={item.id + "/" + item.revision}>
          <div><strong>{item.title}</strong><small>{item.display_name} · {accountLabels[item.supplier_role]} · Version {item.revision} · {formatReceiptDate(item.recorded_at)} PHT</small></div>
          <Link className="sr-link" href={`${path}?item=${item.id}&version=${item.revision}`}>Open submission<span className="sr-only"> {item.title}</span></Link>
        </li>)}</ul> : <p>No supply submissions have been received.</p>}
      </section>}
    {!id && (page > 1 || (count ?? 0) > 25) ? <nav className="sr-pages" aria-label="Supply review pages">
      {page > 1 ? <Link href={nav + "&page=" + (page - 1)}>Previous</Link> : null}
      <span>Page {page}</span>
      {(count ?? 0) > 25 ? <Link href={nav + "&page=" + (page + 1)}>Next</Link> : null}
    </nav> : null}
  </main>;
}
