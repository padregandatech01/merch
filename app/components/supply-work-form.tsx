"use client";

import { useActionState } from "react";
import { saveSupplyWork } from "@/app/actions/supply-work";
import { displayValue, type SupplyProfile, type Values } from "@/lib/portal/supply-model";

export default function SupplyForm({ profile, item, invitation, revision, title, values, canSubmit }: {
  profile: SupplyProfile;
  item: string;
  invitation: string | null;
  revision: number;
  title: string;
  values: Values;
  canSubmit: boolean;
}) {
  const [result, action, saving] = useActionState(saveSupplyWork, { error: "" });

  return <form className="sp-form" action={action} key={result.reset}>
    <input type="hidden" name="item" value={item} />
    <input type="hidden" name="invitation" value={invitation ?? ""} />
    <input type="hidden" name="expected" value={revision} />
    {result.error ? <p role="alert" className="sr-alert">{result.error}</p> : null}
    <label>Title<input name="title" required minLength={2} maxLength={160} defaultValue={result.attempted?.title ?? title} /></label>
    {profile.fields.map(field => {
      const value = result.attempted?.[field.key] ?? displayValue(field, values[field.key]);
      return <label key={field.key}>{field.label}
        {field.type === "choice"
          ? <select name={field.key} defaultValue={value}><option value="">Select</option>
              {Object.entries(field.choices ?? {}).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          : field.type === "long"
            ? <textarea name={field.key} defaultValue={value} maxLength={field.maxLength} rows={3} />
            : field.type === "money" || field.type === "integer"
              ? <input name={field.key} type="number" min={field.type === "money" ? 0 : 1}
                  max={field.type === "money" ? "9999999999.99" : 999999999} step={field.type === "money" ? "0.01" : "1"} defaultValue={value} />
              : <input name={field.key} type={field.type === "date" ? "date" : "text"} maxLength={field.maxLength} defaultValue={value} />}
      </label>;
    })}
    <div className="sr-actions">
      <button name="intent" value="draft" disabled={saving}>{saving ? "Saving…" : "Save draft"}</button>
      {canSubmit ? <button name="intent" value="submit" disabled={saving}>Submit for review</button> : null}
    </div>
  </form>;
}
