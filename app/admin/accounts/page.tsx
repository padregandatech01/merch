import Form from "next/form";
import Link from "next/link";
import AccountAnalysis from "@/app/admin/components/account-analysis";
import SubmitButton from "@/app/admin/components/submit-button";
import { loadAccountCube } from "@/lib/admin/account-cube";
import { accountCubeFields, accountRoute, inlineCubeUrl, parseInlineCubeView, type CubeParams } from "@/lib/admin/account-cube-model";
import { directoryUrl, loadDirectory } from "@/lib/admin/directory";
import { accountLabels, customerType, departmentId, supplierTypes } from "@/lib/portal/config";
import styles from "./manage-accounts.module.css";

const notices:Record<string,string>={invited:"Supplier invitation sent.",reviewed:"Supplier application decision saved."};
const errors:Record<string,string>={invalid:"Review the form details.",configuration:"Supplier invitations are not configured.",invite:"Could not send invitation.",profile:"Invitation sent, but supplier account setup needs attention.",database:"Could not save the decision.",protected:"Staff accounts are managed separately.",missing:"Account not found."};

const accountTypes = [customerType, ...supplierTypes];
const listFields = ["q", "role", "roles", "period", "status", "page"];
const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });
const countFormat = new Intl.NumberFormat("en-PH");

export default async function ManageAccounts({ searchParams }: { searchParams: Promise<CubeParams> }) {
  const params = await searchParams;
  const p = Object.fromEntries(Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  const view = parseInlineCubeView(params, accountTypes);
  const showAnalysis = p.view === "analysis";

  if (showAnalysis) {
    const listQuery = new URLSearchParams(listFields.flatMap(name => p[name] ? [[name, p[name]]] : []));
    const listUrl = accountRoute + (listQuery.size ? "?" + listQuery.toString() : "");
    const cells = await loadAccountCube();

    return (
      <main className={styles.workspace} data-dept={departmentId}>
        <header className={styles.heading}>
          <h1>Account Access</h1>
        </header>
        <nav className={styles.views} aria-label="Account Access views">
          <Link href={inlineCubeUrl(view, listUrl, "account-records")}>Manage accounts</Link>
          <Link href={inlineCubeUrl(view, listUrl)} aria-current="page">Account analysis</Link>
        </nav>
        <AccountAnalysis view={view} cells={cells} listUrl={listUrl} checkedAt={cells === null ? null : new Date().toISOString()} />
      </main>
    );
  }

  const directory = await loadDirectory(p.role === "all" ? { ...p, roles: undefined } : p);
  const listUrl = directoryUrl(directory, directory.page);
  const recordUrl = (page: number) => inlineCubeUrl(view, directoryUrl(directory, page), "account-records");
  const clearUrl = inlineCubeUrl(view, accountRoute, "account-records");
  const hasFilters = Boolean(directory.q || directory.period || directory.roles.length || directory.role !== "all" || directory.status !== "all");
  const count = countFormat.format(directory.total);
  const accountCount = directory.total === 1 ? "account" : "accounts";

  return (
    <main className={styles.workspace} data-dept={departmentId}>
      <header className={styles.heading}>
        <h1>Account Access</h1>
      </header>
      <nav className={styles.views} aria-label="Account Access views">
        <Link href={recordUrl(directory.page)} aria-current="page">Manage accounts</Link>
        <Link href={inlineCubeUrl(view, listUrl)} id="account-analysis" prefetch={false}>Account analysis</Link>
      </nav>

      <section className={styles.panel} id="account-records" tabIndex={-1} aria-labelledby="accounts-heading">
        <h2 id="accounts-heading" className="sr-only">Manage accounts</h2>
        <Form action={accountRoute + "#account-records"} key={listUrl} className={styles.filters}>
          {Array.from(accountCubeFields(view), ([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
          {directory.roles.length > 0 ? <input type="hidden" name="roles" value={directory.roles.join(",")} /> : null}
          {directory.period ? <input type="hidden" name="period" value={directory.period} /> : null}
          <label>Search by name
            <input type="search" name="q" maxLength={60} defaultValue={directory.q} placeholder="Enter a name" />
          </label>
          <label>Account type
            <select name="role" defaultValue={directory.roles.length ? "" : directory.role}>
              {directory.roles.length ? <option value="">Types from report</option> : null}
              <option value="all">All types</option>
              {accountTypes.map(type => <option key={type} value={type}>{accountLabels[type] ?? type}</option>)}
            </select>
          </label>
          <label>Access status
            <select name="status" defaultValue={directory.status}>
              <option value="all">Any status</option>
              <option value="active">Not suspended</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
          <SubmitButton label="Search" pendingLabel="Searching…" />
        </Form>

        <div className={styles.resultBar}>
          {directory.error ? <span>Account list unavailable</span> : <strong>{count} {accountCount}{hasFilters ? " found" : ""}</strong>}
          {directory.period ? <span>Registered in {directory.period}</span> : null}
          {directory.roles.length ? <span>{directory.roles.map(role => accountLabels[role] ?? role).join(", ")}</span> : null}
          {hasFilters ? <Link href={clearUrl}>Clear filters</Link> : null}
        </div>

        {directory.error ? <p className={styles.empty} role="alert">{directory.error}</p> : null}
        {p.error ? <p className={styles.empty} role="alert">{errors[p.error] ?? "The request could not be completed."}</p> : null}
        {p.notice && notices[p.notice] ? <p className={styles.empty} role="status">{notices[p.notice]}</p> : null}

        {directory.people.length > 0 ? (
          <ul className={styles.list} aria-label="Accounts">
            {directory.people.map(person => (
              <li key={person.user_id} className={styles.accountRow}>
                <div className={styles.identity}>
                  <strong>{person.display_name}</strong>
                  <span>{accountLabels[person.account_type] ?? person.account_type} · Joined <time dateTime={person.created_at}>{dateFormat.format(new Date(person.created_at))}</time></span>
                </div>
                <span className={styles.status} data-suspended={person.status === "suspended"}>
                  {person.status === "active" ? "Not suspended" : "Suspended"}
                </span>
                <Link className={styles.manage} href={accountRoute + "/" + person.user_id} aria-label={"Manage account for " + person.display_name}>
                  Manage <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : !directory.error ? <p className={styles.empty}>{hasFilters ? "No accounts match these filters." : "No accounts to show."}</p> : null}

        {directory.pages > 1 ? (
          <nav className={styles.pagination} aria-label="Account pages">
            <span>Page {directory.page} of {directory.pages}</span>
            {directory.page > 1 ? <Link href={recordUrl(directory.page - 1)}>Previous</Link> : null}
            {directory.page < directory.pages ? <Link href={recordUrl(directory.page + 1)}>Next</Link> : null}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
