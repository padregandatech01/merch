#!/usr/bin/env node
// Run only from a trusted operator terminal. Never expose as a route.
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const email = process.env.ADMIN_LOGIN_EMAIL;
if (!url || !key || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Missing valid private SUPABASE_URL / SUPABASE_SECRET_KEY / ADMIN_LOGIN_EMAIL");
  process.exit(1);
}
const supabase = createClient(url, key, {
 auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});
const temporaryPassword = randomBytes(24).toString("base64url");
const { data, error } = await supabase.auth.admin.createUser({
 email,
 password: temporaryPassword,
 email_confirm: false,
});
if (error || !data.user) {
 console.error("Could not create account:", error?.message || "Unknown error");
 process.exit(1);
}
const { error: roleError } = await supabase.from("staff_roles").insert({
 user_id: data.user.id,
 role: "dept_admin",
});
if (roleError) {
 console.error("Auth user was created, but role assignment failed. Resolve manually:", roleError.message);
 process.exit(1);
}
console.log("Auth account created with role dept_admin for:", email);
console.log("One-time temporary password:", temporaryPassword);
console.log("Confirm email ownership before using login. Change temporary password after first use.");
