export type SupplyField = {
  key: string;
  label: string;
  type: "text" | "long" | "choice" | "date" | "integer" | "money";
  required: boolean;
  maxLength?: number;
  choices?: Record<string, string>;
};

export type SupplyProfile = {
  primary: string;
  nextTab: string;
  singular: string;
  receipt: string;
  pending: string;
  invited: boolean;
  fields: SupplyField[];
};

export type SupplyFormState = { error: string; attempted?: Record<string, string>; reset?: number };
export type Values = Record<string, string | number>;
type WorkState = "draft" | "submitted";
type VersionSummary = { revision: number; state: WorkState; date: string };
type WorkSummary = { id: string; title: string; updated_at: string; state: WorkState; revision: number };

export type SupplyDetail = {
  id: string;
  head: number;
  revision: number;
  title: string;
  fields: Values;
  state: WorkState;
  invitation: string | null;
  writable: boolean;
  feedback: string | null;
  versions: VersionSummary[];
};

export type SupplyRead = {
  hasApplication: boolean;
  qualified: boolean;
  items: WorkSummary[];
  invitations: { id: string; title: string; revision: number; scope: string; expiresAt: string }[];
  selected: SupplyDetail | null;
};

export type ReviewRead = {
  submissions: { id: string; title: string; supplier_role: string; display_name: string; revision: number; recorded_at: string }[];
  supplierApplications: { id: string; display_name: string; account_type: string; updated_at: string; qualification_id: string | null }[];
  selected: { id: string; title: string; supplier_role: string; fields: Values; revision: number; recordedAt: string;
    applicationId: string; applicationRevision: string; qualification: string | null; invitation: string | null; feedback: string | null; current: boolean } | null;
};

export function inputText(input: unknown) {
  return typeof input === "string" ? input.trim() : "";
}

export function optionalId(input: unknown) {
  const id = inputText(input);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

export function integer(input: unknown, max: number, min = 1) {
  const raw = inputText(input);
  if (!/^\d{1,10}$/.test(raw)) return null;
  const value = Number(raw);
  return value >= min && value <= max ? value : null;
}

export function displayValue(field: SupplyField, value: number | string | undefined) {
  if (value === undefined) return "";
  if (field.type === "money" && typeof value === "number") return (value / 100).toFixed(2);
  return String(value);
}

export function parseFields(profile: SupplyProfile, form: FormData, submit: boolean) {
  const values: Values = {};
  for (const field of profile.fields) {
    const raw = inputText(form.get(field.key));
    if (!raw) {
      if (submit && field.required) return { error: `Enter ${field.label.toLowerCase()}.` };
      continue;
    }
    if (field.type === "money") {
      if (!/^\d{1,10}(\.\d{1,2})?$/.test(raw)) return { error: `Enter ${field.label.toLowerCase()} with up to two decimal places.` };
      const [peso, fraction = ""] = raw.split(".");
      values[field.key] = Number(peso) * 100 + Number(fraction.padEnd(2, "0"));
    } else if (field.type === "integer") {
      const value = integer(raw, 999999999);
      if (value === null) return { error: `Enter a whole number greater than zero for ${field.label.toLowerCase()}.` };
      values[field.key] = value;
    } else {
      if ((field.choices && !Object.hasOwn(field.choices, raw)) || (field.maxLength && raw.length > field.maxLength)) {
        return { error: `Check ${field.label.toLowerCase()}.` };
      }
      values[field.key] = raw;
    }
  }
  return { values };
}

const manilaDate = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });
export function formatReceiptDate(instant: string) {
  return manilaDate.format(new Date(instant));
}

export function supplyLabel(state: WorkState) {
  return state === "draft" ? "Draft" : "Submitted";
}
