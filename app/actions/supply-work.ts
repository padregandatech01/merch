"use server";

import { redirect } from "next/navigation";
import { requireAdmin, requirePortal } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import { profiles } from "@/lib/portal/supply-profiles";
import { inputText, integer, optionalId, parseFields, type SupplyFormState } from "@/lib/portal/supply-model";

const failures: Record<string, string> = {
  invalid: "Check the fields, including the dates and quantities.",
  denied: "This record is unavailable to this account.",
  changed: "This record changed in another session. Open its latest version before making further edits.",
  duplicate: "This source identity, invitation, or source revision is already recorded. Open the existing record to continue.",
  identity: "The source identity is fixed after submission. Use the same source identifiers for a revision.",
  qualification: "Current supply qualification is required to submit.",
  invitation: "A current invitation for the exact approved brief is required.",
  application: "An eligible supplier application is required.",
};

export async function saveSupplyWork(state: SupplyFormState, form: FormData): Promise<SupplyFormState> {
  const { user, account } = await requirePortal();
  const profile = profiles[account.account_type];
  if (!profile) redirect("/portal");
  const attempted = Object.fromEntries(["title", ...profile.fields.map(field => field.key)].map(key => [key, inputText(form.get(key)).slice(0, 2000)]));
  const failure = (error: string) => ({ error, attempted, reset: (state.reset ?? 0) + 1 });
  const target = optionalId(form.get("item"));
  const expected = integer(form.get("expected"), 2147483646, 0);
  const intent = inputText(form.get("intent"));
  const invitation = optionalId(form.get("invitation"));
  const title = inputText(form.get("title"));
  if (!target || expected === null || !["draft", "submit"].includes(intent) || title.length < 2 || title.length > 160) {
    return failure("Enter a title between 2 and 160 characters.");
  }
  const parsed = parseFields(profile, form, intent === "submit");
  if (!parsed.values) return failure(parsed.error);
  const db = createAdminClient();
  if (!db) return failure("Supplier work is temporarily unavailable.");
  const { data, error } = await db.rpc("supplier_work_save", {
    p_actor: user.id, p_item: target, p_expected: expected, p_intent: intent, p_title: title,
    p_fields: parsed.values, p_invitation: invitation,
  });
  if (error || data !== "saved") return failure(failures[data] ?? "The record could not be saved. Try again.");
  redirect(`/portal/supply?item=${target}&notice=${intent}`);
}

export async function qualifySupply(form: FormData) {
  const staff = await requireAdmin();
  const target = optionalId(form.get("application"));
  const revoke = optionalId(form.get("revoke"));
  const expected = inputText(form.get("applicationRevision"));
  const evidence = inputText(form.get("evidence"));
  const assessment = inputText(form.get("assessment"));
  const tab = "/admin/supply-work?view=qualification";
  if (!target || Number.isNaN(Date.parse(expected)) ||
      (!revoke && (form.get("confirmed") !== "yes" || evidence.length < 3 || evidence.length > 240 || assessment.length < 10 || assessment.length > 1500))) {
    redirect(tab + "&result=invalid");
  }
  const db = createAdminClient();
  if (!db) redirect(tab + "&result=unavailable");
  const { data, error } = await db.rpc("supplier_work_qualify", {
    p_staff: staff.id, p_application: target, p_expected: expected,
    p_evidence: evidence, p_assessment: assessment, p_revoke: revoke,
  });
  redirect(tab + "&result=" + (error || !["saved", "changed", "denied", "invalid"].includes(data) ? "unavailable" : data));
}


export async function requestSupplyClarification(form: FormData) {
  const staff = await requireAdmin();
  const item = optionalId(form.get("item"));
  const version = integer(form.get("version"), 2147483647);
  const message = inputText(form.get("feedback"));
  if (!item || !version) redirect("/admin/supply-work");
  const target = `/admin/supply-work?item=${item}&version=${version}`;
  if (message.length < 5 || message.length > 1500) redirect(target + "&result=feedback-invalid");
  const db = createAdminClient();
  if (!db) redirect(target + "&result=unavailable");
  const { data, error } = await db.rpc("supplier_work_request_clarification", {
    p_staff: staff.id, p_item: item, p_version: version, p_message: message,
  });
  redirect(target + "&result=" + (error ? "unavailable" : data === "saved" ? "feedback-saved" : "changed"));
}
