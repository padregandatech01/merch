"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { selfSignupTypes } from "@/lib/portal/config";

function validEmail(email: string) {
 return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function configured() {
 return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}
export async function signIn(formData: FormData) {
 const identity = String(formData.get("email") ?? "").trim();
 const password = formData.get("password");
 const email = identity.toLowerCase() === "admin"
   ? (process.env.ADMIN_LOGIN_EMAIL)
   : identity;
 if (typeof email !== "string" || !validEmail(email) || typeof password !== "string" || !password || password.length > 1024) redirect("/login?error=invalid");
 if (!configured()) redirect("/login?error=configuration");
 const db = await createClient();
 const { error } = await db.auth.signInWithPassword({email: email.trim(), password});
 if (error) redirect("/login?error=invalid");
 const {data:{user},error:userError} = await db.auth.getUser();
 if (userError || !user?.email_confirmed_at) {
   await db.auth.signOut();
   redirect("/login?error=unconfirmed");
 }
 const {data:staff,error:staffError} = await db.from("staff_roles").select("role").eq("user_id",user.id).maybeSingle();
 if (!staffError && staff?.role === "dept_admin") redirect("/admin");
 const {data:account,error:accountError} = await db.from("portal_accounts").select("account_type,status").eq("user_id",user.id).maybeSingle();
 if (accountError || !account) {
   await db.auth.signOut();
   redirect("/login?error=unauthorized");
 }
 if(account.status!=="active") {
  await db.auth.signOut();
  redirect("/login?error=suspended");
 }
 redirect("/portal");
}
export async function register(formData: FormData) {
 const displayName=String(formData.get("display_name")??"").trim();
 const email=String(formData.get("email")??"").trim().toLowerCase();
 const password=formData.get("password");
 const confirmation=formData.get("confirm_password");
 const accountType=String(formData.get("account_type")??"");
 if (!selfSignupTypes.includes(accountType) || displayName.length<2 || displayName.length>80 ||
    !validEmail(email) || typeof password!=="string" || password.length<12 || password.length>128 ||
    password!==confirmation) redirect("/register?error=invalid");
 if (!configured()) redirect("/register?error=configuration");
 const db=await createClient();
 const origin=process.env.APP_ORIGIN?.replace(/\/$/,"");
 const {data,error}=await db.auth.signUp({
   email,password,
   options:{
     data:{display_name:displayName,requested_portal_role:accountType},
     ...(origin ? {emailRedirectTo:origin+"/auth/confirm?next=/portal"} : {})
   }
 });
 if(error) redirect("/register?error=failed");
 if(data.session) redirect("/portal");
 redirect("/login?notice=check-email");
}
export async function signOut() {
 if(configured()) {
   const db=await createClient();
   await db.auth.signOut();
 }
 redirect("/login");
}
