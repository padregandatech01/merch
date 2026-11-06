"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const REQUIRED_ROLE = "dept_admin";

export async function signIn(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string" ||
      !email.includes("@") || email.length > 254 || !password || password.length > 1024) {
    redirect("/login?error=invalid");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    redirect("/login?error=configuration");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) redirect("/login?error=invalid");
  const { data: { user }, error: sessionError } = await supabase.auth.getUser();
  if (sessionError || !user || !user.email_confirmed_at) {
    await supabase.auth.signOut();
    redirect("/login?error=invalid");
  }
  const { data: membership, error: roleError } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (roleError || membership?.role !== REQUIRED_ROLE) {
    await supabase.auth.signOut();
    redirect("/login?error=unauthorized");
  }
  redirect("/admin");
}

export async function signOut() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
