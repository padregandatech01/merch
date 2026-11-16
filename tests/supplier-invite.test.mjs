import assert from "node:assert/strict";
import test from "node:test";
import { inviteErrorFor, inviteErrors } from "../lib/supplier-invite.ts";

const examples = [
 ["confirmed duplicate", { code: "email_exists", status: 422 }, "existing"],
 ["duplicate from older Auth versions", { code: "user_already_exists" }, "existing"],
 ["default SMTP restriction", { code: "email_address_not_authorized", status: 403 }, "restricted"],
 ["SMTP rejection wrapped by Supabase", { code: "unexpected_failure", status: 500, message: "Error sending invite email" }, "delivery"],
 ["email cooldown", { code: "over_email_send_rate_limit", status: 429 }, "limited"],
 ["generic throttle", { status: 429 }, "limited"],
 ["invalid recipient", { code: "email_address_invalid" }, "invalid"],
 ["missing admin permission", { code: "not_admin", status: 403 }, "configuration"],
 ["generic forbidden", { status: 403 }, "unavailable"],
 ["unknown conflict", { code: "conflict", status: 409 }, "unavailable"],
 ["database failure", { code: "unexpected_failure", status: 500, message: "Database error finding user" }, "unavailable"],
 ["missing error payload", null, "unavailable"],
];

for (const [label, error, expected] of examples) {
 test(label, () => {
  const result = inviteErrorFor(error);
  assert.equal(result, expected);
  assert.ok(inviteErrors[result]);
 });
}
